import { Router } from 'express'
import { OpenAI } from 'openai'
import Groq from 'groq-sdk'
import { supabase } from '../supabaseClient.js'
import { CityGenerator } from '../utils/CityGenerator.js'
import { addLocalHistoryItem } from '../utils/historyStore.js'
import { generateInsights } from '../utils/explainer.js'
import dotenv from 'dotenv'

// Force reload of env vars so server doesn't need to be restarted immediately
dotenv.config({ override: true })

const keyRotationState = {
  openrouter: 0,
  gemini: 0,
  groq: 0,
}

function parseKeyPool(...values) {
  return values
    .flatMap((value) => (value || '').split(/[\s,]+/))
    .map((key) => key.trim())
    .filter(Boolean)
}

function getRotatedKeys(provider, keys) {
  if (!keys.length) return []

  const startIndex = keyRotationState[provider] % keys.length
  keyRotationState[provider] = (startIndex + 1) % keys.length

  return [...keys.slice(startIndex), ...keys.slice(0, startIndex)]
}

// ─── Guide Section 9 — Fallback Templates ─────────────────────────────────
const FALLBACK_TEMPLATES = {
  eco: {
    waterStyle: 'none',
    primaryZone: 'residential',
    density: 'medium',
    parkStyle: 'scattered',
    roadStyle: 'grid',
    hospitalZone: true,
    schoolZone: false,
    forestDensity: 'normal',
    riverScale: 'normal',
  },
  urban: {
    waterStyle: 'none',
    primaryZone: 'commercial',
    density: 'high',
    parkStyle: 'scattered',
    roadStyle: 'grid',
    hospitalZone: true,
    schoolZone: false,
    forestDensity: 'normal',
    riverScale: 'normal',
  },
  default: {
    waterStyle: 'none',
    primaryZone: 'residential',
    density: 'medium',
    parkStyle: 'scattered',
    roadStyle: 'grid',
    hospitalZone: false,
    schoolZone: false,
    forestDensity: 'normal',
    riverScale: 'normal',
  },
}

function selectFallbackTemplate(prompt) {
  const lower = (prompt || '').toLowerCase()
  if (/eco|green|sustainable|environment/.test(lower)) return FALLBACK_TEMPLATES.eco
  if (/urban|smart|dense|city|metropolitan/.test(lower)) return FALLBACK_TEMPLATES.urban
  return FALLBACK_TEMPLATES.default
}

// ─── Guide-Aligned Keyword Parser (Sections 1 + 10) ───────────────────────
function inferPromptOverrides(prompt) {
  const text = prompt.toLowerCase()
  const overrides = {}

  // ── Water style ──
  const hasVerticalRiver =
    /(vertical|north[-\s]?south).{0,30}river/.test(text) ||
    /river.{0,30}(vertical|north[-\s]?south)/.test(text)
  const hasHorizontalRiver =
    /(horizontal|east[-\s]?west).{0,30}river/.test(text) ||
    /river.{0,30}(horizontal|east[-\s]?west)/.test(text)

  if (hasVerticalRiver) {
    overrides.waterStyle = 'river_vertical'
  } else if (hasHorizontalRiver) {
    overrides.waterStyle = 'river_horizontal'
  } else if (/coastal.*left|left.*coastal|west coast|left shore/.test(text)) {
    overrides.waterStyle = 'coastal_left'
  } else if (/coastal.*right|right.*coastal|east coast|right shore/.test(text)) {
    overrides.waterStyle = 'coastal_right'
  } else if (/lake|reservoir|pond/.test(text)) {
    overrides.waterStyle = 'lake_center'
  }

  // ── Road style ──
  if (/winding|organic|curvy|curved|meandering|snaking/.test(text)) {
    overrides.roadStyle = 'organic'
  } else if (/grid|orthogonal|block pattern|straight roads/.test(text)) {
    overrides.roadStyle = 'grid'
  }

  // ── Density ──
  if (/low[-\s]?density|sparse|quiet town|small town|village|hamlet/.test(text)) {
    overrides.density = 'low'
  } else if (/high[-\s]?density|dense urban|metropolitan|downtown|packed|compact/.test(text)) {
    overrides.density = 'high'
  }

  // ── Primary zone ──
  const industrialHint = /logging|sawmill|lumber|mill town|industrial|factory|warehouse/.test(text)
  const residentialHint = /residential|housing|homes|suburb/.test(text)
  const commercialHint = /commercial|business district|offices|retail|mall/.test(text)

  if (industrialHint) {
    overrides.primaryZone = 'industrial'
  } else if (residentialHint) {
    overrides.primaryZone = 'residential'
  } else if (commercialHint) {
    overrides.primaryZone = 'commercial'
  }

  // ── Hospital zone ──
  const hospitalHint = /hospital|hospitals|clinic|clinics|medical|healthcare|health center|medical center/.test(text)
  if (hospitalHint) {
    overrides.hospitalZone = true
  }

  // ── School zone (Guide Section 1) ──
  const schoolHint = /school|education|campus|college/.test(text)
  if (schoolHint) {
    overrides.schoolZone = true
  }

  // ── Park style ──
  const noParkHint = /without parks|no parks|no green space/.test(text)
  const centralParkHint = /central park|single central park/.test(text)
  const borderingParkHint = /green belt|bordering forest|edge forest|forest border/.test(text)
  const forestHint = /forest|forests|woods|woodland|tree[-\s]?dense|pine/.test(text)

  if (noParkHint) {
    overrides.parkStyle = 'none'
  } else if (centralParkHint) {
    overrides.parkStyle = 'central'
  } else if (borderingParkHint) {
    overrides.parkStyle = 'bordering'
  } else if (forestHint) {
    overrides.parkStyle = 'scattered'
  }

  if (forestHint) {
    overrides.forestDensity = 'high'
  }

  // ── River scale ──
  if (
    /(massive|wide|huge|major|broad).{0,20}(river|waterway)/.test(text) ||
    /(river|waterway).{0,20}(massive|wide|huge|major|broad)/.test(text)
  ) {
    overrides.riverScale = 'wide'
  }

  // ── Guide Section 1 — Traffic Level ──
  if (/low traffic|less traffic|minimal traffic|low[-\s]?traffic/.test(text)) {
    overrides.trafficLevel = 'low'
  } else if (/high traffic|busy|heavy traffic/.test(text)) {
    overrides.trafficLevel = 'high'
  } else if (/balanced traffic|medium traffic/.test(text)) {
    overrides.trafficLevel = 'balanced'
  }

  // ── Guide Section 1 — Area in acres ──
  const areaMatch = text.match(/(\d+)\s*acres?/i)
  if (areaMatch) {
    overrides.areaInAcres = parseInt(areaMatch[1], 10)
  }

  // ── Guide Section 1 — Eco flag ──
  if (/eco|sustainable|green|environment/.test(text)) {
    overrides.eco = true
  }

  // ── Guide Section 1 — Smart flag ──
  if (/smart|intelligent|modern/.test(text)) {
    overrides.smart = true
  }

  return overrides
}

// ─── Normalize Intent — Merge LLM + Overrides + Guide Rules ───────────────
function normalizeIntent(llmConfig, overrides, prompt) {
  const merged = {
    waterStyle: overrides.waterStyle || llmConfig.waterStyle || 'none',
    primaryZone: overrides.primaryZone || llmConfig.primaryZone || 'commercial',
    density: overrides.density || llmConfig.density || 'medium',
    parkStyle: overrides.parkStyle || llmConfig.parkStyle || 'scattered',
    roadStyle: overrides.roadStyle || llmConfig.roadStyle || 'grid',
    forestDensity: overrides.forestDensity || 'normal',
    riverScale: overrides.riverScale || 'normal',
    hospitalZone: overrides.hospitalZone || llmConfig.hospitalZone || false,
    schoolZone: overrides.schoolZone || llmConfig.schoolZone || false,
    trafficLevel: overrides.trafficLevel || 'balanced',
    areaInAcres: overrides.areaInAcres || null,
    eco: overrides.eco || false,
    smart: overrides.smart || false,
  }

  // Guide Section 10 — If eco=true and no park mentioned, ensure parks
  if (merged.eco && merged.parkStyle === 'none') {
    merged.parkStyle = 'scattered'
  }

  // Guide Section 2 — Compute grid_size from area
  // Default area = 5 acres → grid_size = 18 (≈20×20 guide default)
  const area = merged.areaInAcres || 5
  const rawGridSize = Math.round(Math.sqrt(area) * 8)
  // Guide Section 10 — Clamp grid_size to 10–40
  merged.gridSize = Math.max(10, Math.min(40, rawGridSize))

  return merged
}

function promptRequestsHospital(prompt) {
  return /hospital|hospitals|clinic|clinics|medical|healthcare|health center|medical center/.test(
    String(prompt || '').toLowerCase()
  )
}

function ensureHospitalInGrid(grid) {
  if (!Array.isArray(grid) || grid.length === 0) return

  const rows = grid.length
  const cols = Array.isArray(grid[0]) ? grid[0].length : 0
  if (!cols) return

  const hasHospital = grid.some((row) => row.some((cell) => cell?.type === 'hospital'))
  if (hasHospital) return

  const isWithin = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols
  const isRoadAdjacent = (x, y) => {
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    return dirs.some(([dx, dy]) => {
      const nx = x + dx
      const ny = y + dy
      return isWithin(nx, ny) && grid[ny][nx]?.type === 'road'
    })
  }

  const preferredTypes = ['residential', 'commercial', 'empty', 'park']

  for (const type of preferredTypes) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y][x]
        if (!cell || cell.type !== type) continue
        if (!isRoadAdjacent(x, y)) continue
        grid[y][x] = { ...cell, type: 'hospital' }
        return
      }
    }
  }
}

export const generateRoute = Router()

generateRoute.get('/generate', (_req, res) => {
  res.status(200).json({
    message: 'Use POST /api/generate with JSON body: { "prompt": "..." }',
  })
})

generateRoute.post('/generate', async (req, res) => {
  const { prompt, saveToHistory = true } = req.body || {}

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  // Build key pools. Supports either *_API_KEY or *_API_KEYS with comma/newline-separated values.
  const openRouterKeys = parseKeyPool(process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY)
  const geminiKeys = parseKeyPool(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY)
  const groqKeys = parseKeyPool(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY)

  if (!openRouterKeys.length && !geminiKeys.length && !groqKeys.length) {
    return res.status(500).json({ error: 'No API keys configured in .env' })
  }

  try {
    const systemPrompt = `
You are an expert algorithmic urban planner. You must act as an extraction engine.
The user will provide a descriptive prompt for a city. You must read it and output ONLY a valid JSON object matching this strict schema:
{
  "waterStyle": "river_vertical" | "river_horizontal" | "coastal_left" | "coastal_right" | "lake_center" | "none",
  "primaryZone": "commercial" | "industrial" | "residential",
  "density": "high" | "medium" | "low",
  "parkStyle": "central" | "scattered" | "bordering" | "none",
  "roadStyle": "grid" | "organic",
  "hospitalZone": boolean,
  "schoolZone": boolean
}

Do NOT output an array. Just output the JSON configuration object.
Example: {"waterStyle":"coastal_left", "primaryZone":"commercial", "density":"high", "parkStyle":"bordering", "roadStyle":"organic", "hospitalZone":false, "schoolZone":false}
`

    let rawContent = null
    let modelUsed = ''

    // 1. Try OpenRouter (Gemini 2.0 Flash/Pro) - BEST AT LOGIC
    if (!rawContent && openRouterKeys.length) {
      const rotatedOpenRouterKeys = getRotatedKeys('openrouter', openRouterKeys)
      for (const openRouterKey of rotatedOpenRouterKeys) {
        try {
          console.log('Attempting OpenRouter auto-routing with rotated key')
          const openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey })
          const completion = await openai.chat.completions.create({
            model: "openrouter/auto",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
          })
          rawContent = completion.choices[0].message.content
          modelUsed = 'openrouter/auto'
          break
        } catch (err) {
          console.error('OpenRouter key failed:', err.message)
        }
      }
    }

    // 2. Try Native Gemini
    if (!rawContent && geminiKeys.length) {
      const rotatedGeminiKeys = getRotatedKeys('gemini', geminiKeys)
      for (const geminiKey of rotatedGeminiKeys) {
        try {
          console.log('Attempting Native Google Gemini API with rotated key')
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt + "\n\nUser Prompt: " + prompt }] }],
              generationConfig: { temperature: 0.1 }
            })
          })
          const jsonResponse = await response.json()
          if (jsonResponse.error) throw new Error(jsonResponse.error.message)
          rawContent = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text
          modelUsed = 'gemini-1.5-flash'
          break
        } catch (err) {
          console.error('Gemini key failed:', err.message)
        }
      }
    }

    // 3. Try Groq (Llama 3) - FASTEST BUT WEAKER SPATIAL LOGIC
    if (!rawContent && groqKeys.length) {
      const rotatedGroqKeys = getRotatedKeys('groq', groqKeys)
      for (const groqKey of rotatedGroqKeys) {
        try {
          console.log('Attempting Groq Fallback (Llama 3) with rotated key')
          const groq = new Groq({ apiKey: groqKey })
          const completion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
          rawContent = completion.choices[0]?.message?.content
          modelUsed = 'groq/llama-3.3-70b'
          break
        } catch (err) {
          console.error('Groq key failed:', err.message)
        }
      }
    }

    // Guide Section 9 — Fallback templates when all providers fail
    let config = {}
    let usedFallback = false

    if (!rawContent) {
      console.warn('All AI providers failed. Using fallback template.')
      config = selectFallbackTemplate(prompt)
      modelUsed = 'fallback-template'
      usedFallback = true
    } else {
      // Safely parse JSON (Guide Section 10 — handle malformed JSON)
      try {
        let cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim()
        // Extract JSON object by finding first { and last }
        const jsonStart = cleanedContent.indexOf('{')
        const jsonEnd = cleanedContent.lastIndexOf('}')

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1)
        }

        config = JSON.parse(cleanedContent)
      } catch (e) {
        console.error('JSON Parse error, falling back to keyword parser:', e)
        console.log('Raw output was:', rawContent)
        // Guide Section 10 — Fall back to keyword parser on malformed JSON
        config = selectFallbackTemplate(prompt)
        usedFallback = true
      }
    }

    // Apply deterministic keyword overrides so prompt-critical intent is preserved.
    const overrides = inferPromptOverrides(prompt)

    // Build normalized intent (Guide Sections 1-2)
    const normalizedIntent = normalizeIntent(config, overrides, prompt)

    // Intercept LLM intent and generate perfect mathematical grid
    const engine = new CityGenerator({
      waterStyle: normalizedIntent.waterStyle,
      primaryZone: normalizedIntent.primaryZone,
      density: normalizedIntent.density,
      parkStyle: normalizedIntent.parkStyle,
      roadStyle: normalizedIntent.roadStyle,
      forestDensity: normalizedIntent.forestDensity,
      riverScale: normalizedIntent.riverScale,
      hospitalZone: normalizedIntent.hospitalZone,
      schoolZone: normalizedIntent.schoolZone,
      trafficLevel: normalizedIntent.trafficLevel,
      gridSize: normalizedIntent.gridSize,
      eco: normalizedIntent.eco,
    })

    const grid = engine.generate()

    if (promptRequestsHospital(prompt)) {
      ensureHospitalInGrid(grid)
    }

    // ─── Explainable AI Pipeline ───────────────────────────────────────────
    // Runs: analyze → score → explain → suggest → summarize
    const evaluation = generateInsights(grid)

    // Build response with full explainable AI payload
    const buildPayload = (id, saved) => ({
      id,
      prompt,
      layoutData: grid,
      layout: grid,

      // ── Scores (backward-compatible flat fields) ──
      score: evaluation.scores.overall,
      breakdown: evaluation.scores,

      // ── Explainable AI Layer ──
      metrics: evaluation.metrics,
      explanations: evaluation.explanations,
      suggestions: evaluation.suggestions,
      summary: evaluation.summary,

      // ── Legacy fields kept for backward compatibility ──
      insights: evaluation.explanations.map(e => e.message),
      evaluation,

      timestamp: Date.now(),
      ai_model: modelUsed,
      saved,
      normalizedIntent: {
        areaInAcres: normalizedIntent.areaInAcres || 5,
        gridSize: normalizedIntent.gridSize,
        density: normalizedIntent.density,
        trafficLevel: normalizedIntent.trafficLevel,
        eco: normalizedIntent.eco,
        smart: normalizedIntent.smart,
        usedFallback,
      },
    })

    if (!saveToHistory) {
      return res.json(buildPayload(null, false))
    }

    // Persist in Supabase first; fallback to local history file if DB table is unavailable.
    let payload = null

    try {
      const { data, error } = await supabase
        .from('city_layouts')
        .insert({
          prompt: prompt,
          grid: grid,
          ai_model: modelUsed
        })
        .select()
        .single()

      if (error) throw error

      payload = {
        ...buildPayload(data.id, true),
        timestamp: new Date(data.created_at).getTime(),
      }
    } catch (dbError) {
      console.warn('Supabase insert failed, using local history fallback:', dbError.message || dbError)
      const fallbackItem = {
        id: crypto.randomUUID(),
        prompt,
        layoutData: grid,
        timestamp: Date.now(),
        ai_model: modelUsed,
      }
      await addLocalHistoryItem(fallbackItem)
      payload = buildPayload(fallbackItem.id, true)
    }

    // Return generated grid and persistence result to frontend.
    res.json(payload)
  } catch (error) {
    console.error('Generation Error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate layout' })
  }
})
