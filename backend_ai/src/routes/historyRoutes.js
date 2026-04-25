import { Router } from 'express'
import { createHistoryItem, getHistory, deleteHistoryItem } from '../controllers/historyController.js'

export const historyRouter = Router()

historyRouter.post('/history', createHistoryItem)
historyRouter.get('/history', getHistory)
historyRouter.delete('/history/:id', deleteHistoryItem)
