import { Router } from 'express'
import { generateCity } from '../controllers/generateController.js'

export const generateRouter = Router()

generateRouter.post('/generate', generateCity)
generateRouter.get('/generate', (_req, res) => {
  res.status(200).json({
    message: 'Use POST /api/generate with JSON body: { "prompt": "..." }',
  })
})
