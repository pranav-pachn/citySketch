import { Router } from 'express'
import { CityGenerator } from '../utils/CityGenerator.js'
import { addLocalHistoryItem } from '../utils/historyStore.js'
import { supabase } from '../supabaseClient.js'
import { generateInsights } from '../utils/explainer.js'

export const mapRoute = Router()

/**
 * POST /api/generate-from-map
 *
 * Accepts a bounding box from the frontend map selector, fetches real-world
 * roads and water from the Overpass (OpenStreetMap) API, converts them into
 * a seed grid, then runs the CityGenerator on top to fill remaining zones.
 *
 * Body:
 *   { bbox: [south, west, north, east], gridSize?: number, prompt?: string }
 */
mapRoute.post('/generate-from-map', async (req, res) => {
  const { bbox, gridSize = 20, prompt = 'Map-based generation', locationName = '' } = req.body || {}

  if (!bbox || bbox.length !== 4) {
    return res.status(400).json({ error: 'bbox is required as [south, west, north, east]' })
  }

  const [south, west, north, east] = bbox

  try {
    // ─── Step 1: Fetch real-world data from Overpass API ─────────────────
    const osmData = await fetchOSMFeatures(south, west, north, east)

    // ─── Step 2: Convert OSM features to a seed grid ────────────────────
    const N = Math.max(10, Math.min(40, gridSize))
    const seedGrid = buildSeedGrid(N, osmData, south, west, north, east)

    // ─── Step 3: Run CityGenerator with the seed grid ───────────────────
    // Spec §7: Context-aware placement — hospitals near real roads,
    //          parks near residential clusters, schools near homes.
    const engine = new CityGenerator({
      gridSize: N,
      waterStyle: 'none',        // Water is already seeded from OSM
      primaryZone: 'residential',
      density: 'medium',
      parkStyle: 'scattered',
      roadStyle: 'grid',
      hospitalZone: true,         // Spec §7: place near real road cells
      schoolZone: true,           // Spec §7: place near residential
      trafficLevel: 'balanced',
      eco: true,                  // Spec §7: boost parks near residential
    })

    // Inject the seed grid before generation — water and roads from real world
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (seedGrid[y][x] === 'water' || seedGrid[y][x] === 'road') {
          engine.grid[y][x] = seedGrid[y][x]
        }
      }
    }

    // Run the generator (it will skip over pre-filled cells)
    const grid = engine.generate()

    // ─── Step 3.5: Add explanations to map-seeded cells ─────────────────
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cell = grid[y]?.[x]
        if (!cell || typeof cell !== 'object') continue
        if (cell.type === 'road' && seedGrid[y]?.[x] === 'road' && !cell.explanation) {
          cell.explanation = 'Real-world road imported from OpenStreetMap data.'
        }
        if (cell.type === 'water' && seedGrid[y]?.[x] === 'water' && !cell.explanation) {
          cell.explanation = 'Real-world water body imported from OpenStreetMap data.'
        }
      }
    }

    // ─── Step 4: Build response ─────────────────────────────────────────
    const mapPrompt = locationName
      ? `Map simulation: ${locationName}`
      : `Map simulation at [${south.toFixed(4)}, ${west.toFixed(4)}]`

    const evaluation = generateInsights(grid)

    let payload = null

    try {
      const { data, error } = await supabase
        .from('city_layouts')
        .insert({
          prompt: mapPrompt,
          grid: grid,
          ai_model: 'map-osm-seed'
        })
        .select()
        .single()

      if (error) throw error

      payload = {
        id: data.id,
        prompt: mapPrompt,
        layoutData: grid,
        layout: grid,
        score: evaluation.scores.overall,
        breakdown: evaluation.scores,
        suggestions: evaluation.suggestions,
        timestamp: new Date(data.created_at).getTime(),
        ai_model: 'map-osm-seed',
        saved: true,
        evaluation,
        mapContext: {
          bbox,
          gridSize: N,
          osmFeatures: osmData.summary,
          locationName,
        },
      }
    } catch (dbError) {
      console.warn('Supabase insert failed for map gen, using local fallback:', dbError.message || dbError)
      const fallbackItem = {
        id: crypto.randomUUID(),
        prompt: mapPrompt,
        layoutData: grid,
        timestamp: Date.now(),
        ai_model: 'map-osm-seed',
        evaluation,
      }
      await addLocalHistoryItem(fallbackItem)
      payload = {
        ...fallbackItem,
        layout: grid,
        score: evaluation.scores.overall,
        breakdown: evaluation.scores,
        suggestions: evaluation.suggestions,
        saved: true,
        mapContext: {
          bbox,
          gridSize: N,
          osmFeatures: osmData.summary,
          locationName,
        },
      }
    }

    res.json(payload)
  } catch (error) {
    console.error('Map generation error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate from map' })
  }
})

// ─── Overpass API Helper ──────────────────────────────────────────────────────

async function fetchOSMFeatures(south, west, north, east) {
  const query = `
    [out:json][timeout:15];
    (
      way["highway"~"primary|secondary|tertiary|trunk|motorway"](${south},${west},${north},${east});
      way["waterway"](${south},${west},${north},${east});
      way["natural"="water"](${south},${west},${north},${east});
      relation["natural"="water"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!response.ok) {
      console.warn('Overpass API returned non-OK status:', response.status)
      return { nodes: {}, roads: [], waterways: [], summary: { roads: 0, waterways: 0 } }
    }

    const data = await response.json()

    // Index nodes by ID for coordinate lookup
    const nodes = {}
    let roadCount = 0
    let waterwayCount = 0
    const roads = []
    const waterways = []

    for (const element of data.elements || []) {
      if (element.type === 'node') {
        nodes[element.id] = { lat: element.lat, lon: element.lon }
      }
    }

    for (const element of data.elements || []) {
      if (element.type !== 'way') continue
      const coords = (element.nodes || [])
        .map(id => nodes[id])
        .filter(Boolean)

      if (!coords.length) continue

      const tags = element.tags || {}
      if (tags.highway) {
        roads.push(coords)
        roadCount++
      }
      if (tags.waterway || tags.natural === 'water') {
        waterways.push(coords)
        waterwayCount++
      }
    }

    return {
      nodes,
      roads,
      waterways,
      summary: { roads: roadCount, waterways: waterwayCount },
    }
  } catch (err) {
    console.warn('Overpass API fetch failed (timeout or network):', err.message)
    return { nodes: {}, roads: [], waterways: [], summary: { roads: 0, waterways: 0 } }
  }
}

// ─── Geo → Grid Converter ─────────────────────────────────────────────────────

function buildSeedGrid(N, osmData, south, west, north, east) {
  const grid = Array.from({ length: N }, () => Array(N).fill('empty'))

  const latRange = north - south
  const lonRange = east - west

  // Convert a lat/lon to grid cell
  const toCell = (lat, lon) => {
    const row = Math.floor(((north - lat) / latRange) * N)
    const col = Math.floor(((lon - west) / lonRange) * N)
    return {
      y: Math.max(0, Math.min(N - 1, row)),
      x: Math.max(0, Math.min(N - 1, col)),
    }
  }

  // Rasterize waterways
  for (const coords of osmData.waterways) {
    for (let i = 0; i < coords.length - 1; i++) {
      const a = toCell(coords[i].lat, coords[i].lon)
      const b = toCell(coords[i + 1].lat, coords[i + 1].lon)
      rasterizeLine(grid, a.x, a.y, b.x, b.y, 'water', N)
    }
  }

  // Rasterize roads
  for (const coords of osmData.roads) {
    for (let i = 0; i < coords.length - 1; i++) {
      const a = toCell(coords[i].lat, coords[i].lon)
      const b = toCell(coords[i + 1].lat, coords[i + 1].lon)
      // Don't overwrite water with road
      rasterizeLine(grid, a.x, a.y, b.x, b.y, 'road', N, 'water')
    }
  }

  return grid
}

// Bresenham's line algorithm for rasterizing geographic features onto grid
function rasterizeLine(grid, x0, y0, x1, y1, type, N, protectedType = null) {
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    if (x0 >= 0 && x0 < N && y0 >= 0 && y0 < N) {
      if (!protectedType || grid[y0][x0] !== protectedType) {
        grid[y0][x0] = type
      }
    }

    if (x0 === x1 && y0 === y1) break

    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }
}
