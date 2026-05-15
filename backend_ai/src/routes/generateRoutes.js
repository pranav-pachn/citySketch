import { Router } from 'express'
import { generateCity } from '../controllers/generateController.js'

export const generateRouter = Router()

generateRouter.post('/generate', generateCity)
generateRouter.get('/generate', (_req, res) => {
  res.status(200).json({
    message: 'Use POST /api/generate with JSON body: { "prompt": "..." }',
  })
})

// Development-only helper to generate a sample layout without auth or frontend
if (process.env.NODE_ENV !== 'production') {
  generateRouter.post('/_dev/generate-sample', (req, res, next) => {
    // Synthetic body to exercise constraint mapping end-to-end
    req.body = {
      prompt: '10 acre eco city with low traffic and high density',
      saveToHistory: false,
      parsed: { constraints: { eco: true, low_traffic: true, high_density: true } },
    }
    return generateCity(req, res, next)
  })
}
