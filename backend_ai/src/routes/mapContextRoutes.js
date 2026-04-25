import { Router } from 'express'
import { generateFromMap } from '../controllers/mapContextController.js'

export const mapRouter = Router()

mapRouter.post('/generate-from-map', generateFromMap)
