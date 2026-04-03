import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { generateRoute } from './routes/generate.js'
import { historyRoute } from './routes/history.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

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

import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Routes
app.use('/api', generateRoute)
app.use('/api', historyRoute)

// Auth route
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Token is required' })
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Invalid Google account' })
    }

    // Success - user is verified
    const { sub, email, name, picture } = payload
    res.json({
      uid: sub,
      email,
      name,
      picture,
    })
  } catch (error) {
    console.error('Google Auth verification error:', error.message)
    res.status(401).json({ error: 'Authentication failed' })
  }
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`⚡ CitySketch backend running on http://localhost:${PORT}`)
  const googleId = process.env.GOOGLE_CLIENT_ID
  if (!googleId || googleId === '<YOUR_GOOGLE_CLIENT_ID>') {
    console.warn('⚠️  WARNING: GOOGLE_CLIENT_ID is not set in root .env — Google Auth will fail')
  } else {
    console.log('✅ Google Auth credentials loaded')
  }
})
