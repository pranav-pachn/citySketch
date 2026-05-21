import express from 'express'
import fs from 'fs'
import { resolve } from 'path'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'

const router = express.Router()

// Simple telemetry receiver
// Accepts POST { timestamp, source, metrics, meta }
router.post('/telemetry', async (req, res) => {
  try {
    const payload = req.body || {}

    // Optional simple secret to avoid open spam
    const telemetrySecret = process.env.TELEMETRY_SECRET
    if (telemetrySecret) {
      const header = req.get('x-telemetry-secret') || ''
      if (header !== telemetrySecret) return res.status(401).json({ error: 'Unauthorized' })
    }

    payload.receivedAt = Date.now()

    // Prefer persisting to Supabase if configured
    try {
      if (supabase) {
        await supabase.from('telemetry').insert({ payload }).select()
        return res.json({ ok: true })
      }
    } catch (err) {
      console.warn('Supabase telemetry insert failed:', err.message || err)
    }

    // Fallback: append to local telemetry file
    const dataDir = resolve(new URL('../../../../', import.meta.url).pathname, 'backend_ai', 'data')
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
      const file = resolve(dataDir, 'telemetry.jsonl')
      fs.appendFileSync(file, JSON.stringify(payload) + '\n')
      return res.json({ ok: true })
    } catch (err) {
      console.error('Local telemetry write failed:', err)
      return res.status(500).json({ error: 'Failed to persist telemetry' })
    }
  } catch (error) {
    console.error('Telemetry handler error:', error)
    res.status(500).json({ error: error.message || 'Telemetry failed' })
  }
})

export { router as telemetryRouter }
