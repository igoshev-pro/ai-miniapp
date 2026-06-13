// src/hooks/useUser.ts
'use client'

import { useCallback } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { useUserStore, type UserProfile } from '@/stores'

interface UserMeResponse {
  success: boolean
  data: UserProfile
}

export function useUser() {
  const { user, isLoaded, setUser, updateBalance } = useUserStore()

  const refetch = useCallback(async () => {
    try {
      const res = await apiClient.get<UserMeResponse>(ENDPOINTS.USER_ME)
      // setUser пересчитывает totalBalance включая cashbackBalance
      setUser(res.data.data)
    } catch (e) {
      console.error('[useUser] refetch failed:', e)
    }
  }, [setUser])

  const refreshBalance = useCallback(async () => {
    try {
      const res = await apiClient.get<UserMeResponse>(ENDPOINTS.USER_ME)
      const d = res.data.data
      // ✅ Передаём все три кошелька чтобы totalBalance был точным
      updateBalance(
        d.tokenBalance,
        d.bonusTokens,
        d.cashbackBalance ?? 0,
      )
    } catch (e) {
      console.error('[useUser] balance refresh failed:', e)
    }
  }, [updateBalance])

  return {
    user,
    isLoaded,
    // totalBalance в сторе уже включает tokenBalance + bonusTokens + cashbackBalance
    balance: user?.totalBalance ?? 0,
    tokenBalance: user?.tokenBalance ?? 0,
    bonusTokens: user?.bonusTokens ?? 0,
    // ✅ Добавляем cashbackBalance для компонентов которые хотят показать отдельно
    cashbackBalance: user?.cashbackBalance ?? 0,
    subscription: user?.subscription ?? {
      plan: 'free' as const,
      expiresAt: null,
      isActive: false,
    },
    referralCode: user?.referralCode ?? '',
    refetch,
    refreshBalance,
  }
}