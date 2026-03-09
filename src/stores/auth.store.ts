// src/stores/auth.store.ts

import { create } from 'zustand'

interface AuthState {
  token: string | null
  isReady: boolean       // auth завершён (успех или нет)

  setToken: (token: string) => void
  setReady: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isReady: false,

  setToken: (token: string) => {
    sessionStorage.setItem('jwt', token)
    set({ token, isReady: true })
  },

  setReady: () => set({ isReady: true }),
}))