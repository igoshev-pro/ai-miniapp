// src/stores/models.store.ts

import { create } from 'zustand'
import { modelsByPriority as fallbackModels, sortModelsByName } from '@/lib/data'
import type { ModelItem, ModelCategory } from '@/lib/data'

interface ModelsState {
  models: ModelItem[]
  categories: ModelCategory[]
  // Модель по умолчанию в категории — первая по sortOrder бэка.
  // Хранится отдельно: сам список models отсортирован по алфавиту.
  defaultSlugs: Record<string, string>
  isLoaded: boolean
  isLoading: boolean

  setModels: (models: ModelItem[]) => void
  setLoading: (v: boolean) => void
}

export const useModelsStore = create<ModelsState>((set) => ({
  models: [],
  categories: [],
  defaultSlugs: {},
  isLoaded: false,
  isLoading: false,

  setModels: (models) => {
    // Автоматически считаем категории
    const categoryCounts: Record<string, number> = {}
    const defaultSlugs: Record<string, string> = {}
    for (const m of models) {
      if (!defaultSlugs[m.category]) defaultSlugs[m.category] = m.slug
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1
    }

    const categoryLabels: Record<string, string> = {
      text: 'Текст',
      image: 'Картинки',
      video: 'Видео',
      audio: 'Аудио',
    }

    const categories: ModelCategory[] = ['text', 'image', 'video', 'audio']
      .filter((id) => categoryCounts[id])
      .map((id) => ({
        id,
        label: categoryLabels[id] || id,
        count: categoryCounts[id],
      }))

    set({
      models: sortModelsByName(models),
      categories,
      defaultSlugs,
      isLoaded: true,
      isLoading: false,
    })
  },

  setLoading: (v) => set({ isLoading: v }),
}))

/** Slug модели по умолчанию для категории (порядок бэка, не алфавит). */
export function getDefaultModelSlug(category: ModelItem['category']): string | undefined {
  return (
    useModelsStore.getState().defaultSlugs[category] ??
    fallbackModels.find((m) => m.category === category)?.slug
  )
}

/** Модель по умолчанию из уже отфильтрованного списка; если её там нет — первая. */
export function defaultModelOf<T extends { slug: string }>(
  list: T[],
  category: ModelItem['category'],
): T | undefined {
  const slug = getDefaultModelSlug(category)
  return list.find((m) => m.slug === slug) ?? list[0]
}

export function defaultSlugOf(
  list: { slug: string }[],
  category: ModelItem['category'],
): string | undefined {
  return defaultModelOf(list, category)?.slug
}
