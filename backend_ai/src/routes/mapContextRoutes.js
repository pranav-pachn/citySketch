import { Router } from 'express'
import { generateFromMap, searchLocations } from '../controllers/mapContextController.js'

export const mapRouter = Router()

mapRouter.get('/search', searchLocations)
mapRouter.post('/generate-from-map', generateFromMap)
