'use client'

import { useEffect, useRef } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { useAuthStore, useUserStore, type UserProfile } from '@/stores'
import { toast } from '@/stores/toast.store'
import { useTelegram } from '@/context/TelegramContext'

interface AuthApiResponse {
  success: boolean
  data: {
    token: string
    user: UserProfile
  }
}

export function useAuth() {
  const { webApp, isReady } = useTelegram()
  const { token, isReady: authReady, setToken, setReady } = useAuthStore()
  const { setUser } = useUserStore()
  const attempted = useRef(false)

  useEffect(() => {
    if (!isReady || attempted.current) return
    attempted.current = true

    const initData = webApp?.initData

    // No initData — not in Telegram, skip auth
    if (!initData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] No initData — dev mode, skipping auth')
      }
      setReady()
      return
    }

    xchange initData → JWT
    apiClient
      .post<AuthApiResponse>(ENDPOINTS.AUTH_TELEGRAM, { initData })
      .then((res) => {
        const { token: jwt, user } = res.data.data
        setToken(jwt)
        setUser(user)
      })
      .catch((err) => {
        console.error('[Auth] Failed:', err)
        toast.error('Не удалось авторизоваться')
        setReady()
      })
  }, [isReady, webApp, setToken, setUser, setReady])

  return { isReady: authReady, token }
}
