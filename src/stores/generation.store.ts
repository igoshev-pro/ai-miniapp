// src/stores/generation.store.ts

import { create } from 'zustand'

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type GenerationType = 'image' | 'video' | 'audio'

export interface Generation {
  id: string
  type: GenerationType
  model: string
  modelSlug: string
  prompt: string
  status: GenerationStatus
  progress: number
  resultUrl?: string         // первый URL (для быстрого доступа)
  resultUrls?: string[]      // все URL-ы (бэк отдаёт массив)
  thumbnailUrl?: string
  error?: string
  tokensUsed?: number
  refunded?: boolean
  settings?: Record<string, unknown>
  createdAt: string
}

interface GenerationState {
  generations: Generation[]
  activeGeneration: Generation | null

  addGeneration: (gen: Generation) => void
  updateGeneration: (id: string, update: Partial<Generation>) => void
  removeGeneration: (id: string) => void
  setActiveGeneration: (gen: Generation | null) => void
  getByType: (type: GenerationType) => Generation[]
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  generations: [],
  activeGeneration: null,

  addGeneration: (gen) =>
    set((s) => ({ generations: [gen, ...s.generations] })),

  updateGeneration: (id, update) =>
    set((s) => ({
      generations: s.generations.map((g) =>
        g.id === id ? { ...g, ...update } : g,
      ),
      activeGeneration:
        s.activeGeneration?.id === id
          ? { ...s.activeGeneration, ...update }
          : s.activeGeneration,
    })),

  removeGeneration: (id) =>
    set((s) => ({
      generations: s.generations.filter((g) => g.id !== id),
    })),

  setActiveGeneration: (gen) => set({ activeGeneration: gen }),

  getByType: (type) => get().generations.filter((g) => g.type === type),
}))