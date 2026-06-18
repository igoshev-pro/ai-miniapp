// src/components/ui/PriceTag.tsx
'use client'

import { Loader2 } from 'lucide-react'
import { formatCost } from '@/lib/data'

interface Props {
  /** Стоимость в спичках. Не используется если isFree=true */
  cost: number
  /** Бесплатно по подписке */
  isFree?: boolean
  /** Лимит для бесплатной модели: "10/час" или "Безлимит" */
  freeLimitLabel?: string | null
  /** Показывать "от" перед ценой */
  showFromPrefix?: boolean
  /** Спиннер загрузки */
  loading?: boolean
  /** Затемнить (например при пересчёте цены) */
  dimmed?: boolean
  /** Размер: 'sm' для списков, 'md' для шапок */
  size?: 'sm' | 'md'
  /** Кастомный текст вместо цены (например "2.7 🔥 / 1000 симв.") */
  customText?: string
  className?: string
}

export function PriceTag({
  cost,
  isFree = false,
  freeLimitLabel,
  showFromPrefix = false,
  loading = false,
  dimmed = false,
  size = 'sm',
  customText,
  className = '',
}: Props) {
  const textSize = size === 'md' ? 'text-[11px]' : 'text-[11px]'

  // ─── Бесплатно по подписке ───
  if (isFree) {
    return (
      <span
        className={`
          ${textSize} font-semibold inline-flex items-center gap-1
          text-emerald-400 bg-emerald-400/[0.1]
          px-[7px] py-px rounded-[5px]
          whitespace-nowrap shrink-0
          ${className}
        `}
        title={
          freeLimitLabel
            ? `Бесплатно по подписке · ${freeLimitLabel}`
            : 'Бесплатно по подписке'
        }
      >
        ✨ Бесплатно
        {freeLimitLabel && freeLimitLabel !== 'Безлимит' && (
          <span className="text-emerald-400/70 font-medium">
            · {freeLimitLabel}
          </span>
        )}
      </span>
    )
  }

  // ─── Кастомный текст (например посимвольная цена) ───
  if (customText) {
    return (
      <span
        className={`
          ${textSize} inline-flex items-center gap-1
          text-yellow-400 bg-yellow-400/[0.08]
          px-[7px] py-px rounded-[5px]
          whitespace-nowrap shrink-0
          ${dimmed ? 'opacity-60' : ''}
          ${className}
        `}
      >
        {loading && <Loader2 size={10} className="animate-spin" />}
        {customText}
      </span>
    )
  }

  // ─── Обычная цена ───
  return (
    <span
      className={`
        ${textSize} font-semibold inline-flex items-center gap-1
        text-yellow-400 bg-yellow-400/[0.08]
        px-[7px] py-px rounded-[5px]
        whitespace-nowrap shrink-0
        tracking-[0.2px]
        ${dimmed ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {loading && <Loader2 size={10} className="animate-spin" />}
      {showFromPrefix && <span className="text-yellow-400/70 font-normal">от</span>}
      {formatCost(cost)} 🔥
    </span>
  )
}