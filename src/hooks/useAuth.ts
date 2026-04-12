'use client'

import { useEffect, useRef, useCallback } from 'react'
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

export interface TelegramWidgetData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
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

    // No initData — not in Telegram, wait for widget login
    if (!initData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] No initData — not in Telegram, waiting for widget login')
      }
      setReady()
      return
    }

    // Exchange initData → JWT
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

  // Login via Telegram Login Widget (for browser users)
  const loginWithWidget = useCallback(
    async (widgetData: TelegramWidgetData, referralCode?: string) => {
      try {
        const res = await apiClient.post<AuthApiResponse>(
          ENDPOINTS.AUTH_TELEGRAM_WIDGET,
          {
            ...widgetData,
            referralCode,
          },
        )
        const { token: jwt, user } = res.data.data
        setToken(jwt)
        setUser(user)
        toast.success(`Добро пожаловать, ${user.firstName}!`)
      } catch (err: any) {
        console.error('[Auth] Widget login failed:', err)
        const message =
          err?.response?.data?.message || 'Не удалось авторизоваться через Telegram'
        toast.error(message)
        throw err
      }
    },
    [setToken, setUser],
  )

  return { isReady: authReady, token, loginWithWidget }
}