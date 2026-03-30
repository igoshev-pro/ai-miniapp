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
  displayName?: string
  type: 'text' | 'image' | 'video' | 'audio'
  provider?: string
  description?: string
  cost?: number
  minCost?: number
  hasVariants?: boolean
  isActive?: boolean
  isPremium?: boolean
  capabilities?: string[]
  limits?: any
  defaultParams?: any
}

interface ModelsResponse {
  success: boolean
  data: BackendModel[]
}

function mapBackendModel(m: BackendModel, index: number): ModelItem {
  return {
    id: `${m.type[0]}${index + 1}`,
    name: m.displayName || m.name,
    slug: m.slug,
    provider: m.provider || guessProvider(m.slug),
    category: m.type,
    description: m.description || '',
    cost: m.minCost || m.cost || guessCost(m.type),
    hasVariants: m.hasVariants ?? false,
  }
}

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
  if (slug.includes('seedream')) return 'ByteDance'
  if (slug.includes('nano')) return 'Community'
  if (slug.includes('kling')) return 'Kuaishou'
  if (slug.includes('runway')) return 'Runway'
  if (slug.includes('hailuo')) return 'MiniMax'
  if (slug.includes('suno')) return 'Suno'
  if (slug.includes('eleven')) return 'ElevenLabs'
  return 'AI'
}

function guessCost(type: string): number {
  switch (type) {
    case 'text': return 1
    case 'image': return 2
    case 'video': return 5
    case 'audio': return 1
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

      const rawModels: BackendModel[] = data.data || []

      if (rawModels.length > 0) {
        const mapped = rawModels.map(mapBackendModel)
        store.setModels(mapped)
        console.log(`[useModels] Loaded ${mapped.length} models from backend`)
      } else {
        console.warn('[useModels] Backend returned 0 models, using fallback')
        store.setModels(fallbackModels)
      }
    } catch (err) {
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