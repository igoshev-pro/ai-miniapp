// src/hooks/useGeneration.ts
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import {
  connectSocket,
  getSocket,
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

function mapBackendGeneration(g: any): Generation {
  return {
    id: g.id || g._id,
    type: g.type,
    model: g.modelSlug,
    modelSlug: g.modelSlug,
    prompt: g.prompt || '',
    status: g.status,
    progress: g.status === 'completed' ? 100 : g.progress || 0,
    resultUrl: g.resultUrls?.[0],
    resultUrls: g.resultUrls,
    tokensUsed: g.tokensCost,
    isFavorite: g.isFavorite,
    error: g.errorMessage,
    settings: g.params,
    createdAt: g.createdAt || new Date().toISOString(),
  }
}

export function useGeneration() {
  const store = useGenerationStore()
  const { token } = useAuthStore()
  const { user } = useUserStore()
  const modelsStore = useModelsStore()
  const pollingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const wsSetup = useRef(false)
  const historyLoadAttempted = useRef(false)

  const shownToasts = useRef<Set<string>>(new Set())

  // ─── Загрузка истории ───────────────────────────
  useEffect(() => {
    if (!token || store.historyLoaded || historyLoadAttempted.current) return
    historyLoadAttempted.current = true

    const loadHistory = async () => {
      try {
        const { data } = await apiClient.get<{
          success: boolean
          data: {
            generations: any[]
            pagination: any
          }
        }>(ENDPOINTS.GENERATION_HISTORY, { params: { limit: 50 } })

        const mapped = data.data.generations.map(mapBackendGeneration)
        store.mergeHistory(mapped)
        store.setHistoryLoaded(true)

        // Подписываемся на незавершённые
        mapped
          .filter((g) => g.status === 'pending' || g.status === 'processing')
          .forEach((g) => {
            subscribeToGeneration(g.id)
            startPolling(g.id)
          })
      } catch (err) {
        console.error('[Generation] Failed to load history:', err)
      }
    }

    loadHistory()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WebSocket — подключение и слушатели ──────────────────
  useEffect(() => {
    if (!token || wsSetup.current) return
    wsSetup.current = true

    const socket = connectSocket(token)

    const handleStatus = (data: GenerationStatusEvent) => {
      console.log('[WS] generation:status →', data)
      useGenerationStore.getState().updateGeneration(data.generationId, {
        status: data.status,
      })
    }

    const handleProgress = (data: GenerationProgressEvent) => {
      console.log('[WS] generation:progress →', data)
      useGenerationStore.getState().updateGeneration(data.generationId, {
        status: 'processing',
        progress: data.progress,
      })
    }

    const handleCompleted = (data: GenerationCompletedEvent) => {
      console.log('[WS] generation:completed →', data)

      const timer = pollingTimers.current.get(data.generationId)
      if (timer) {
        clearTimeout(timer)
        pollingTimers.current.delete(data.generationId)
      }

      useGenerationStore.getState().updateGeneration(data.generationId, {
        status: 'completed',
        progress: 100,
        resultUrl: data.resultUrls?.[0] || undefined,
        resultUrls: data.resultUrls,
      })

      if (!shownToasts.current.has(data.generationId)) {
        shownToasts.current.add(data.generationId)
        toast.success('Генерация завершена! 🎉')
      }
    }

    const handleFailed = (data: GenerationFailedEvent) => {
      console.log('[WS] generation:failed →', data)

      const timer = pollingTimers.current.get(data.generationId)
      if (timer) {
        clearTimeout(timer)
        pollingTimers.current.delete(data.generationId)
      }

      useGenerationStore.getState().updateGeneration(data.generationId, {
        status: 'failed',
        error: data.errorMessage,
      })

      // Дедупликация тостов — показываем только раз
      if (!shownToasts.current.has(data.generationId)) {
        shownToasts.current.add(data.generationId)
        toast.error(data.errorMessage || 'Ошибка генерации')
        if (data.refunded) toast.info('Спички возвращены на баланс')
      }
    }

    socket.on(WS_EVENTS.STATUS, handleStatus)
    socket.on(WS_EVENTS.PROGRESS, handleProgress)
    socket.on(WS_EVENTS.COMPLETED, handleCompleted)
    socket.on(WS_EVENTS.FAILED, handleFailed)

    return () => {
      socket.off(WS_EVENTS.STATUS, handleStatus)
      socket.off(WS_EVENTS.PROGRESS, handleProgress)
      socket.off(WS_EVENTS.COMPLETED, handleCompleted)
      socket.off(WS_EVENTS.FAILED, handleFailed)
      wsSetup.current = false
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Polling fallback — быстрый старт ────────────────────
  const startPolling = useCallback(
    (generationId: string) => {
      if (pollingTimers.current.has(generationId)) return

      let attempts = 0
      const maxAttempts = 120 // 10 минут при 5с интервале

      const poll = async () => {
        attempts++

        // Проверяем — может WS уже обновил статус
        const current = useGenerationStore.getState().generations.find(
          (g) => g.id === generationId,
        )
        if (current?.status === 'completed' || current?.status === 'failed') {
          console.log(`[Polling] ${generationId} already ${current.status}, stopping`)
          pollingTimers.current.delete(generationId)
          return
        }

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
          console.log(`[Polling] ${generationId} attempt ${attempts}:`, d)

          useGenerationStore.getState().updateGeneration(generationId, {
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
        } catch (err) {
          console.warn(`[Polling] Error for ${generationId}:`, err)
        }

        // Следующий poll
        if (attempts < maxAttempts) {
          // Адаптивный интервал: первые 6 опросов через 3с, потом 5с
          const interval = attempts <= 6 ? 3000 : 5000
          const timer = setTimeout(poll, interval)
          pollingTimers.current.set(generationId, timer)
        } else {
          console.warn(`[Polling] Max attempts reached for ${generationId}`)
          pollingTimers.current.delete(generationId)
        }
      }

      // Первый poll через 3 секунды (не 15!)
      const timer = setTimeout(poll, 3000)
      pollingTimers.current.set(generationId, timer)
    },
    [],
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

      const s = request.settings || {}

      const body: Record<string, unknown> = {
        modelSlug: modelData?.slug || request.model,
        prompt: request.prompt,
      }

      if (request.type === 'image') {
        if (s.aspectRatio) body.aspectRatio = s.aspectRatio
        if (s.resolution) body.resolution = s.resolution
        if (s.quality) body.quality = s.quality
        if (s.outputFormat) body.outputFormat = s.outputFormat
        if (s.negativePrompt) body.negativePrompt = s.negativePrompt
        if (s.seed !== undefined) body.seed = s.seed
        if (s.style) body.style = s.style
        if (s.inputUrls && (s.inputUrls as string[]).length > 0) {
          body.inputUrls = s.inputUrls
        }
        body.numImages = (s.count as number) || 1
      }

      if (request.type === 'video') {
        if (s.aspectRatio) body.aspectRatio = s.aspectRatio
        if (s.resolution) body.resolution = s.resolution
        if (s.duration) body.duration = s.duration
        if (s.imageUrl) body.imageUrl = s.imageUrl
        if (s.imageUrls && (s.imageUrls as string[]).length > 0) {
          body.imageUrls = s.imageUrls
        }
        if (s.style) body.style = s.style
        if (s.mode) body.mode = s.mode
        if (s.quality) body.quality = s.quality
        if (s.sound !== undefined) body.sound = s.sound
        if (s.removeWatermark !== undefined) body.removeWatermark = s.removeWatermark
        if (s.promptOptimizer !== undefined) body.promptOptimizer = s.promptOptimizer
        if (s.waterMark !== undefined) body.waterMark = s.waterMark
      }

      if (request.type === 'audio') {
        if (s.style) body.style = s.style
        if (s.duration) body.duration = s.duration
        if (s.instrumental !== undefined) body.instrumental = s.instrumental
        if (s.voiceId) body.voiceId = s.voiceId
        if (s.language) body.language = s.language
      }

      try {
        const { data } = await apiClient.post<GenerationResponse>(
          endpointMap[request.type],
          body,
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

        // Подписка + polling одновременно
        subscribeToGeneration(generationId)
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

  // ─── checkStatus ─────────────────────────────────────────────
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

  // ─── toggleFavorite ──────────────────────────────────────────
  const toggleFavorite = useCallback(
    async (generationId: string) => {
      try {
        const { data } = await apiClient.put<{
          success: boolean
          data: { isFavorite: boolean }
        }>(ENDPOINTS.GENERATION_FAVORITE(generationId))

        store.updateGeneration(generationId, {
          isFavorite: data.data.isFavorite,
        })
        toast.success(data.data.isFavorite ? 'Добавлено в избранное ⭐' : 'Удалено из избранного')
      } catch {
        toast.error('Ошибка')
      }
    },
    [store],
  )

  return {
    generations: store.generations,
    activeGeneration: store.activeGeneration,
    historyLoaded: store.historyLoaded,
    setActiveGeneration: store.setActiveGeneration,
    generate,
    checkStatus,
    toggleFavorite,
    getByType: store.getByType,
  }
}