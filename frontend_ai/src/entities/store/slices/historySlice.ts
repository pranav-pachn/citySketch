import type { StateCreator } from 'zustand'
import type { HistoryItem } from '@/entities/types'
import type { AppState } from '../useStore'
import { apiClient } from '@/shared/api/apiClient'

export interface HistorySlice {
  history: HistoryItem[]
  activeHistoryId: string | null
  compareHistoryId: string | null
  addHistory: (item: HistoryItem) => void
  setActiveHistoryId: (id: string | null) => void
  setCompareHistoryId: (id: string | null) => void
  loadHistory: (id: string) => void
  clearHistory: () => void
  deleteHistoryItem: (id: string) => Promise<void>
  fetchHistory: () => Promise<void>
}

export const createHistorySlice: StateCreator<AppState, [], [], HistorySlice> = (set, get) => ({
  history: [],
  activeHistoryId: null,
  compareHistoryId: null,

  addHistory: (item) => set((state) => ({ history: [item, ...state.history] })),
  
  setActiveHistoryId: (id) => set({ activeHistoryId: id }),
  
  setCompareHistoryId: (id) => set({ compareHistoryId: id }),

  loadHistory: (id) => {
    const item = get().history.find((h) => h.id === id)
    if (item) {
      set({
        activeHistoryId: id,
        layoutData: item.layoutData,
        evaluation: item.evaluation || null,
        selectedCell: null,
        detailOpen: false,
        prompt: '',
        hasUnsavedLayoutChanges: false,
      })
    }
  },

  clearHistory: () => {
    set({
      history: [],
      activeHistoryId: null,
      layoutData: null,
      evaluation: null,
      selectedCell: null,
      detailOpen: false,
      hasUnsavedLayoutChanges: false,
      highlightMode: false,
    })
    get().addToast('History cleared')
  },

  deleteHistoryItem: async (id) => {
    try {
      await apiClient.deleteHistoryItem(id)
      const { history, activeHistoryId } = get()
      const filtered = history.filter((h) => h.id !== id)
      
      const updates: Partial<AppState> = { history: filtered }
      if (activeHistoryId === id) {
        updates.activeHistoryId = null
        updates.layoutData = null
        updates.evaluation = null
        updates.selectedCell = null
        updates.detailOpen = false
        updates.hasUnsavedLayoutChanges = false
        updates.highlightMode = false
      }
      set(updates as AppState)
    } catch (error) {
      console.error('Failed to delete history item', error)
      get().addToast('Draft deletion failed', 'info')
    }
  },

  fetchHistory: async () => {
    const { user, setIsLoading, addToast } = get()
    if (!user) return

    setIsLoading(true)
    try {
      const data = await apiClient.fetchHistory()
      set({ history: data })
    } catch (error: any) {
      addToast(error.message || 'Failed to load history', 'info')
    } finally {
      setIsLoading(false)
    }
  },
})
