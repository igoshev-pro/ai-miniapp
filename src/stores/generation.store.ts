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
  resultUrl?: string
  resultUrls?: string[]
  thumbnailUrl?: string
  error?: string
  tokensUsed?: number
  refunded?: boolean
  isFavorite?: boolean
  settings?: Record<string, unknown>
  createdAt: string
}

interface GenerationState {
  generations: Generation[]
  activeGeneration: Generation | null
  historyLoaded: boolean

  addGeneration: (gen: Generation) => void
  updateGeneration: (id: string, update: Partial<Generation>) => void
  removeGeneration: (id: string) => void
  setActiveGeneration: (gen: Generation | null) => void
  setGenerations: (gens: Generation[]) => void
  mergeHistory: (gens: Generation[]) => void
  setHistoryLoaded: (v: boolean) => void
  getByType: (type: GenerationType) => Generation[]
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  generations: [],
  activeGeneration: null,
  historyLoaded: false,

  addGeneration: (gen) =>
    set((s) => ({
      generations: [gen, ...s.generations.filter((g) => g.id !== gen.id)],
    })),

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

  setGenerations: (gens) => set({ generations: gens }),

  mergeHistory: (historyGens) =>
    set((s) => {
      const activeIds = new Set(
        s.generations
          .filter((g) => g.status === 'pending' || g.status === 'processing')
          .map((g) => g.id),
      )
      const activeGens = s.generations.filter((g) => activeIds.has(g.id))
      const fromHistory = historyGens.filter((g) => !activeIds.has(g.id))
      return { generations: [...activeGens, ...fromHistory] }
    }),

  setHistoryLoaded: (v) => set({ historyLoaded: v }),

  getByType: (type) => get().generations.filter((g) => g.type === type),
}))