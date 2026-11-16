'use client'

// Строка под полем ввода на страницах генерации:
// «Спишется X 🔥 · останется Y» или, если спичек мало, «не хватает N»
// с переходом в пейволл. Для бесплатных по подписке моделей не показывается.

import { Flame } from 'lucide-react'
import { formatCost } from '@/lib/data'
import { openPaywall } from '@/stores/paywall.store'

interface Props {
  cost: number
  balance: number
  /** Модель бесплатна для пользователя по подписке */
  isFree: boolean
  /** Профиль загружен — иначе баланс 0 и строка соврёт */
  isLoaded: boolean
  /** Для аналитики пейволла: image | video | audio */
  reason?: string
}

export function GenerationCostHint({ cost, balance, isFree, isLoaded, reason }: Props) {
  if (isFree || !isLoaded || !(cost > 0)) return null

  const left = Math.round((balance - cost) * 10) / 10
  const short = left < 0

  return (
    <div
      className="flex items-center justify-end gap-1 px-1 -mt-0.5 text-[11px] leading-none text-white/35"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-0.5">
        Спишется {formatCost(cost)}
        <Flame size={11} className="text-[var(--accent-yellow)]" aria-label="спичек" />
      </span>
      <span aria-hidden>·</span>
      {short ? (
        <button
          type="button"
          onClick={() => openPaywall({ need: cost, have: balance, reason })}
          className="bg-transparent border-none p-0 text-amber-400 font-semibold underline decoration-amber-400/40 underline-offset-2 cursor-pointer"
        >
          не хватает {formatCost(-left)}
        </button>
      ) : (
        <span>останется {formatCost(left)}</span>
      )}
    </div>
  )
}
