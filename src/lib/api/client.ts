// src/lib/api/client.ts

import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// JWT в каждый запрос
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('jwt')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Обработка ошибок
apiClient.interceptors.response.use(
  (res: any) => res,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message

    return Promise.reject({
      status: status || 0,
      message,
      isBalance: status === 402,
      isRateLimit: status === 429,
      isServer: !!status && status >= 500,
    } satisfies ApiError)
  },
)

export interface ApiError {
  status: number
  message: string
  isBalance: boolean
  isRateLimit: boolean
  isServer: boolean
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'isBalance' in err
}