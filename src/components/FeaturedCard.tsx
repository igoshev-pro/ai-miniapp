'use client'

import { Flame, ArrowRight } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'

/**
 * Промо-карточка «Все модели — одна подписка»
 * Пока скрыта. Раскомментировать в SpichkiApp.tsx когда нужно.
 */
export function FeaturedCard() {
  const { haptic } = useTelegram()

  return (
    <div
      className="
        featured-card
        relative overflow-hidden
        rounded-[var(--radius)] p-5
        bg-[var(--bg-glass)]
        backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
        border border-[var(--border-glass)]
        cursor-pointer
        transition-all duration-200
        active:scale-[0.98]
        fade-in fade-in--3
      "
      onClick={() => haptic('light')}
    >
      {/* Glow */}
      <div
        className="
          absolute -top-[60px] -right-[60px]
          w-[200px] h-[200px]
          rounded-full
          bg-[radial-gradient(circle,rgba(250,204,21,0.12),transparent_70%)]
          blur-[60px]
          pointer-events-none
        "
      />

      {/* Badge */}
      <div
        className="
          inline-flex items-center gap-1
          text-[10px] font-bold
          text-[var(--accent-yellow)]
          bg-[rgba(250,204,21,0.1)]
          py-[3px] px-2 rounded-[6px]
          uppercase tracking-[0.5px]
          mb-2.5
        "
      >
        <Flame size={12} /> Новинка
      </div>

      {/* Title */}
      <div className="text-[17px] font-bold text-white mb-2 leading-[1.3]">
        Все модели — <span className="text-[var(--accent-yellow)]">одна подписка</span>
      </div>

      {/* Description */}
      <div className="text-[12px] text-[var(--gray-500)] leading-[1.6] mb-4 max-w-[320px]">
        GPT-4o, Claude 3.5, Midjourney, DALL·E 3, Stable Diffusion, Sora — всё
        в одном месте. Единый баланс, без переключений.
      </div>

      {/* CTA */}
      <button
        className="
          inline-flex items-center gap-1.5
          bg-[var(--accent-yellow)] text-[#0a0a0a]
          text-[13px] font-bold
          py-2.5 px-5
          rounded-[var(--radius-btn)]
          border-none cursor-pointer
          transition-all duration-150
          font-[inherit]
          [-webkit-tap-highlight-color:transparent]
          active:scale-[0.96] active:opacity-90
        "
        onClick={(e) => {
          e.stopPropagation()
          haptic('medium')
        }}
      >
        Попробовать бесплатно
        <ArrowRight size={16} />
      </button>
    </div>
  )
}