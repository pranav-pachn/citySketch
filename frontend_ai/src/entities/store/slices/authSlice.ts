import type { StateCreator } from 'zustand'
import type { AppState } from '../useStore'

export interface User {
  uid: string
  email: string
  name: string
  picture: string
}

export interface AuthSlice {
  user: User | null
  setUser: (user: User | null) => void
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})
