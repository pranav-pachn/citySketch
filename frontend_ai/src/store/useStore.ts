import { create } from 'zustand'
import type { ViewMode, GridCell, HistoryItem } from '../types'
import { apiUrl } from '../lib/api'

interface Toast {
  id: string
  message: string
  type: 'success' | 'info'
}

interface AppState {
  // Prompt
  prompt: string
  setPrompt: (p: string) => void

  // Layout
  layoutData: GridCell[][] | null
  setLayoutData: (data: GridCell[][] | null) => void

  // Selection
  selectedCell: GridCell | null
  setSelectedCell: (cell: GridCell | null) => void
  hoveredCell: GridCell | null
  setHoveredCell: (cell: GridCell | null) => void

  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Detail panel
  detailOpen: boolean
  setDetailOpen: (open: boolean) => void

  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  generationId: number

  // History
  history: HistoryItem[]
  activeHistoryId: string | null
  addHistory: (item: HistoryItem) => void
  setActiveHistoryId: (id: string | null) => void
  loadHistory: (id: string) => void
  clearHistory: () => void
  deleteHistoryItem: (id: string) => void

  // Toast
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'info') => void
  removeToast: (id: string) => void

  // Cell editing
  updateCellType: (x: number, y: number, type: GridCell['type']) => void
  hasUnsavedLayoutChanges: boolean

  // Actions
  submitPrompt: (saveToHistory?: boolean) => Promise<void>
  submitMapContext: (bbox: [number, number, number, number], locationName: string, gridSize?: number) => Promise<void>
  saveCurrentLayout: () => Promise<void>
  newSession: () => void
  fetchHistory: () => Promise<void>
  isNightMode: boolean
  setNightMode: (night: boolean) => void
  isCanvasMaximized: boolean
  setCanvasMaximized: (max: boolean) => void

  // Auth
  user: {
    uid: string
    email: string
    name: string
    picture: string
  } | null
  setUser: (user: { uid: string; email: string; name: string; picture: string } | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  prompt: '',
  setPrompt: (p) => set({ prompt: p }),

  layoutData: null,
  setLayoutData: (data) => set({ layoutData: data }),

  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell, detailOpen: !!cell }),
  hoveredCell: null,
  setHoveredCell: (cell) => set({ hoveredCell: cell }),

  viewMode: '2D',
  setViewMode: (mode) => set({ viewMode: mode }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open, selectedCell: open ? get().selectedCell : null }),

  isNightMode: false,
  setNightMode: (night) => set({ isNightMode: night }),
  
  isCanvasMaximized: false,
  setCanvasMaximized: (max) => set({ isCanvasMaximized: max }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  generationId: 0,
  hasUnsavedLayoutChanges: false,

  history: [],
  activeHistoryId: null,
  addHistory: (item) =>
    set((state) => ({ history: [item, ...state.history] })),
  setActiveHistoryId: (id) => set({ activeHistoryId: id }),
  loadHistory: (id) => {
    const item = get().history.find((h) => h.id === id)
    if (item) {
      set({
        activeHistoryId: id,
        layoutData: item.layoutData,
        selectedCell: null,
        detailOpen: false,
        prompt: '',
        hasUnsavedLayoutChanges: false,
      })
    }
  },
  clearHistory: () => {
    set({ history: [], activeHistoryId: null, layoutData: null, selectedCell: null, detailOpen: false, hasUnsavedLayoutChanges: false })
    get().addToast('History cleared')
  },
  deleteHistoryItem: async (id) => {
    try {
      await fetch(apiUrl(`/api/history/${id}`), { method: 'DELETE' })
      const { history, activeHistoryId } = get()
      const filtered = history.filter((h) => h.id !== id)
      const updates: Partial<AppState> = { history: filtered }
      if (activeHistoryId === id) {
        updates.activeHistoryId = null
        updates.layoutData = null
        updates.selectedCell = null
        updates.detailOpen = false
        updates.hasUnsavedLayoutChanges = false
      }
      set(updates as AppState)
    } catch (error) {
      console.error('Failed to delete history item', error)
      get().addToast('Draft deletion failed', 'info')
    }
  },

  toasts: [],
  addToast: (message, type = 'success') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3000)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

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

  submitPrompt: async (saveToHistory = false) => {
    const { prompt, setIsLoading, addHistory, setActiveHistoryId, setLayoutData, addToast } = get()
    if (!prompt.trim()) return

    setIsLoading(true)

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, saveToHistory }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate from API')
      }

      const data = await res.json()

      setLayoutData(data.layoutData)
      if (saveToHistory && data?.id) {
        addHistory(data)
        setActiveHistoryId(data.id)
      } else {
        setActiveHistoryId(null)
      }
      set((state) => ({
        prompt: '',
        isLoading: false,
        selectedCell: null,
        detailOpen: false,
        generationId: state.generationId + 1,
        hasUnsavedLayoutChanges: false,
      }))
      addToast(saveToHistory ? 'Layout generated and saved' : 'Layout generated (not saved)')
    } catch (error) {
      console.error('Generation failed:', error)
      set({ isLoading: false })
      addToast('AI Generation Failed. Try again.', 'info')
    }
  },

  submitMapContext: async (bbox, locationName, gridSize = 20) => {
    const { setIsLoading, addHistory, setActiveHistoryId, setLayoutData, addToast } = get()

    setIsLoading(true)

    try {
      const res = await fetch(apiUrl('/api/generate-from-map'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, gridSize, locationName }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate from map')
      }

      const data = await res.json()

      setLayoutData(data.layoutData)
      if (data?.id) {
        addHistory(data)
        setActiveHistoryId(data.id)
      }
      set((state) => ({
        prompt: '',
        isLoading: false,
        selectedCell: null,
        detailOpen: false,
        generationId: state.generationId + 1,
        hasUnsavedLayoutChanges: false,
      }))
      addToast(`Map simulation generated: ${locationName}`)
    } catch (error) {
      console.error('Map generation failed:', error)
      set({ isLoading: false })
      addToast('Map simulation failed. Try again.', 'info')
    }
  },

  saveCurrentLayout: async () => {
    const { layoutData, prompt, activeHistoryId, history, addHistory, setActiveHistoryId, addToast } = get()

    if (!layoutData) {
      addToast('Nothing to save yet', 'info')
      return
    }

    const activeItem = history.find((h) => h.id === activeHistoryId)
    const promptForSave = prompt.trim() || activeItem?.prompt || `Manual save ${new Date().toLocaleString()}`

    try {
      const res = await fetch(apiUrl('/api/history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptForSave,
          layoutData,
          ai_model: 'manual',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save history snapshot')
      }

      const saved = await res.json()
      addHistory(saved)
      setActiveHistoryId(saved.id)
      set({ hasUnsavedLayoutChanges: false })
      addToast('Layout saved to history')
    } catch (error) {
      console.error('Failed to save layout snapshot', error)
      addToast('History save failed', 'info')
    }
  },

  newSession: () => {
    set({
      layoutData: null,
      activeHistoryId: null,
      selectedCell: null,
      detailOpen: false,
      prompt: '',
      viewMode: '2D',
      hasUnsavedLayoutChanges: false,
    })
  },

  fetchHistory: async () => {
    try {
      const res = await fetch(apiUrl('/api/history'))
      if (res.ok) {
        const history = await res.json()
        set({ history })
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  },
}))
