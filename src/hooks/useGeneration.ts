// src/hooks/useGeneration.ts
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import {
  connectSocket,
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
import { useModelsStore } from '@/stores/models.store'
import { toast } from '@/stores/toast.store'
import { allModels as fallbackModels } from '@/lib/data'

interface GenerationRequest {
  model: string
  prompt: string
  type: GenerationType
  settings?: Record<string, unknown>
}

// Бэкенд возвращает: { success: true, data: { generationId, status, tokensCost } }
interface GenerationResponse {
  success: boolean
  data: {
    generationId: string
    status: string
    tokensCost: number
  }
}

export function useGeneration() {
  const store = useGenerationStore()
  const { token } = useAuthStore()
  const { user } = useUserStore()
  const modelsStore = useModelsStore()
  const wsConnected = useRef(false)
  const listenersAttached = useRef(false)

  useEffect(() => {
    if (!token || wsConnected.current) return

    const socket = connectSocket(token)
    wsConnected.current = true

    if (listenersAttached.current) return
    listenersAttached.current = true

    socket.on(WS_EVENTS.STATUS, (data: GenerationStatusEvent) => {
      console.log('[WS] status:', data)
      store.updateGeneration(data.generationId, { status: data.status })
    })

    socket.on(WS_EVENTS.PROGRESS, (data: GenerationProgressEvent) => {
      store.updateGeneration(data.generationId, {
        status: 'processing',
        progress: data.progress,
      })
    })

    socket.on(WS_EVENTS.COMPLETED, (data: GenerationCompletedEvent) => {
      console.log('[WS] completed:', data)
      store.updateGeneration(data.generationId, {
        status: 'completed',
        progress: 100,
        resultUrl: data.resultUrls?.[0] || undefined,
      })
      toast.success('Генерация завершена! 🎉')
    })

    socket.on(WS_EVENTS.FAILED, (data: GenerationFailedEvent) => {
      console.log('[WS] failed:', data)
      store.updateGeneration(data.generationId, {
        status: 'failed',
        error: data.errorMessage,
      })
      toast.error(data.errorMessage || 'Ошибка генерации')
      if (data.refunded) toast.info('Спички возвращены на баланс')
    })

    return () => {
      socket.off(WS_EVENTS.STATUS)
      socket.off(WS_EVENTS.PROGRESS)
      socket.off(WS_EVENTS.COMPLETED)
      socket.off(WS_EVENTS.FAILED)
      listenersAttached.current = false
    }
  }, [token, store])

  const generate = useCallback(
    async (request: GenerationRequest): Promise<Generation | null> => {
      // Ищем сначала в загруженных моделях, потом в fallback
      const allAvailable = modelsStore.isLoaded ? modelsStore.models : fallbackModels
      const modelData = allAvailable.find(
        (m) => m.slug === request.model || m.name === request.model,
      )
      const cost = modelData?.cost ?? 5

      if (user && user.totalBalance < cost) {
        toast.warning(`Недостаточно спичек. Нужно ${cost}, у вас ${user.totalBalance}`)
        return null
      }

      const endpointMap: Record<GenerationType, string> = {
        image: ENDPOINTS.GENERATION_IMAGE,
        video: ENDPOINTS.GENERATION_VIDEO,
        audio: ENDPOINTS.GENERATION_AUDIO,
      }

      // Получаем размеры из settings
      const settings = request.settings || {}
      const sizeStr = (settings.size as string) || '1024x1024'
      const [width, height] = sizeStr.split('x').map(Number)

      try {
        const { data } = await apiClient.post<GenerationResponse>(
          endpointMap[request.type],
          {
            modelSlug: modelData?.slug || request.model, // ← бэкенд ждёт modelSlug
            prompt: request.prompt,
            negativePrompt: settings.negativePrompt as string | undefined,
            width: width || 1024,
            height: height || 1024,
            style: settings.style as string | undefined,
            seed: settings.seed as number | undefined,
            numImages: (settings.count as number) || 1,
          },
        )

        // Бэкенд: { success: true, data: { generationId, status, tokensCost } }
        const generationId = data.data?.generationId
        if (!generationId) {
          toast.error('Неверный ответ сервера')
          return null
        }

        const generation: Generation = {
          id: generationId,
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
        subscribeToGeneration(generationId)

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
    [user, store, modelsStore],
  )

  const checkStatus = useCallback(
    async (generationId: string) => {
      try {
        const { data } = await apiClient.get<{
          success: boolean
          data: {
            status: string
            progress?: number
            resultUrls?: string[]
            errorMessage?: string
          }
        }>(ENDPOINTS.GENERATION_STATUS(generationId))

        const d = data.data
        store.updateGeneration(generationId, {
          status: d.status as Generation['status'],
          progress: d.progress ?? 0,
          resultUrl: d.resultUrls?.[0],
          error: d.errorMessage,
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