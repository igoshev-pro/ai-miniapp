import axios, {
  type InternalAxiosRequestConfig,
  type AxiosError,
  type AxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import { getInitData } from '@/lib/telegram'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Расширяем тип конфига для флага ретрая
interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean
}

// JWT в каждый запрос — берём из Zustand-стора (persist → localStorage)
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// «Голый» axios для переавторизации (без interceptors, чтобы не словить рекурсию)
async function reauthWithInitData(): Promise<string | null> {
  const initData = getInitData()
  if (!initData) return null

  try {
    const referralCode =
      typeof window !== 'undefined'
        ? localStorage.getItem('pending_referral_code') || undefined
        : undefined

    const res = await axios.post(
      `${API_BASE_URL}/auth/telegram`,
      { initData, referralCode },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const token = res.data?.data?.token as string | undefined
    if (token) {
      useAuthStore.getState().setToken(token)
      return token
    }
    return null
  } catch {
    return null
  }
}

// Обработка ошибок
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message
    const original = error.config as RetriableConfig | undefined

    // 503 — БД/auth временно недоступны. Токен НЕ трогаем.
    if (status === 503) {
      return Promise.reject(normalizeError(error))
    }

    // 401 — пробуем тихую переавторизацию (только Mini App, только один раз)
    if (status === 401 && original && !original._retried) {
      original._retried = true

      const newToken = await reauthWithInitData()
      if (newToken) {
        original.headers = original.headers || {}
        ;(original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`
        return apiClient(original) // retry оригинального запроса
      }

      // Браузер или переавторизация не удалась — чистим токен
      useAuthStore.getState().clearToken()
    }

    return Promise.reject(normalizeError(error))
  },
)

function normalizeError(error: AxiosError<{ message?: string }>): ApiError {
  const status = error.response?.status
  const message = error.response?.data?.message || error.message
  return {
    status: status || 0,
    message,
    isAuth: status === 401,
    isBalance: status === 402,
    isRateLimit: status === 429,
    isServer: !!status && status >= 500,
    isServiceUnavailable: status === 503,
  }
}

export interface ApiError {
  status: number
  message: string
  isAuth: boolean
  isBalance: boolean
  isRateLimit: boolean
  isServer: boolean
  isServiceUnavailable: boolean
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'isBalance' in err
}