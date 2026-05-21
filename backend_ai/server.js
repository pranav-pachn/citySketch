import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import rateLimit from 'express-rate-limit'
import { env, CORS_ALLOWLIST, validateEnv } from './src/config/env.js'
import { supabase } from './src/config/supabase.js'
import { generateRouter } from './src/routes/generateRoutes.js'
import { historyRouter } from './src/routes/historyRoutes.js'
import { mapRouter } from './src/routes/mapContextRoutes.js'
import { simulateRouter } from './src/routes/simulateRoutes.js'
import { telemetryRouter } from './src/routes/telemetryRoutes.js'
import { exportRouter } from './src/routes/exportRoutes.js'
import { errorHandler } from './src/middlewares/errorHandler.js'
import { OAuth2Client } from 'google-auth-library'

const app = express()
const PORT = env.PORT

// Middleware
// Use explicit CORS allowlist when configured, otherwise allow all origins (dev)
if (CORS_ALLOWLIST && CORS_ALLOWLIST.length) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true) // allow server-to-server or curl
        if (CORS_ALLOWLIST.includes(origin)) return callback(null, true)
        const msg = `Origin ${origin} not allowed by CORS`
        return callback(new Error(msg), false)
      },
    })
  )
} else {
  app.use(cors())
}
app.use((_req, res, next) => {
  // Google Identity popup flows rely on postMessage across windows.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})
app.use(express.json())

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many generation requests from this IP, please try again later.' }
})

app.use('/api/generate', generateLimiter)

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
app.use('/api', telemetryRouter)
app.use('/api', exportRouter)

// Serve exported files for convenience (development)
app.use('/exports', express.static(resolve(new URL('.', import.meta.url).pathname + '/../backend_ai/data/exports')))

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

app.listen(PORT, async () => {
  console.log(`⚡ CitySketch backend running on http://localhost:${PORT}`)
  validateEnv()
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === '<YOUR_GOOGLE_CLIENT_ID>') {
    console.warn('⚠️  WARNING: GOOGLE_CLIENT_ID is not set in root .env — Google Auth will fail')
  } else {
    console.log('✅ Google Auth credentials loaded')
  }

  try {
    const { error } = await supabase.from('city_layouts').select('id').limit(1)
    if (error) {
      console.warn('⚠️  Supabase connection check failed:', error.message)
    } else {
      console.log('✅ Supabase connected — city_layouts table accessible')
    }
  } catch (err) {
    console.warn('⚠️  Supabase connection check failed:', err.message)
  }
})
