// src/hooks/useFavorites.ts

'use client'

import { useCallback, useState } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

interface ToggleResult {
  isFavorite: boolean
}

interface ToggleResponse {
  success: boolean
  data: ToggleResult
}

// Локальный кеш чтобы не дёргать API на каждый рендер
const favoriteCache = new Map<string, boolean>()

export function useFavorites() {
  const [loading, setLoading] = useState(false)

  const getCacheKey = (type: string, itemId: string) => `${type}:${itemId}`

  const isFavorite = useCallback((type: string, itemId: string): boolean | undefined => {
    return favoriteCache.get(getCacheKey(type, itemId))
  }, [])

  const toggle = useCallback(async (
    type: string,
    itemId: string,
    title?: string,
    previewUrl?: string,
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const { data } = await apiClient.post<ToggleResponse>(ENDPOINTS.FAVORITES_TOGGLE, {
        type,
        itemId,
        title,
        previewUrl,
      })

      const result = data.data?.isFavorite ?? false
      favoriteCache.set(getCacheKey(type, itemId), result)

      if (result) {
        toast.success('Добавлено в избранное')
      } else {
        toast.info('Удалено из избранного')
      }

      return result
    } catch (err) {
      if (isApiError(err)) {
        toast.error(err.message || 'Ошибка')
      }
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Проставить из загруженного списка
  const setCache = useCallback((type: string, itemId: string, value: boolean) => {
    favoriteCache.set(getCacheKey(type, itemId), value)
  }, [])

  return {
    toggle,
    isFavorite,
    setCache,
    loading,
  }
}