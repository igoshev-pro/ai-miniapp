'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'

export type AdminRole = 'admin' | 'super_admin'

interface AdminCheckResponse {
  ok: boolean
  role: AdminRole
  telegramId: number
  username?: string
  userId: string
}

interface UseAdminAuthResult {
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  role: AdminRole | null
  user: AdminCheckResponse | null
}

export function useAdminAuth(): UseAdminAuthResult {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AdminCheckResponse | null>(null)

  // Ждём гидратации Zustand-стора (persist подтягивается из localStorage асинхронно).
  // Без этого первый рендер видит token === null и редиректит на '/'.
  useEffect(() => {
    // Если persist уже завершён — сразу true
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => {
      setHydrated(true)
    })

    // Если стор уже гидрирован к моменту монтирования
    if (useAuthStore.persist?.hasHydrated?.()) {
      setHydrated(true)
    }

    // Фолбэк: если persist API недоступен (например, без middleware) — считаем гидратированным сразу
    if (!useAuthStore.persist) {
      setHydrated(true)
    }

    return () => {
      unsub?.()
    }
  }, [])

  // Основная проверка прав
  useEffect(() => {
    if (!hydrated) return

    let cancelled = false

    async function check() {
      // Стор гидрирован, но токена нет → не админ
      if (!token) {
        console.warn('[useAdminAuth] no token after hydration → redirect /')
        router.replace('/')
        return
      }

      try {
        const { data } = await apiClient.get<AdminCheckResponse>(
          ENDPOINTS.ADMIN_CHECK,
        )

        if (cancelled) return
        console.log('[useAdminAuth] check ok:', data)

        if (!data?.ok) {
          console.warn('[useAdminAuth] data.ok=false → redirect /')
          router.replace('/')
          return
        }

        setUser(data)
      } catch (err) {
        if (cancelled) return
        console.error('[useAdminAuth] check failed:', err)
        if (isApiError(err) && (err.status === 401 || err.status === 403)) {
          router.replace('/')
        } else {
          router.replace('/')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [hydrated, token, router])

  return {
    loading: loading || !hydrated,
    isAdmin: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    role: user?.role ?? null,
    user,
  }
}