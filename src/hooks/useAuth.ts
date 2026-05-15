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

const REFERRAL_STORAGE_KEY = 'pending_referral_code'

/**
 * Извлекает реферальный код из всех возможных источников:
 *  1. Telegram WebApp start_param (когда юзер открыл бот по ссылке ?start=ref_XXX)
 *  2. URL query (?ref=XXX или ?referral=XXX) — для браузера
 *  3. localStorage (фолбэк, если первая попытка авторизации упала)
 */
function extractReferralCode(webApp: any): string | undefined {
  let referralCode: string | undefined

  // 1. Telegram WebApp start_param
  const startParam: string | undefined = webApp?.initDataUnsafe?.start_param
  if (startParam) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Got start_param from Telegram:', startParam)
    }
    // Поддерживаем оба формата: "ref_ABCD" и просто "ABCD"
    referralCode = startParam.startsWith('ref_')
      ? startParam.substring(4)
      : startParam
  }

  // 2. URL query params (для браузерной версии)
  if (!referralCode && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const refParam = urlParams.get('ref') || urlParams.get('referral')
      if (refParam) {
        referralCode = refParam
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Got referralCode from URL:', referralCode)
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. localStorage fallback (на случай если первая попытка авторизации упала)
  if (!referralCode && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(REFERRAL_STORAGE_KEY)
      if (saved) {
        referralCode = saved
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Restored referralCode from storage:', referralCode)
        }
      }
    } catch {
      // ignore
    }
  }

  // Сохраняем в storage, чтобы пережить возможную перезагрузку до того как авторизация пройдёт
  if (referralCode && typeof window !== 'undefined') {
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode)
    } catch {
      // ignore
    }
  }

  return referralCode?.toUpperCase()
}

function clearPendingReferral() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REFERRAL_STORAGE_KEY)
    } catch {
      // ignore
    }
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

    // No initData — not in Telegram, wait for widget login
    if (!initData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] No initData — not in Telegram, waiting for widget login')
      }
      setReady()
      return
    }

    // Извлекаем реферальный код из всех источников
    const referralCode = extractReferralCode(webApp)

    if (process.env.NODE_ENV === 'development' && referralCode) {
      console.log('[Auth] Sending auth with referralCode:', referralCode)
    }

    // Exchange initData → JWT
    apiClient
      .post<AuthApiResponse>(ENDPOINTS.AUTH_TELEGRAM, {
        initData,
        referralCode,
      })
      .then((res) => {
        const { token: jwt, user } = res.data.data
        setToken(jwt)
        setUser(user)
        // Успешно авторизовались — чистим pending
        clearPendingReferral()
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
        // Если referralCode не передали явно — берём из всех источников
        const effectiveRefCode = referralCode || extractReferralCode(webApp)

        const res = await apiClient.post<AuthApiResponse>(
          ENDPOINTS.AUTH_TELEGRAM_WIDGET,
          {
            ...widgetData,
            referralCode: effectiveRefCode,
          },
        )
        const { token: jwt, user } = res.data.data
        setToken(jwt)
        setUser(user)
        clearPendingReferral()
        toast.success(`Добро пожаловать, ${user.firstName}!`)
      } catch (err: any) {
        console.error('[Auth] Widget login failed:', err)
        const message =
          err?.response?.data?.message || 'Не удалось авторизоваться через Telegram'
        toast.error(message)
        throw err
      }
    },
    [webApp, setToken, setUser],
  )

  return { isReady: authReady, token, loginWithWidget }
}