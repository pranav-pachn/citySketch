import { CityGenerator } from '../services/generator/CityGenerator.js'
import { addLocalHistoryItem } from '../services/historyStore.js'
import { supabase } from '../config/supabase.js'
import { generateInsights } from '../services/explainer.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { geocoder } from '../services/geocoder.js'
import { osmService } from '../services/osmService.js'
import { rasterizer } from '../services/rasterizer.js'

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
  const { bbox, gridSize = 20, prompt = 'Map-based generation', locationName = '' } = req.body || {}

  if (!bbox || bbox.length !== 4) {
    return res.status(400).json({ error: 'bbox is required as [minlat, minlon, maxlat, maxlon]' })
  }

  // bbox is [minlat, minlon, maxlat, maxlon] from our geocoder
  const [minLat, minLon, maxLat, maxLon] = bbox

  try {
    // 1. Fetch real-world data from OSM
    const osmData = await osmService.fetchMapData(bbox);

    // 2. Rasterize OSM features to a grid
    const N = Math.max(10, Math.min(40, gridSize))
    const seedGrid = rasterizer.rasterize(osmData, bbox, N);

    // 3. Initialize CityGenerator
    const engine = new CityGenerator({
      gridSize: N,
      waterStyle: 'none',
      primaryZone: 'residential',
      density: 'medium',
      parkStyle: 'scattered',
      roadStyle: 'grid',
      hospitalZone: true,
      schoolZone: true,
      trafficLevel: 'balanced',
      eco: true,
    });

    // 4. Inject seed grid and mark as locked
    // We'll modify CityGenerator to respect locked cells
    engine.lockedCells = new Set();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const type = seedGrid[y][x];
        if (type !== 'empty') {
          engine.grid[y][x] = type;
          engine.lockedCells.add(`${x},${y}`);
        }
      }
    }

    // 5. Run the generator
    const grid = engine.generate();

    // 6. Add context-aware explanations
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cell = grid[y]?.[x]
        if (!cell || typeof cell !== 'object') continue
        
        if (engine.lockedCells.has(`${x},${y}`)) {
          const originalType = seedGrid[y][x];
          cell.explanation = `Real-world ${originalType} imported from OpenStreetMap.`;
          cell.isLocked = true;
        }
      }
    }

    // 7. Generate Insights and Scoring
    const evaluation = generateInsights(grid);
    const mapPrompt = locationName 
      ? `Urban design for ${locationName}` 
      : `Map-based design at [${minLat.toFixed(4)}, ${minLon.toFixed(4)}]`;

    // 8. Store results
    let payload = null;
    try {
      const { data, error } = await supabase
        .from('city_layouts')
        .insert({
          prompt: mapPrompt,
          grid: grid,
          ai_model: 'osm-hybrid-engine'
        })
        .select()
        .single()

      if (error) throw error

      payload = {
        id: data.id,
        prompt: mapPrompt,
        layout: grid,
        score: evaluation.scores.overall,
        breakdown: evaluation.scores,
        suggestions: evaluation.suggestions,
        timestamp: new Date(data.created_at).getTime(),
        ai_model: 'osm-hybrid-engine',
        saved: true,
        evaluation,
        mapContext: {
          bbox,
          gridSize: N,
          locationName,
        },
      }
    } catch (dbError) {
      console.warn('Supabase insert failed, using fallback:', dbError.message);
      const fallbackItem = {
        id: crypto.randomUUID(),
        prompt: mapPrompt,
        layout: grid,
        timestamp: Date.now(),
        ai_model: 'osm-hybrid-engine',
        evaluation,
      }
      await addLocalHistoryItem(fallbackItem)
      payload = {
        ...fallbackItem,
        score: evaluation.scores.overall,
        breakdown: evaluation.scores,
        suggestions: evaluation.suggestions,
        saved: true,
        mapContext: {
          bbox,
          gridSize: N,
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
