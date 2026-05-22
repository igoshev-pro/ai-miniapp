// src/stores/auth.store.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isReady: boolean // auth завершён (успех или нет)

  setToken: (token: string) => void
  setReady: () => void
  clearToken: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isReady: false,

      setToken: (token: string) => set({ token, isReady: true }),

      setReady: () => set({ isReady: true }),

      clearToken: () => set({ token: null }),
    }),
    {
      name: 'spichki-auth',
      storage: createJSONStorage(() => localStorage),
      // Сохраняем только token. isReady должно сбрасываться при каждой загрузке,
      // потому что мы каждый раз заново проходим init-flow.
      partialize: (state) => ({ token: state.token }),
    },
  ),
)