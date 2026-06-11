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

      clearToken: () => {
        // 🆕 рвём WS со старым токеном (ленивый импорт против циклов)
        try {
          import('@/lib/ws/socket').then((m) => m.disconnectSocket?.())
        } catch {}

        // 🆕 чистим профиль пользователя
        try {
          import('@/stores/user.store').then((m) =>
            m.useUserStore.getState().clear?.(),
          )
        } catch {}

        set({ token: null, isReady: true })
      },
    }),
    {
      name: 'spichki-auth',
      storage: createJSONStorage(() => localStorage),
      // Сохраняем только token. isReady сбрасывается при каждой загрузке,
      // т.к. каждый раз заново проходим init-flow.
      partialize: (state) => ({ token: state.token }),
    },
  ),
)