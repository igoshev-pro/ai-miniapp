'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'
import type {
  AdminModel,
  CreateModelPayload,
  ModelsFilters,
  ModelsListResponse,
  UpdateModelPayload,
} from '@/types/admin-model'

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

// ─── LIST ─────────────────────────────────────────────────────

export function useAdminModels(initialFilters: ModelsFilters = {}) {
  const [filters, setFilters] = useState<ModelsFilters>(initialFilters)
  const [items, setItems] = useState<AdminModel[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async (f: ModelsFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (f.search) params.search = f.search
      if (f.type) params.type = f.type
      if (f.isActive) params.isActive = f.isActive
      if (f.isPremium) params.isPremium = f.isPremium

      const { data } = await apiClient.get<ApiEnvelope<ModelsListResponse>>(
        ENDPOINTS.ADMIN_MODELS,
        { params },
      )
      setItems(data.data.items)
      setTotal(data.data.total)
    } catch (e) {
      const msg = isApiError(e) ? e.message : 'Ошибка загрузки моделей'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchModels(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return {
    items,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: () => fetchModels(filters),
    // локальные апдейты для optimistic UI
    patchLocal: (slug: string, patch: Partial<AdminModel>) =>
      setItems(prev => prev.map(m => (m.slug === slug ? { ...m, ...patch } : m))),
    removeLocal: (slug: string) =>
      setItems(prev => prev.filter(m => m.slug !== slug)),
    addLocal: (model: AdminModel) =>
      setItems(prev => [model, ...prev]),
  }
}

// ─── ACTIONS ──────────────────────────────────────────────────

export function useModelActions() {
  const [busy, setBusy] = useState(false)

  const update = useCallback(
    async (slug: string, payload: UpdateModelPayload): Promise<AdminModel | null> => {
      setBusy(true)
      try {
        const { data } = await apiClient.put<ApiEnvelope<AdminModel>>(
          ENDPOINTS.ADMIN_MODEL(slug),
          payload,
        )
        toast.success(`Модель "${data.data.displayName}" обновлена`)
        return data.data
      } catch (e) {
        toast.error(isApiError(e) ? e.message : 'Ошибка обновления')
        return null
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const toggle = useCallback(async (slug: string): Promise<AdminModel | null> => {
    setBusy(true)
    try {
      const { data } = await apiClient.post<ApiEnvelope<AdminModel>>(
        ENDPOINTS.ADMIN_MODEL_TOGGLE(slug),
      )
      toast.success(
        `"${data.data.displayName}" — ${data.data.isActive ? 'включена' : 'выключена'}`,
      )
      return data.data
    } catch (e) {
      toast.error(isApiError(e) ? e.message : 'Не удалось переключить')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const create = useCallback(
    async (payload: CreateModelPayload): Promise<AdminModel | null> => {
      setBusy(true)
      try {
        const { data } = await apiClient.post<ApiEnvelope<AdminModel>>(
          ENDPOINTS.ADMIN_MODELS,
          payload,
        )
        toast.success(`Модель "${data.data.displayName}" создана`)
        return data.data
      } catch (e) {
        toast.error(isApiError(e) ? e.message : 'Ошибка создания')
        return null
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const remove = useCallback(
    async (slug: string, hard = false): Promise<boolean> => {
      setBusy(true)
      try {
        await apiClient.delete(ENDPOINTS.ADMIN_MODEL(slug), {
          params: hard ? { hard: 'true' } : undefined,
        })
        toast.success(hard ? 'Модель удалена навсегда' : 'Модель деактивирована')
        return true
      } catch (e) {
        toast.error(isApiError(e) ? e.message : 'Ошибка удаления')
        return false
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  return { busy, update, toggle, create, remove }
}