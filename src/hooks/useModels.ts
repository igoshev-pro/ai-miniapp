// src/hooks/useModels.ts

'use client'

import { useCallback } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { useModelsStore } from '@/stores/models.store'
import {
  allModels as fallbackModels,
  modelCategories as fallbackCategories,
  type ModelItem,
} from '@/lib/data'

interface BackendModel {
  slug: string
  name: string
  type: 'text' | 'image' | 'video' | 'audio'
  provider?: string
  description?: string
  costPerUse?: number
  isActive?: boolean
  // Бекенд может возвращать доп. поля
  providers?: Array<{ slug: string; priority: number }>
  capabilities?: Record<string, unknown>
}

interface ModelsResponse {
  success: boolean
  data: BackendModel[] | { models: BackendModel[] }
}

function mapBackendModel(m: BackendModel, index: number): ModelItem {
  return {
    id: `${m.type[0]}${index + 1}`,
    name: m.name,
    slug: m.slug,
    provider: m.provider || guessProvider(m.slug),
    category: m.type,
    description: m.description || '',
    cost: m.costPerUse ?? guessCost(m.type),
  }
}

// Fallback провайдер если бекенд не вернул
function guessProvider(slug: string): string {
  if (slug.includes('gpt') || slug.includes('dall-e') || slug.includes('chatgpt') || slug === 'sora')
    return 'OpenAI'
  if (slug.includes('claude')) return 'Anthropic'
  if (slug.includes('gemini') || slug.includes('imagen') || slug.includes('veo'))
    return 'Google'
  if (slug.includes('deepseek')) return 'DeepSeek'
  if (slug.includes('grok')) return 'xAI'
  if (slug.includes('perplexity')) return 'Perplexity'
  if (slug.includes('qwen')) return 'Alibaba'
  if (slug.includes('midjourney')) return 'Midjourney'
  if (slug.includes('flux')) return 'Black Forest'
  if (slug.includes('stable')) return 'Stability'
  if (slug.includes('runway')) return 'Runway'
  if (slug.includes('suno')) return 'Suno'
  if (slug.includes('eleven')) return 'ElevenLabs'
  return 'AI'
}

function guessCost(type: string): number {
  switch (type) {
    case 'text': return 1
    case 'image': return 5
    case 'video': return 20
    case 'audio': return 5
    default: return 1
  }
}

export function useModels() {
  const store = useModelsStore()

  const loadModels = useCallback(async () => {
    if (store.isLoaded || store.isLoading) return

    store.setLoading(true)

    try {
      const { data } = await apiClient.get<ModelsResponse>(ENDPOINTS.MODELS)

      // Бекенд может вернуть массив или { models: [] }
      const rawModels: BackendModel[] = Array.isArray(data.data)
        ? data.data
        : (data.data as any)?.models || []

      // Фильтруем только активные
      const activeModels = rawModels.filter((m) => m.isActive !== false)

      if (activeModels.length > 0) {
        const mapped = activeModels.map(mapBackendModel)
        store.setModels(mapped)
        console.log(`[useModels] Loaded ${mapped.length} models from backend`)
      } else {
        // Бекенд вернул пустой список — используем fallback
        console.warn('[useModels] Backend returned 0 models, using fallback')
        store.setModels(fallbackModels)
      }
    } catch (err) {
      // Бекенд недоступен — используем fallback из data.ts
      console.warn('[useModels] Failed to load from backend, using fallback:', err)
      store.setModels(fallbackModels)
    }
  }, [store])

  return {
    models: store.isLoaded ? store.models : fallbackModels,
    categories: store.isLoaded ? store.categories : fallbackCategories,
    isLoaded: store.isLoaded,
    isLoading: store.isLoading,
    loadModels,
  }
}