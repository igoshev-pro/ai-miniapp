'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/stores'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'

type Status = 'idle' | 'pending' | 'confirmed' | 'expired' | 'error'

const REFERRAL_STORAGE_KEY = 'pending_referral_code'

interface BotInitResponse {
  success: boolean
  data: { code: string; deepLink: string; ttl: number }
}

interface BotPollResponse {
  success: boolean
  data: {
    status: 'pending' | 'confirmed' | 'expired'
    token?: string
    user?: any
  }
}

export function useBotAuth() {
  const [status, setStatus] = useState<Status>('idle')
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  // чистим таймер при размонтировании
  useEffect(() => stop, [stop])

  const start = useCallback(
    async (referralCode?: string) => {
      stop()
      setStatus('pending')

      // реферальный код: аргумент → localStorage
      const effectiveRef =
        referralCode ||
        (typeof window !== 'undefined'
          ? localStorage.getItem(REFERRAL_STORAGE_KEY) || undefined
          : undefined)

      try {
        const res = await apiClient.post<BotInitResponse>('/auth/bot/init', {
          referralCode: effectiveRef,
        })

        const { code, deepLink: link, ttl } = res.data.data
        setDeepLink(link)

        // открываем бота в новой вкладке
        if (typeof window !== 'undefined') {
          window.open(link, '_blank')
        }

        const deadline = Date.now() + (ttl ?? 300) * 1000

        pollTimer.current = setInterval(async () => {
          if (Date.now() > deadline) {
            stop()
            setStatus('expired')
            return
          }

          try {
            const poll = await apiClient.get<BotPollResponse>(
              `/auth/bot/poll/${code}`,
            )
            const data = poll.data.data

            if (data.status === 'confirmed' && data.token) {
              stop()
              useAuthStore.getState().setToken(data.token)
              if (data.user) {
                try {
                  useUserStore.getState().setUser(data.user)
                } catch {}
              }
              setStatus('confirmed')
              try {
                localStorage.removeItem(REFERRAL_STORAGE_KEY)
              } catch {}
              toast.success('Вход выполнен')
            } else if (data.status === 'expired') {
              stop()
              setStatus('expired')
            }
            // pending — продолжаем поллинг
          } catch {
            // временная ошибка сети — не прерываем поллинг
          }
        }, 2000)
      } catch {
        setStatus('error')
        toast.error('Не удалось начать вход')
      }
    },
    [stop],
  )

  const reset = useCallback(() => {
    stop()
    setStatus('idle')
    setDeepLink(null)
  }, [stop])

  return { status, deepLink, start, stop, reset }
}