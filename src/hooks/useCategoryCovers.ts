// src/hooks/useCategoryCovers.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'

type CategoryId = 'text' | 'image' | 'video' | 'audio'

interface CategoryCover {
  categoryId: CategoryId
  imageUrl: string
  updatedAt?: string
}

type CoversMap = Record<CategoryId, string>

// Дефолтные обложки (текущий хардкод из Categories.tsx)
const FALLBACK_COVERS: CoversMap = {
  text: '/covers/text.webp',
  image: '/covers/image.webp',
  video: '/covers/video.webp',
  audio: '/covers/audio.webp',
}

/**
 * Возвращает URL-ы обложек категорий.
 * Если бэкенд недоступен или для категории не задана своя обложка —
 * используется fallback на /covers/*.webp
 */
export function useCategoryCovers(): { covers: CoversMap; isLoaded: boolean } {
  const [covers, setCovers] = useState<CoversMap>(FALLBACK_COVERS)
  const [isLoaded, setIsLoaded] = useState(false)
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    let cancelled = false

    apiClient
      .get<{ success: boolean; data: Record<CategoryId, CategoryCover | null> }>(
        ENDPOINTS.CATEGORY_COVERS,
      )
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data
        if (!data) {
          setIsLoaded(true)
          return
        }
        // Сливаем с fallback'ом — если для категории нет записи, остаётся дефолт
        const merged: CoversMap = { ...FALLBACK_COVERS }
        ;(['text', 'image', 'video', 'audio'] as CategoryId[]).forEach((id) => {
          if (data[id]?.imageUrl) {
            merged[id] = data[id]!.imageUrl
          }
        })
        setCovers(merged)
        setIsLoaded(true)
      })
      .catch(() => {
        // Тихо игнорируем — оставляем fallback
        if (!cancelled) setIsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { covers, isLoaded }
}