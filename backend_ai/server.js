import express from 'express'
import cors from 'cors'
import { env } from './src/config/env.js'
import { generateRouter } from './src/routes/generateRoutes.js'
import { historyRouter } from './src/routes/historyRoutes.js'
import { mapRouter } from './src/routes/mapContextRoutes.js'
import { simulateRouter } from './src/routes/simulateRoutes.js'
import { errorHandler } from './src/middlewares/errorHandler.js'
import { OAuth2Client } from 'google-auth-library'

const app = express()
const PORT = env.PORT

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'] }))
app.use((_req, res, next) => {
  // Google Identity popup flows rely on postMessage across windows.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})
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

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)

// Routes
app.use('/api', generateRouter)
app.use('/api', historyRouter)
app.use('/api', mapRouter)
app.use('/api', simulateRouter)

// Auth route
app.post('/api/auth/google', async (req, res, next) => {
  const { token } = req.body

  if (!token) {
    const error = new Error('Token is required')
    error.statusCode = 400
    return next(error)
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email_verified) {
      const error = new Error('Invalid Google account')
      error.statusCode = 401
      return next(error)
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
    const authError = new Error('Authentication failed')
    authError.statusCode = 401
    next(authError)
  }
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Global Error Handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`⚡ CitySketch backend running on http://localhost:${PORT}`)
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === '<YOUR_GOOGLE_CLIENT_ID>') {
    console.warn('⚠️  WARNING: GOOGLE_CLIENT_ID is not set in root .env — Google Auth will fail')
  } else {
    console.log('✅ Google Auth credentials loaded')
  }
})
