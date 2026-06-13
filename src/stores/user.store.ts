// src/stores/user.store.ts

import { create } from 'zustand'

export interface UserProfile {
  id: string
  telegramId: number | null
  authProvider: 'telegram' | 'email' | 'google'
  email: string | null
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  role: 'user' | 'premium' | 'admin' | 'super_admin'
  tokenBalance: number
  bonusTokens: number
  // ✅ Добавляем cashbackBalance — третий кошелёк пользователя
  cashbackBalance: number
  totalBalance: number
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'unlimited'
    expiresAt: string | null
    isActive: boolean
  }
  referralCode: string
  createdAt: string | null
}

interface UserState {
  user: UserProfile | null
  isLoaded: boolean

  setUser: (user: UserProfile) => void
  // ✅ Добавляем cashbackBalance третьим аргументом (необязательный для обратной совместимости)
  updateBalance: (tokenBalance: number, bonusTokens: number, cashbackBalance?: number) => void
  clear: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoaded: false,

  setUser: (user) =>
    set({
      user: {
        ...user,
        cashbackBalance: user.cashbackBalance ?? 0,
        totalBalance:
          (user.tokenBalance ?? 0) +
          (user.bonusTokens ?? 0) +
          (user.cashbackBalance ?? 0),
      },
      isLoaded: true,
    }),

  // ✅ cashbackBalance опциональный: если не передан — берём текущий из стора
  updateBalance: (tokenBalance, bonusTokens, cashbackBalance) =>
    set((s) => {
      if (!s.user) return { user: null }
      const newCashback = cashbackBalance ?? s.user.cashbackBalance ?? 0
      return {
        user: {
          ...s.user,
          tokenBalance,
          bonusTokens,
          cashbackBalance: newCashback,
          totalBalance: tokenBalance + bonusTokens + newCashback,
        },
      }
    }),

  clear: () => set({ user: null, isLoaded: false }),
}))