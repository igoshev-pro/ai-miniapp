// src/hooks/useUser.ts

'use client'

import { useCallback } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { useUserStore, type UserProfile } from '@/stores'

export function useUser() {
  const { user, isLoaded, setUser, updateBalance } = useUserStore()

  const refetch = useCallback(async () => {
    try {
      const { data } = await apiClient.get<UserProfile>(ENDPOINTS.USER_ME)
      setUser(data)
    } catch (e) {
      console.error('[useUser] refetch failed:', e)
    }
  }, [setUser])

  const refreshBalance = useCallback(async () => {
    try {
      const { data } = await apiClient.get<UserProfile>(ENDPOINTS.USER_ME)
      updateBalance(data.tokenBalance, data.bonusTokens)
    } catch (e) {
      console.error('[useUser] balance refresh failed:', e)
    }
  }, [updateBalance])

  return {
    user,
    isLoaded,
    balance: user?.totalBalance ?? 0,
    tokenBalance: user?.tokenBalance ?? 0,
    bonusTokens: user?.bonusTokens ?? 0,
    subscription: user?.subscription ?? { plan: 'free' as const, expiresAt: null, isActive: false },
    referralCode: user?.referralCode ?? '',
    refetch,
    refreshBalance,
  }
}