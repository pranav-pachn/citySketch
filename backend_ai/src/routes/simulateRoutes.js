import { Router } from 'express'
import { simulateChanges } from '../controllers/simulateController.js'

export const simulateRouter = Router()

simulateRouter.post('/simulate', simulateChanges)
