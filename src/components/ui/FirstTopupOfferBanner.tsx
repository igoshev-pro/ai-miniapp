'use client'

// Плашка акции «x2 спичек на первое пополнение» с живым таймером.
// Используется на Тарифах, в Пополнении и в пейволле. Если акции нет —
// ничего не рендерит.

import { Gift, Clock } from 'lucide-react'
import { useFirstTopupOffer } from '@/hooks/useFirstTopupOffer'

interface Props {
  className?: string
  /** compact — для пейволла: без подписи про лимит отдельной строкой */
  compact?: boolean
}

function multiplierLabel(m: number) {
  return Number.isInteger(m) ? `x${m}` : `x${m.toFixed(1).replace('.', ',')}`
}

export function FirstTopupOfferBanner({ className = '', compact = false }: Props) {
  const { offer, isActive, countdown } = useFirstTopupOffer()
  if (!isActive) return null

  const capText =
    offer.maxRub > 0 ? `на сумму до ${offer.maxRub.toLocaleString('ru-RU')} ₽` : null

  return (
    <div
      className={`
        relative overflow-hidden flex items-start gap-3 p-3.5 rounded-[14px]
        border border-amber-400/40
        bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(249,115,22,0.08))]
        ${className}
      `}
    >
      <div className="w-9 h-9 shrink-0 rounded-[11px] flex items-center justify-center bg-amber-400 text-black">
        <Gift size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-white leading-tight">
          {multiplierLabel(offer.multiplier)} спичек на первое пополнение
        </div>
        {!compact && capText && (
          <div className="text-[12px] text-white/55 mt-0.5">Бонус начисляется {capText}</div>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[12px]">
          {countdown && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-400 tabular-nums">
              <Clock size={11} /> осталось {countdown}
            </span>
          )}
          {compact && capText && <span className="text-white/45">{capText}</span>}
        </div>
      </div>
    </div>
  )
}
