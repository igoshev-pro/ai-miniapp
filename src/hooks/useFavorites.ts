// src/hooks/useFavorites.ts

'use client'

import { useCallback } from 'react'
import { create } from 'zustand'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

// ─── Реактивный store для состояния избранного ─────────
interface FavoritesState {
  cache: Record<string, boolean>  // "type:itemId" → true/false
  set: (key: string, value: boolean) => void
  get: (key: string) => boolean | undefined
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  cache: {},
  set: (key, value) => set((s) => ({ cache: { ...s.cache, [key]: value } })),
  get: (key) => get().cache[key],
}))

// ─── Hook ───────────────────────────────────────────────

export function useFavorites() {
  const cache = useFavoritesStore((s) => s.cache)
  const setCache = useFavoritesStore((s) => s.set)

  const getCacheKey = (type: string, itemId: string) => `${type}:${itemId}`

  const isFavorite = useCallback(
    (type: string, itemId: string): boolean => {
      return cache[getCacheKey(type, itemId)] ?? false
    },
    [cache],
  )

  const toggle = useCallback(
    async (
      type: string,
      itemId: string,
      title?: string,
      previewUrl?: string,
    ): Promise<boolean> => {
      // Оптимистичное обновление
      const key = getCacheKey(type, itemId)
      const currentValue = cache[key] ?? false
      const newValue = !currentValue
      setCache(key, newValue)

      try {
        const { data } = await apiClient.post<{ success: boolean; data: { isFavorite: boolean } }>(
          ENDPOINTS.FAVORITES_TOGGLE,
          { type, itemId, title, previewUrl },
        )

        const serverValue = data.data?.isFavorite ?? newValue
        setCache(key, serverValue)

        if (serverValue) {
          toast.success('Добавлено в избранное')
        } else {
          toast.info('Удалено из избранного')
        }

        return serverValue
      } catch (err) {
        // Откат при ошибке
        setCache(key, currentValue)
        if (isApiError(err)) {
          toast.error(err.message || 'Ошибка')
        }
        return currentValue
      }
    },
    [cache, setCache],
  )

  const setCacheValue = useCallback(
    (type: string, itemId: string, value: boolean) => {
      setCache(getCacheKey(type, itemId), value)
    },
    [setCache],
  )

  return {
    toggle,
    isFavorite,
    setCache: setCacheValue,
  }
}