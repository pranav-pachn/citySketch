import type { StateCreator } from 'zustand'
import type { GridCell, EvaluationData } from '@/entities/types'
import type { AppState } from '../useStore'
import { apiClient } from '@/shared/api/apiClient'
import { parseText } from '@/shared/utils/cityDescriptionParser'

export interface LayoutSlice {
  prompt: string
  setPrompt: (p: string) => void
  layoutData: GridCell[][] | null
  setLayoutData: (data: GridCell[][] | null) => void
  selectedCell: GridCell | null
  setSelectedCell: (cell: GridCell | null) => void
  generationId: number
  hasUnsavedLayoutChanges: boolean
  updateCellType: (x: number, y: number, type: GridCell['type']) => void
  evaluation: EvaluationData | null
  setEvaluation: (data: EvaluationData | null) => void
  submitPrompt: (saveToHistory?: boolean) => Promise<void>
  submitMapContext: (bbox: [number, number, number, number], locationName: string, gridSize?: number, corners?: {lat: number, lng: number}[]) => Promise<void>
  saveCurrentLayout: () => Promise<void>
  newSession: () => void
  regeneratePrompt: () => Promise<void>
}

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (set, get) => ({
  prompt: '',
  setPrompt: (p) => set({ prompt: p }),
  layoutData: null,
  setLayoutData: (data) => set({ layoutData: data }),
  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell, detailOpen: !!cell }),
  generationId: 0,
  hasUnsavedLayoutChanges: false,
  evaluation: null,
  setEvaluation: (evaluation) => set({ evaluation }),

  updateCellType: (x, y, type) => {
    const { layoutData, activeHistoryId, history } = get()
    if (!layoutData) return
    const existing = layoutData[y]?.[x]
    if (!existing || existing.type === type) return

    const newData = layoutData.map((row) =>
      row.map((cell) => (cell.x === x && cell.y === y ? { ...cell, type } : cell))
    )
    // Update history too
    const newHistory = history.map((h) =>
      h.id === activeHistoryId ? { ...h, layoutData: newData } : h
    )
    set({ layoutData: newData, history: newHistory, selectedCell: { x, y, type }, hasUnsavedLayoutChanges: true })
  },

  submitPrompt: async (saveToHistory = true) => {
    const { prompt, setIsLoading, addToast, addHistory, setActiveHistoryId, generationId } = get()
    if (!prompt.trim()) return

    setIsLoading(true)
    // Small UI-friendly delay so loading state is visible and feels intentional
    await new Promise((r) => setTimeout(r, 500))
    // Small UI-friendly delay so loading state is visible and feels intentional
    await new Promise((r) => setTimeout(r, 500))
    try {
      const parsed = parseText(prompt)
      const data = await apiClient.generateCity(prompt, saveToHistory, parsed)
      set({
        layoutData: data.layoutData || data.layout,
        evaluation: data.evaluation,
        selectedCell: null,
        detailOpen: false,
        generationId: generationId + 1,
        hasUnsavedLayoutChanges: false,
      })
      if (saveToHistory && data.saved) {
        addHistory(data)
        setActiveHistoryId(data.id)
      }
      addToast('City generated successfully')
    } catch (error: any) {
      addToast(error.message || 'Failed to generate layout', 'info')
    } finally {
      setIsLoading(false)
    }
  },

  submitMapContext: async (bbox, locationName, gridSize = 20, corners) => {
    const { setIsLoading, addToast, addHistory, setActiveHistoryId, generationId, prompt } = get()
    setIsLoading(true)
    // Small UI-friendly delay so loading state is visible and feels intentional
    await new Promise((r) => setTimeout(r, 500))
    try {
      const data = await apiClient.generateFromMap(bbox, locationName, gridSize, prompt, undefined, true, corners)
      set({
        layoutData: data.layoutData || data.layout,
        evaluation: data.evaluation,
        selectedCell: null,
        detailOpen: false,
        generationId: generationId + 1,
        hasUnsavedLayoutChanges: false,
      })
      if (data.saved) {
        addHistory(data)
        setActiveHistoryId(data.id)
      }
      addToast('Map context generated successfully')
    } catch (error: any) {
      addToast(error.message || 'Map generation failed', 'info')
    } finally {
      setIsLoading(false)
    }
  },

  saveCurrentLayout: async () => {
    const { layoutData, prompt, evaluation, activeHistoryId, addToast, fetchHistory } = get()
    if (!layoutData) return

    try {
      await apiClient.saveHistoryItem({
        id: activeHistoryId || undefined,
        prompt: prompt || 'Manual adjustment',
        layoutData,
        evaluation: evaluation || undefined,
      })
      addToast('Layout saved successfully')
      set({ hasUnsavedLayoutChanges: false })
      await fetchHistory()
    } catch (error: any) {
      addToast(error.message || 'Failed to save layout', 'info')
    }
  },

  regeneratePrompt: async () => {
    const { layoutData, prompt, evaluation, activeHistoryId, addHistory, setActiveHistoryId, setCompareHistoryId, setIsLoading, addToast, generationId, fetchHistory } = get()
    if (!layoutData) {
      addToast('Nothing to regenerate from', 'info')
      return
    }
    if (!prompt || !prompt.trim()) {
      addToast('No prompt to regenerate from', 'info')
      return
    }

    const oldId = activeHistoryId || `prev-${Date.now()}`

    if (!activeHistoryId) {
      const prevItem = {
        id: oldId,
        prompt: prompt || 'Previous layout',
        layoutData,
        evaluation: evaluation || undefined,
        timestamp: Date.now(),
      }
      addHistory(prevItem)
    }

    setCompareHistoryId(oldId)

    setIsLoading(true)
    try {
      const parsed = parseText(prompt)
      const data = await apiClient.generateCity(prompt, true, parsed)
      const newId = data.id || `regen-${Date.now()}`

      set({
        layoutData: data.layoutData || data.layout,
        evaluation: data.evaluation,
        activeHistoryId: newId,
        selectedCell: null,
        detailOpen: false,
        generationId: generationId + 1,
        hasUnsavedLayoutChanges: false,
      })

      if (data.saved) {
        addHistory(data)
        setActiveHistoryId(newId)
      }

      await fetchHistory()
      addToast('Layout regenerated successfully')
    } catch (err: any) {
      addToast(err?.message || 'Regenerate failed', 'info')
    } finally {
      setIsLoading(false)
    }
  },

  newSession: () => {
    set({
      prompt: '',
      layoutData: null,
      evaluation: null,
      activeHistoryId: null,
      selectedCell: null,
      detailOpen: false,
      hasUnsavedLayoutChanges: false,
      highlightMode: false,
    })
  },
})
