// src/stores/settings.store.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * SettingsStore — запоминает последние настройки генерации.
 *
 * Хранит две вещи, независимо друг от друга:
 *
 * 1. `lastModel[tab]` — какая модель была выбрана последней на вкладке
 *    (video / image / audio / text). При заходе на страницу без явного
 *    initialModel открывается она.
 *
 * 2. `paramsBySlug[slug]` — последние параметры КОНКРЕТНОЙ модели
 *    (разрешение, длительность, формат, звук, reasoning и т.д.).
 *    Ключ — slug, потому что у разных моделей несовместимые наборы
 *    параметров: 720p от Seedance нельзя переносить на Veo.
 *
 * Сознательно НЕ храним: тексты промптов, загруженные картинки/видео
 * референсы, seed. Это одноразовые вещи для конкретной генерации —
 * восстанавливать их при следующем заходе только мешает.
 *
 * Восстановленные значения ВСЕГДА проходят валидацию по актуальному
 * uiConfig модели (см. `pickValidParams`): бэкенд мог убрать разрешение
 * или сузить список длительностей, и молча подставленное старое
 * значение сломало бы расчёт цены.
 */

export type GenerationTab = 'video' | 'image' | 'audio' | 'text'

/** Значения, которые вообще имеет смысл сохранять. */
type StoredValue = string | number | boolean

export type StoredParams = Record<string, StoredValue>

interface SettingsState {
  /** Последняя выбранная модель на каждой вкладке. */
  lastModel: Partial<Record<GenerationTab, string>>
  /** Последние параметры по slug модели. */
  paramsBySlug: Record<string, StoredParams>

  setLastModel: (tab: GenerationTab, slug: string) => void
  /** Мержит переданные параметры с уже сохранёнными для этого slug. */
  saveParams: (slug: string, params: Record<string, unknown>) => void
  getParams: (slug: string) => StoredParams
  clearParams: (slug: string) => void
  clearAll: () => void
}

/**
 * Оставляем только примитивы — объекты/массивы (референсы, кадры) не храним.
 *
 * Пустая строка сохраняется намеренно: для части параметров это
 * осмысленный выбор («Авто» у vocalGender), а не отсутствие значения.
 */
function sanitize(params: Record<string, unknown>): StoredParams {
  const out: StoredParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value
    }
  }
  return out
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      lastModel: {},
      paramsBySlug: {},

      setLastModel: (tab, slug) =>
        set((s) => ({ lastModel: { ...s.lastModel, [tab]: slug } })),

      saveParams: (slug, params) => {
        const clean = sanitize(params)
        if (Object.keys(clean).length === 0) return
        set((s) => ({
          paramsBySlug: {
            ...s.paramsBySlug,
            [slug]: { ...(s.paramsBySlug[slug] || {}), ...clean },
          },
        }))
      },

      getParams: (slug) => get().paramsBySlug[slug] || {},

      clearParams: (slug) =>
        set((s) => {
          const next = { ...s.paramsBySlug }
          delete next[slug]
          return { paramsBySlug: next }
        }),

      clearAll: () => set({ lastModel: {}, paramsBySlug: {} }),
    }),
    {
      name: 'spichki-gen-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
