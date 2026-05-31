// src/hooks/useModels.ts

'use client'

import { useCallback } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'
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
  capabilities?: string[]      // ← ['vision', 'web_search', ...]
  supportsVision?: boolean     // если бэк отдаёт явно
  limits?: any
  defaultParams?: any
}

interface ModelsResponse {
  success: boolean
  data: BackendModel[]
}

function hasCapability(caps: string[] | undefined, keyword: string): boolean {
  if (!Array.isArray(caps)) return false
  return caps.some((c) => c?.toLowerCase().includes(keyword))
}

function mapBackendModel(m: BackendModel, index: number): ModelItem {
  // Vision: явное поле supportsVision ИЛИ capabilities содержит 'vision'
  const supportsVision =
    m.supportsVision === true || hasCapability(m.capabilities, 'vision')

  // 🆕 Web search: capabilities содержит 'web_search' / 'search' / 'web'
  const webSearch =
    hasCapability(m.capabilities, 'web_search') ||
    hasCapability(m.capabilities, 'web-search')

  // 🆕 Безопасный расчёт цены:
  // приоритет minCost → cost. Если оба null/undefined/<=0 → -1 ("?")
  const rawCost =
    typeof m.minCost === 'number' && m.minCost > 0
      ? m.minCost
      : typeof m.cost === 'number' && m.cost > 0
        ? m.cost
        : -1 // неизвестно

  return {
    id: `${m.type[0]}${index + 1}`,
    name: m.displayName || m.name,
    slug: m.slug,
    provider: m.provider || guessProvider(m.slug),
    category: m.type,
    description: m.description || '',
    cost: rawCost,
    hasVariants: m.hasVariants ?? false,
    supportsVision,
    webSearch, // 🆕
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

export function useModels() {
  const models = useModelsStore((s) => s.models)
  const categories = useModelsStore((s) => s.categories)
  const isLoaded = useModelsStore((s) => s.isLoaded)
  const isLoading = useModelsStore((s) => s.isLoading)

  const loadModels = useCallback(async () => {
    const state = useModelsStore.getState()
    if (state.isLoaded || state.isLoading) return

    useModelsStore.getState().setLoading(true)

    try {
      const { data } = await apiClient.get<ModelsResponse>(ENDPOINTS.MODELS)

      const rawModels: BackendModel[] = data?.data || []

      if (rawModels.length > 0) {
        const mapped = rawModels.map(mapBackendModel)
        useModelsStore.getState().setModels(mapped)
        console.log(`[useModels] Loaded ${mapped.length} models from backend`)
      } else {
        console.warn('[useModels] Backend returned 0 models, using fallback')
        useModelsStore.getState().setModels(fallbackModels)
      }
    } catch (err) {
      console.warn('[useModels] Failed to load from backend, using fallback:', err)
      const current = useModelsStore.getState()
      if (!current.isLoaded) {
        current.setModels(fallbackModels)
      }
    }
  }, [])

  return {
    models: isLoaded ? models : fallbackModels,
    categories: isLoaded ? categories : fallbackCategories,
    isLoaded,
    isLoading,
    loadModels,
  }
}