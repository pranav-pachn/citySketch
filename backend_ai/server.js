import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { generateRoute } from './routes/generate.js'
import { historyRoute } from './routes/history.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

// API index for browser/manual checks
app.get('/', (_req, res) => {
  res.json({
    name: 'CitySketch Backend',
    status: 'ok',
    docs: '/api',
  })
})

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    endpoints: {
      health: { method: 'GET', path: '/api/health' },
      generate: { method: 'POST', path: '/api/generate' },
      historyList: { method: 'GET', path: '/api/history' },
      historyDelete: { method: 'DELETE', path: '/api/history/:id' },
    },
  })
})

// Routes
app.use('/api', generateRoute)
app.use('/api', historyRoute)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`⚡ CitySketch backend running on http://localhost:${PORT}`)
})
