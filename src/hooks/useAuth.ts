'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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

function extractReferralCode(webApp: any): string | undefined {
  let referralCode: string | undefined

  const startParam: string | undefined = webApp?.initDataUnsafe?.start_param
  if (startParam) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Got start_param from Telegram:', startParam)
    }
    referralCode = startParam.startsWith('ref_')
      ? startParam.substring(4)
      : startParam
  }

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

  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist?.hasHydrated() ?? true,
  )

  useEffect(() => {
    if (hydrated) return
    const unsub = useAuthStore.persist?.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist?.hasHydrated()) setHydrated(true)
    return unsub
  }, [hydrated])

  useEffect(() => {
    if (!isReady || !hydrated || attempted.current) return
    attempted.current = true

    // ✅ Если токен уже восстановлен из localStorage — не дёргаем бэк
    if (token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Token restored from storage — skipping login')
      }
      setReady()
      return
    }

    const initData = webApp?.initData

    if (!initData) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Auth] No initData — not in Telegram, waiting for widget login',
        )
      }
      setReady()
      return
    }

    const referralCode = extractReferralCode(webApp)

    if (process.env.NODE_ENV === 'development' && referralCode) {
      console.log('[Auth] Sending auth with referralCode:', referralCode)
    }

    apiClient
      .post<AuthApiResponse>(ENDPOINTS.AUTH_TELEGRAM, {
        initData,
        referralCode,
      })
      .then((res) => {
        const { token: jwt, user } = res.data.data
        setToken(jwt)
        setUser(user)
        clearPendingReferral()
      })
      .catch((err) => {
        console.error('[Auth] Failed:', err)
        // 🆕 503 — временный сбой БД/auth, НЕ показываем ошибку логина
        if (err?.isServiceUnavailable) {
          toast.error('Сервис временно недоступен, попробуйте позже')
        } else {
          toast.error('Не удалось авторизоваться')
        }
        setReady()
      })
  }, [isReady, hydrated, token, webApp, setToken, setUser, setReady])

  const loginWithWidget = useCallback(
    async (widgetData: TelegramWidgetData, referralCode?: string) => {
      try {
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
          err?.message ||
          err?.response?.data?.message ||
          'Не удалось авторизоваться через Telegram'
        toast.error(message)
        throw err
      }
    },
    [webApp, setToken, setUser],
  )

  /**
   * Общий хвост для входа по почте: положить токен, профиль, поздороваться.
   * Вынесено, чтобы регистрация и вход не расходились в поведении.
   */
  const applyAuth = useCallback(
    (data: { token: string; user: UserProfile }, greeting: string) => {
      setToken(data.token)
      setUser(data.user)
      clearPendingReferral()
      toast.success(greeting)
    },
    [setToken, setUser],
  )

  /**
   * Ошибку показываем ту, что прислал сервер: там осмысленные тексты
   * («аккаунт уже существует», «неверная почта или пароль»), и подменять
   * их общей фразой — значит прятать от человека суть проблемы.
   */
  const errorText = (err: any, fallback: string): string =>
    err?.response?.data?.message || err?.message || fallback

  const registerWithEmail = useCallback(
    async (params: { email: string; password: string; firstName?: string }) => {
      try {
        const referralCode = extractReferralCode(webApp)
        const res = await apiClient.post<AuthApiResponse>(
          ENDPOINTS.AUTH_REGISTER,
          { ...params, referralCode },
        )
        applyAuth(res.data.data, 'Аккаунт создан. Добро пожаловать!')
      } catch (err: any) {
        toast.error(errorText(err, 'Не удалось создать аккаунт'))
        throw err
      }
    },
    [webApp, applyAuth],
  )

  const loginWithEmail = useCallback(
    async (params: { email: string; password: string }) => {
      try {
        const res = await apiClient.post<AuthApiResponse>(
          ENDPOINTS.AUTH_LOGIN,
          params,
        )
        applyAuth(res.data.data, `С возвращением, ${res.data.data.user.firstName || ''}!`.trim())
      } catch (err: any) {
        toast.error(errorText(err, 'Не удалось войти'))
        throw err
      }
    },
    [applyAuth],
  )

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      await apiClient.post(ENDPOINTS.AUTH_PASSWORD_FORGOT, { email })
      // Ответ намеренно одинаковый и для известной, и для неизвестной почты.
      toast.success('Если такая почта зарегистрирована, письмо уже отправлено')
    } catch (err: any) {
      toast.error(errorText(err, 'Не удалось отправить письмо'))
      throw err
    }
  }, [])

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      try {
        const res = await apiClient.post<AuthApiResponse>(
          ENDPOINTS.AUTH_PASSWORD_RESET,
          { token, password },
        )
        applyAuth(res.data.data, 'Пароль изменён')
      } catch (err: any) {
        toast.error(errorText(err, 'Не удалось изменить пароль'))
        throw err
      }
    },
    [applyAuth],
  )

  return {
    isReady: authReady,
    token,
    loginWithWidget,
    registerWithEmail,
    loginWithEmail,
    requestPasswordReset,
    resetPassword,
  }
}