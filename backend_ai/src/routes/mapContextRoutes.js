import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { generateFromMap, searchLocations } from '../controllers/mapContextController.js'

export const mapRouter = Router()

const osmRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 60,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many OSM-related requests from this IP. Please try again later.' },
})

mapRouter.get('/search', osmRateLimit, searchLocations)
mapRouter.post('/generate-from-map', osmRateLimit, generateFromMap)
