// src/stores/models.store.ts

import { create } from 'zustand'
import type { ModelItem, ModelCategory } from '@/lib/data'

interface ModelsState {
  models: ModelItem[]
  categories: ModelCategory[]
  isLoaded: boolean
  isLoading: boolean

  setModels: (models: ModelItem[]) => void
  setLoading: (v: boolean) => void
}

export const useModelsStore = create<ModelsState>((set) => ({
  models: [],
  categories: [],
  isLoaded: false,
  isLoading: false,

  setModels: (models) => {
    // Автоматически считаем категории
    const categoryCounts: Record<string, number> = {}
    for (const m of models) {
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

    set({ models, categories, isLoaded: true, isLoading: false })
  },

  setLoading: (v) => set({ isLoading: v }),
}))