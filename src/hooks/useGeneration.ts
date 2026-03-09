// src/hooks/useGeneration.ts

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import {
  connectSocket,
  disconnectSocket,
  subscribeToGeneration,
  WS_EVENTS,
  type GenerationStatusEvent,
  type GenerationProgressEvent,
  type GenerationCompletedEvent,
  type GenerationFailedEvent,
} from '@/lib/ws'
import {
  useGenerationStore,
  type Generation,
  type GenerationType,
} from '@/stores/generation.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'
import { allModels } from '@/lib/data'

interface GenerationRequest {
  model: string
  prompt: string
  type: GenerationType
  settings?: Record<string, unknown>
}

interface GenerationResponse {
  generation: {
    id: string
    status: string
    tokensReserved: number
  }
}

export function useGeneration() {
  const store = useGenerationStore()
  const { token } = useAuthStore()
  const { user } = useUserStore()
  const wsConnected = useRef(false)
  const listenersAttached = useRef(false)

  // Подключаем WebSocket при наличии токена
  useEffect(() => {
    if (!token || wsConnected.current) return

    const socket = connectSocket(token)
    wsConnected.current = true

    // Не вешаем обработчики дважды
    if (listenersAttached.current) return
    listenersAttached.current = true

    // --- generation:status ---
    socket.on(WS_EVENTS.STATUS, (data: GenerationStatusEvent) => {
      console.log('[WS] status:', data)
      store.updateGeneration(data.generationId, {
        status: data.status,
      })
    })

    // --- generation:progress ---
    socket.on(WS_EVENTS.PROGRESS, (data: GenerationProgressEvent) => {
      store.updateGeneration(data.generationId, {
        status: 'processing',
        progress: data.progress,
      })
    })

    // --- generation:completed ---
    socket.on(WS_EVENTS.COMPLETED, (data: GenerationCompletedEvent) => {
      console.log('[WS] completed:', data)
      store.updateGeneration(data.generationId, {
        status: 'completed',
        progress: 100,
        // Бэкенд отдаёт массив URL-ов, берём первый для отображения
        resultUrl: data.resultUrls?.[0] || undefined,
      })
      toast.success('Генерация завершена! 🎉')
    })

    // --- generation:failed ---
    socket.on(WS_EVENTS.FAILED, (data: GenerationFailedEvent) => {
      console.log('[WS] failed:', data)
      store.updateGeneration(data.generationId, {
        status: 'failed',
        error: data.errorMessage,
      })
      toast.error(data.errorMessage || 'Ошибка генерации')
      if (data.refunded) {
        toast.info('Спички возвращены на баланс')
      }
    })

    return () => {
      socket.off(WS_EVENTS.STATUS)
      socket.off(WS_EVENTS.PROGRESS)
      socket.off(WS_EVENTS.COMPLETED)
      socket.off(WS_EVENTS.FAILED)
      listenersAttached.current = false
    }
  }, [token, store])

  // Отключение при размонтировании
  useEffect(() => {
    return () => {
      // Не отключаем — пусть живёт пока приложение открыто
      // disconnectSocket() — вызвать при logout
    }
  }, [])

  // Отправить запрос на генерацию
  const generate = useCallback(
    async (request: GenerationRequest): Promise<Generation | null> => {
      const modelData = allModels.find(
        (m) => m.slug === request.model || m.name === request.model,
      )
      const cost = modelData?.cost ?? 5

      // Проверка баланса
      if (user && user.totalBalance < cost) {
        toast.warning(
          `Недостаточно спичек. Нужно ${cost}, у вас ${user.totalBalance}`,
        )
        return null
      }

      // Выбираем эндпоинт по типу
      const endpointMap: Record<GenerationType, string> = {
        image: ENDPOINTS.GENERATION_IMAGE,
        video: ENDPOINTS.GENERATION_VIDEO,
        audio: ENDPOINTS.GENERATION_AUDIO,
      }

      try {
        const { data } = await apiClient.post<GenerationResponse>(
          endpointMap[request.type],
          {
            model: request.model,
            prompt: request.prompt,
            ...request.settings,
          },
        )

        const generation: Generation = {
          id: data.generation.id,
          type: request.type,
          model: modelData?.name || request.model,
          modelSlug: modelData?.slug || request.model,
          prompt: request.prompt,
          status: 'pending',
          progress: 0,
          settings: request.settings,
          createdAt: new Date().toISOString(),
        }

        store.addGeneration(generation)
        store.setActiveGeneration(generation)

        // Подписываемся на обновления этой генерации через WS
        subscribeToGeneration(data.generation.id)

        toast.info('Генерация запущена...')
        return generation
      } catch (err) {
        if (isApiError(err)) {
          if (err.isBalance) {
            toast.warning('Недостаточно спичек')
          } else if (err.isRateLimit) {
            toast.warning('Слишком много запросов, подождите')
          } else {
            toast.error(err.message || 'Ошибка при запуске генерации')
          }
        } else {
          toast.error('Ошибка соединения')
        }
        return null
      }
    },
    [user, store],
  )

  // Polling fallback — если WS не сработает
  const checkStatus = useCallback(
    async (generationId: string) => {
      try {
        const { data } = await apiClient.get<{
          status: string
          progress?: number
          resultUrls?: string[]
          errorMessage?: string
        }>(ENDPOINTS.GENERATION_STATUS(generationId))

        store.updateGeneration(generationId, {
          status: data.status as Generation['status'],
          progress: data.progress ?? 0,
          resultUrl: data.resultUrls?.[0],
          error: data.errorMessage,
        })
      } catch {
        // тихо
      }
    },
    [store],
  )

  return {
    generations: store.generations,
    activeGeneration: store.activeGeneration,
    setActiveGeneration: store.setActiveGeneration,
    generate,
    checkStatus,
    getByType: store.getByType,
  }
}