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

/**
 * Проверяет, есть ли у текущего юзера доступ в админку.
 * Если нет — редирект на главную.
 */
export function useAdminAuth(): UseAdminAuthResult {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AdminCheckResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!token) {
        router.replace('/')
        return
      }

      try {
        const { data } = await apiClient.get<AdminCheckResponse>(
          ENDPOINTS.ADMIN_CHECK,
        )
        if (cancelled) return
        setUser(data)
      } catch (err) {
        if (cancelled) return
        if (isApiError(err) && (err.status === 401 || err.status === 403)) {
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
  }, [token, router])

  return {
    loading,
    isAdmin: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    role: user?.role ?? null,
    user,
  }
}