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
      setUser(res.data.data)
    } catch (e) {
      console.error('[useUser] refetch failed:', e)
    }
  }, [setUser])

  const refreshBalance = useCallback(async () => {
    try {
      const res = await apiClient.get<UserMeResponse>(ENDPOINTS.USER_ME)
      updateBalance(res.data.data.tokenBalance, res.data.data.bonusTokens)
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
