'use client'

import { useCallback } from 'react'
import { useSettingsStore, type GenerationTab } from '@/stores/settings.store'
import type { ModelUIConfig } from './useModelUIConfig'

/**
 * useSavedSettings — восстановление последних настроек модели.
 *
 * Главная задача хука — НЕ отдать страницу протухшим значениям.
 * Сохранённые параметры лежат в localStorage сколько угодно долго, а
 * uiConfig на бэкенде за это время мог измениться: у модели убрали 1080p,
 * сократили максимальную длительность, выпилили параметр целиком.
 * Поэтому каждое восстановленное значение сверяется с актуальным
 * uiConfig и отбрасывается, если больше не разрешено — страница тогда
 * использует свой дефолт, как будто ничего сохранено не было.
 *
 * Отбрасываем молча и по одному значению: если пользователь когда-то
 * выбрал 1080p + 10 сек, а 1080p убрали, длительность 10 сек всё ещё
 * валидна и сохраняется.
 */

/** Сравнение без учёта типа: option.value приходит строкой, стейт может быть числом. */
function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    const norm = (v: unknown) => v === true || v === 'true'
    return norm(a) === norm(b)
  }
  return String(a) === String(b)
}

/**
 * Проверяет одно значение по описанию параметра в uiConfig.
 * Неизвестный ключ → false: параметра больше нет в модели.
 */
function isValidParam(
  config: ModelUIConfig | null,
  key: string,
  value: unknown,
): boolean {
  if (!config?.uiParameters) return false

  const param = config.uiParameters.find((p) => p.key === key)
  if (!param) return false

  if (param.type === 'boolean') {
    return typeof value === 'boolean' || value === 'true' || value === 'false'
  }

  if (param.type === 'number') {
    const num = Number(value)
    if (!Number.isFinite(num)) return false
    if (param.min !== undefined && num < param.min) return false
    if (param.max !== undefined && num > param.max) return false
    return true
  }

  // select — значение обязано быть среди актуальных опций
  if (param.options?.length) {
    return param.options.some((o) => sameValue(o.value, value))
  }

  // text и select без опций — принимаем как есть
  return true
}

/**
 * Дополнительные правила валидации для параметров, которых нет
 * в `uiParameters` бэкенда, но которые страница держит в своём стейте
 * (голос TTS, язык, слайдеры стабильности, тумблеры Suno).
 * Значение допускается, только если предикат вернул true.
 */
export type ExtraValidators = Record<string, (value: unknown) => boolean>

/** Готовые предикаты для типовых случаев. */
export const validators = {
  bool: (v: unknown) => typeof v === 'boolean',
  /** Число в диапазоне [min, max] включительно. */
  range: (min: number, max: number) => (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= min && n <= max
  },
  /** Значение из фиксированного списка (список считается на месте вызова). */
  oneOf: (allowed: readonly unknown[]) => (v: unknown) =>
    allowed.some((a) => sameValue(a, v)),
}

export function useSavedSettings(tab: GenerationTab) {
  const setLastModel = useSettingsStore((s) => s.setLastModel)
  const saveParams = useSettingsStore((s) => s.saveParams)

  /**
   * Отфильтрованные сохранённые параметры для модели.
   * Читаем через getState(), а не через селектор: значения нужны
   * разово внутри эффекта, подписка вызывала бы лишние ре-рендеры.
   *
   * `extra` описывает ключи вне uiParameters: они проверяются своим
   * предикатом. Ключ, не описанный ни там, ни там, отбрасывается.
   */
  const getValidParams = useCallback(
    (
      slug: string,
      config: ModelUIConfig | null,
      extra?: ExtraValidators,
    ): Record<string, any> => {
      const saved = useSettingsStore.getState().paramsBySlug[slug]
      if (!saved) return {}

      const valid: Record<string, any> = {}
      for (const [key, value] of Object.entries(saved)) {
        const check = extra?.[key]
        if (check) {
          if (check(value)) valid[key] = value
          continue
        }
        if (isValidParam(config, key, value)) {
          valid[key] = value
        }
      }
      return valid
    },
    [],
  )

  /** Последняя модель вкладки — если она ещё есть в списке доступных. */
  const getLastModel = useCallback(
    (availableSlugs: string[]): string | null => {
      const slug = useSettingsStore.getState().lastModel[tab]
      if (!slug) return null
      return availableSlugs.includes(slug) ? slug : null
    },
    [tab],
  )

  const rememberModel = useCallback(
    (slug: string) => setLastModel(tab, slug),
    [tab, setLastModel],
  )

  return { getValidParams, getLastModel, rememberModel, saveParams }
}
