import express from 'express'
import fs from 'fs'
import { resolve } from 'path'

const router = express.Router()

// POST /api/export
// body: { layout: object, pngDataUrl?: string, filename?: string }
router.post('/export', async (req, res) => {
  try {
    const { layout, pngDataUrl, filename } = req.body || {}
    if (!layout && !pngDataUrl) return res.status(400).json({ error: 'layout or pngDataUrl required' })

    const outDir = resolve(new URL('../../../../', import.meta.url).pathname, 'backend_ai', 'data', 'exports')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const base = filename ? filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `export_${Date.now()}`
    const meta = { id: base, timestamp: Date.now() }

    if (pngDataUrl) {
      // pngDataUrl expected like 'data:image/png;base64,....'
      const match = pngDataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/)
      if (!match) return res.status(400).json({ error: 'Invalid pngDataUrl' })
      const ext = match[1] === 'jpeg' ? 'jpg' : 'png'
      const data = match[2]
      const buf = Buffer.from(data, 'base64')
      const outPath = resolve(outDir, `${base}.${ext}`)
      fs.writeFileSync(outPath, buf)
      meta.path = outPath
    }

    if (layout) {
      const outPath = resolve(outDir, `${base}.json`)
      fs.writeFileSync(outPath, JSON.stringify({ layout }, null, 2))
      meta.jsonPath = outPath
    }

    return res.json({ ok: true, meta })
  } catch (err) {
    console.error('Export failed:', err)
    return res.status(500).json({ error: err.message || 'Export failed' })
  }
})

export { router as exportRouter }
