import type { StateCreator } from 'zustand'
import type { GridCell, ViewMode } from '@/entities/types'
import type { AppState } from '../useStore'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info'
}

export interface UISlice {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  detailOpen: boolean
  setDetailOpen: (open: boolean) => void
  hoveredCell: GridCell | null
  setHoveredCell: (cell: GridCell | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'info') => void
  removeToast: (id: string) => void
  highlightMode: boolean
  setHighlightMode: (mode: boolean) => void
  isNightMode: boolean
  setNightMode: (night: boolean) => void
  isCanvasMaximized: boolean
  setCanvasMaximized: (max: boolean) => void
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  viewMode: '2D',
  setViewMode: (mode) => set({ viewMode: mode }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open, selectedCell: open ? get().selectedCell : null }),
  hoveredCell: null,
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  highlightMode: false,
  setHighlightMode: (highlightMode) => set({ highlightMode }),
  isNightMode: false,
  setNightMode: (night) => set({ isNightMode: night }),
  isCanvasMaximized: false,
  setCanvasMaximized: (max) => set({ isCanvasMaximized: max }),
  settingsOpen: false,
  setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),
})
