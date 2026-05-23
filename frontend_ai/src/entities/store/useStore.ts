import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createUISlice, type UISlice } from './slices/uiSlice'
import { createAuthSlice, type AuthSlice } from './slices/authSlice'
import { createLayoutSlice, type LayoutSlice } from './slices/layoutSlice'
import { createHistorySlice, type HistorySlice } from './slices/historySlice'

export type AppState = UISlice & AuthSlice & LayoutSlice & HistorySlice

export const useStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createUISlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createLayoutSlice(set, get, api),
      ...createHistorySlice(set, get, api),
    }),
    {
      name: 'citysketch-settings',
      partialize: (state) => ({
        isNightMode: state.isNightMode,
        highlightMode: state.highlightMode,
        user: state.user,
      }),
    }
  )
)
