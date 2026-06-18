// src/lib/free-access.ts

import { ModelItem } from "../data"

export interface FreeAccessInfo {
  isFree: boolean
  limit: 'unlimited' | 'limited' | null
  hourlyLimit: number | null
  dailyLimit: number | null
  reason?: 'params_mismatch'
}

/**
 * Проверяет, доступна ли модель бесплатно по подписке пользователя
 * с учётом текущих параметров генерации.
 *
 * Логика синхронизирована с BillingService.checkFreeModelAccess:
 *   - модель должна иметь isFreeInPlan === true (это даёт бэк)
 *   - если у freeLimit.requiredParams задан фильтр — params должны совпадать
 *
 * @param model - модель из useModels()
 * @param params - текущие параметры генерации (mode, resolution и т.д.)
 */
export function getFreeAccessInfo(
  model: Pick<ModelItem, 'isFreeInPlan' | 'freeLimit'>,
  params?: Record<string, any>,
): FreeAccessInfo {
  if (!model.isFreeInPlan || !model.freeLimit) {
    return { isFree: false, limit: null, hourlyLimit: null, dailyLimit: null }
  }

  const { hourlyLimit, dailyLimit, requiredParams } = model.freeLimit

  // Проверка requiredParams (для Midjourney: { mode: 'draft' })
  if (requiredParams && Object.keys(requiredParams).length > 0) {
    if (!params) {
      return {
        isFree: false,
        limit: null,
        hourlyLimit,
        dailyLimit,
        reason: 'params_mismatch',
      }
    }
    for (const key of Object.keys(requiredParams)) {
      // eslint-disable-next-line eqeqeq
      if (requiredParams[key] != params[key]) {
        return {
          isFree: false,
          limit: null,
          hourlyLimit,
          dailyLimit,
          reason: 'params_mismatch',
        }
      }
    }
  }

  const isUnlimited = hourlyLimit === null && dailyLimit === null

  return {
    isFree: true,
    limit: isUnlimited ? 'unlimited' : 'limited',
    hourlyLimit,
    dailyLimit,
  }
}

/**
 * Форматирует подпись лимита для UI.
 *
 * Примеры:
 *   - unlimited → "Бесплатно по подписке"
 *   - limit 10/час, 60/сут → "Бесплатно · 10/час"
 *   - limit null/60/сут → "Бесплатно · 60/сутки"
 */
export function formatFreeLabel(info: FreeAccessInfo): string {
  if (!info.isFree) return ''

  if (info.limit === 'unlimited') {
    return 'Бесплатно по подписке'
  }

  if (info.hourlyLimit !== null) {
    return `Бесплатно · ${info.hourlyLimit}/час`
  }
  if (info.dailyLimit !== null) {
    return `Бесплатно · ${info.dailyLimit}/сутки`
  }

  return 'Бесплатно по подписке'
}

/**
 * Короткая версия для маленьких бейджей в списках.
 *
 * Примеры:
 *   - unlimited → "Бесплатно"
 *   - limited → "Бесплатно 10/ч"
 */
export function formatFreeBadge(info: FreeAccessInfo): string {
  if (!info.isFree) return ''
  if (info.limit === 'unlimited') return 'Бесплатно'
  if (info.hourlyLimit !== null) return `Бесплатно ${info.hourlyLimit}/ч`
  if (info.dailyLimit !== null) return `Бесплатно ${info.dailyLimit}/сут`
  return 'Бесплатно'
}