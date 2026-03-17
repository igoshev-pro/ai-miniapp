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
  // Храним таймеры polling чтобы не дублировать
  const pollingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ─── WebSocket ───────────────────────────────────────────────
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
      // Останавливаем polling если он был запущен
      const timer = pollingTimers.current.get(data.generationId)
      if (timer) {
        clearTimeout(timer)
        pollingTimers.current.delete(data.generationId)
      }
      store.updateGeneration(data.generationId, {
        status: 'completed',
        progress: 100,
        resultUrl: data.resultUrls?.[0] || undefined,
        resultUrls: data.resultUrls,
      })
      toast.success('Генерация завершена! 🎉')
    })

    socket.on(WS_EVENTS.FAILED, (data: GenerationFailedEvent) => {
      console.log('[WS] failed:', data)
      const timer = pollingTimers.current.get(data.generationId)
      if (timer) {
        clearTimeout(timer)
        pollingTimers.current.delete(data.generationId)
      }
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

  // ─── Polling fallback ────────────────────────────────────────
  // Запускается через 15 сек после старта генерации
  // Продолжает пока статус не completed/failed (макс 5 минут)
  const startPolling = useCallback(
    (generationId: string) => {
      let attempts = 0
      const maxAttempts = 60 // 60 × 5сек = 5 минут

      const poll = async () => {
        attempts++

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
          console.log(`[Poll] ${generationId} attempt=${attempts} status=${d.status}`)

          // Если WS уже обновил — прекращаем
          const current = useGenerationStore.getState().generations.find(
            (g) => g.id === generationId,
          )
          if (current?.status === 'completed' || current?.status === 'failed') {
            pollingTimers.current.delete(generationId)
            return
          }

          // Обновляем стор
          store.updateGeneration(generationId, {
            status: d.status as Generation['status'],
            progress: d.progress ?? 0,
            resultUrl: d.resultUrls?.[0],
            resultUrls: d.resultUrls,
            error: d.errorMessage,
          })

          if (d.status === 'completed') {
            toast.success('Генерация завершена! 🎉')
            pollingTimers.current.delete(generationId)
            return
          }

          if (d.status === 'failed') {
            toast.error(d.errorMessage || 'Ошибка генерации')
            pollingTimers.current.delete(generationId)
            return
          }

          // Продолжаем polling
          if (attempts < maxAttempts) {
            const timer = setTimeout(poll, 5000)
            pollingTimers.current.set(generationId, timer)
          }
        } catch {
          if (attempts < maxAttempts) {
            const timer = setTimeout(poll, 5000)
            pollingTimers.current.set(generationId, timer)
          }
        }
      }

      // Первый запрос через 15 секунд (даём время WS)
      const timer = setTimeout(poll, 15000)
      pollingTimers.current.set(generationId, timer)
    },
    [store],
  )

  // ─── generate ────────────────────────────────────────────────
  const generate = useCallback(
    async (request: GenerationRequest): Promise<Generation | null> => {
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

      const settings = request.settings || {}
      const sizeStr = (settings.size as string) || '1024x1024'
      const [width, height] = sizeStr.split('x').map(Number)

      try {
        const { data } = await apiClient.post<GenerationResponse>(
          endpointMap[request.type],
          {
            modelSlug: modelData?.slug || request.model,
            prompt: request.prompt,
            negativePrompt: settings.negativePrompt as string | undefined,
            width: width || 1024,
            height: height || 1024,
            style: settings.style as string | undefined,
            seed: settings.seed as number | undefined,
            numImages: (settings.count as number) || 1,
          },
        )

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

        // ← Запускаем polling fallback на случай если WS не дойдёт
        startPolling(generationId)

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
    [user, store, modelsStore, startPolling],
  )

  // ─── checkStatus (ручной) ────────────────────────────────────
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
          resultUrls: d.resultUrls,
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