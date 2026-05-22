import { apiUrl } from './api'
import type { GridCell, HistoryItem, EvaluationData } from '@/entities/types'

interface GenerateResponse {
  id: string
  prompt: string
  layout: GridCell[][]
  layoutData: GridCell[][]
  score: number
  breakdown: Record<string, number>
  suggestions: string[]
  evaluation: EvaluationData
  saved?: boolean
  timestamp: number
}

export const apiClient = {
  async searchLocations(query: string): Promise<any[]> {
    const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(query)}`))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to search locations')
    }
    return res.json()
  },

  async generateCity(prompt: string, saveToHistory: boolean, parsed?: any): Promise<GenerateResponse> {
    const body: any = { prompt, saveToHistory }
    if (parsed) body.parsed = parsed

    const res = await fetch(apiUrl('/api/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to generate city')
    }
    return res.json()
  },

  async generateFromMap(bbox: [number, number, number, number], locationName: string, gridSize?: number): Promise<GenerateResponse> {
    const res = await fetch(apiUrl('/api/generate-from-map'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbox, locationName, gridSize }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to generate from map')
    }
    return res.json()
  },

  async simulateModifications(grid: GridCell[][], modifications: any): Promise<any> {
    const res = await fetch(apiUrl('/api/simulate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid, modifications }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Simulation failed')
    }
    return res.json()
  },

  async fetchHistory(): Promise<HistoryItem[]> {
    const res = await fetch(apiUrl('/api/history'))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to load history')
    }
    return res.json()
  },

  async saveHistoryItem(item: Partial<HistoryItem>): Promise<HistoryItem> {
    const res = await fetch(apiUrl('/api/history'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to save to history')
    }
    return res.json()
  },

  async deleteHistoryItem(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/history/${id}`), {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to delete history item')
    }
  }
}
