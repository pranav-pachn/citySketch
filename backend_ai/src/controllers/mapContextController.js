import { CityGenerator } from '../services/generator/CityGenerator.js'
import { addLocalHistoryItem } from '../services/historyStore.js'
import { supabase } from '../config/supabase.js'
import { generateInsights } from '../services/explainer.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { geocoder } from '../services/geocoder.js'
import { osmService } from '../services/osmService.js'
import { rasterizer } from '../services/rasterizer.js'

function deriveNormalizedIntent(prompt, gridSize, bbox, usedFallback) {
  const lower = (prompt || '').toLowerCase()
  const areaKm2 = bbox
    ? Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) * 111 * 111 * Math.cos((((bbox[0] + bbox[2]) / 2) * Math.PI) / 180)
    : 0

  return {
    areaInAcres: Math.max(1, Math.round(areaKm2 * 247.105)),
    areaInKm2: Number(areaKm2.toFixed(2)),
    gridSize,
    density: lower.includes('high density') ? 'high' : lower.includes('low density') ? 'low' : 'medium',
    trafficLevel: lower.includes('low traffic') ? 'low' : lower.includes('high traffic') ? 'high' : 'balanced',
    eco: lower.includes('eco') || lower.includes('sustainable') || lower.includes('green'),
    smart: lower.includes('smart'),
    usedFallback,
  }
}

/**
 * Search for locations using geocoder
 */
export const searchLocations = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const results = await geocoder.search(q);
  res.json(results);
});

/**
 * Generate urban layout based on real OSM data
 */
export const generateFromMap = asyncHandler(async (req, res) => {
  const { bbox, gridSize = 20, prompt = 'Map-based generation', locationName = '', candidates = 1, saveToHistory = true } = req.body || {}

  if (bbox && bbox.length === 4) {
    const areaKm2 = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) * 111 * 111 * Math.cos((((bbox[0] + bbox[2]) / 2) * Math.PI) / 180)
    if (areaKm2 > 100) {
      return res.status(400).json({
        error: 'bbox_too_large',
        message: 'Selected bounding box exceeds the 100 km² OSM fetch limit.',
      })
    }
  }

  const N = Math.max(10, Math.min(40, Number(gridSize) || 20))
  const mapPrompt = locationName ? `Urban design for ${locationName}` : prompt || 'Map-based generation'
  const candidateCount = Math.max(1, Math.min(5, Number(candidates) || 1))
  const normalizedIntent = deriveNormalizedIntent(mapPrompt, N, bbox, false)

  let osmData = null
  let baseGrid = null
  let lockedCells = new Set()
  let usedFallback = false

  if (bbox && bbox.length === 4) {
    try {
      osmData = await osmService.fetchMapData(bbox)
      const rasterized = rasterizer.rasterize(osmData, bbox, N)
      baseGrid = rasterized.grid
      lockedCells = rasterized.lockedCells
    } catch (error) {
      if (error?.code === 'osm_unavailable') {
        usedFallback = true
        console.warn('OSM unavailable, falling back to prompt-only generation:', error.message)
      } else {
        throw error
      }
    }
  } else {
    usedFallback = true
  }

  const buildEngine = () => new CityGenerator({
    gridSize: N,
    waterStyle: 'none',
    primaryZone: 'residential',
    density: normalizedIntent.density,
    parkStyle: 'scattered',
    roadStyle: 'grid',
    hospitalZone: true,
    schoolZone: true,
    trafficLevel: normalizedIntent.trafficLevel,
    eco: normalizedIntent.eco,
    lockedCells,
  })

  const buildLayout = () => {
    const engine = buildEngine()

    if (baseGrid) {
      for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
          const cell = baseGrid[y][x]
          if (cell.type !== 'empty') {
            engine.grid[y][x] = cell.type
            if (cell.isLocked) {
              engine.lockedCells.add(`${x},${y}`)
            }
          }
        }
      }
    }

    const grid = engine.generate()
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const cell = grid[y]?.[x]
        if (!cell || typeof cell !== 'object') continue
        if (engine.lockedCells.has(`${x},${y}`)) {
          const original = baseGrid?.[y]?.[x]
          cell.isLocked = true
          cell.sourceTags = original?.sourceTags || null
          cell.explanation = original?.type
            ? `Real-world ${original.type} imported from OpenStreetMap.`
            : 'Real-world geographic constraint preserved from OpenStreetMap.'
          cell.type = original?.type || cell.type
        }
      }
    }

    return grid
  }

  const candidatesPayload = []
  for (let index = 0; index < candidateCount; index += 1) {
    const layout = buildLayout()
    const evaluation = generateInsights(layout)
    candidatesPayload.push({ layoutData: layout, evaluation })
  }

  const chosen = candidatesPayload[0]
  const evaluation = chosen.evaluation

  if (usedFallback) {
    evaluation.explanations = [
      ...evaluation.explanations,
      { message: 'OpenStreetMap data was unavailable, so this layout was generated from the prompt only.', severity: 'warning' },
    ]
  }

  const buildPayload = (id, saved) => ({
    id,
    prompt: mapPrompt,
    layoutData: chosen.layoutData,
    layout: chosen.layoutData,
    osmBaseGrid: baseGrid,
    lockedCellCount: lockedCells.size,
    score: evaluation.scores.overall,
    breakdown: evaluation.scores,
    scores: evaluation.scores,
    suggestions: evaluation.suggestions,
    explanations: evaluation.explanations,
    summary: evaluation.summary,
    normalizedIntent: {
      ...normalizedIntent,
      usedFallback,
    },
    timestamp: Date.now(),
    ai_model: 'osm-hybrid-engine',
    saved,
    evaluation,
    candidates: candidateCount > 1 ? candidatesPayload.map((candidate, index) => ({
      id: index,
      score: candidate.evaluation.scores.overall,
      layoutData: candidate.layoutData,
    })) : undefined,
    mapContext: {
      bbox,
      gridSize: N,
      locationName,
    },
  })

  if (!saveToHistory) {
    return res.json(buildPayload(null, false))
  }

  let payload = null
  try {
    const { data, error } = await supabase
      .from('city_layouts')
      .insert({
        prompt: mapPrompt,
        grid: chosen.layoutData,
        ai_model: 'osm-hybrid-engine',
      })
      .select()
      .single()

    if (error) throw error

    payload = buildPayload(data.id, true)
    payload.timestamp = new Date(data.created_at).getTime()
  } catch (dbError) {
    console.warn('Supabase insert failed, using fallback:', dbError.message)
    const fallbackItem = {
      id: crypto.randomUUID(),
      prompt: mapPrompt,
      layout: chosen.layoutData,
      timestamp: Date.now(),
      ai_model: 'osm-hybrid-engine',
      evaluation,
    }
    await addLocalHistoryItem(fallbackItem)
    payload = {
      ...buildPayload(fallbackItem.id, true),
      saved: true,
    }
  }

  res.json(payload)
})
