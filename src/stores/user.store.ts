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
  updateBalance: (tokenBalance: number, bonusTokens: number) => void
  clear: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoaded: false,

  setUser: (user) => set({
    user: { ...user, totalBalance: user.tokenBalance + user.bonusTokens },
    isLoaded: true,
  }),

  updateBalance: (tokenBalance, bonusTokens) =>
    set((s) => ({
      user: s.user
        ? { ...s.user, tokenBalance, bonusTokens, totalBalance: tokenBalance + bonusTokens }
        : null,
    })),

  clear: () => set({ user: null, isLoaded: false }),
}))
