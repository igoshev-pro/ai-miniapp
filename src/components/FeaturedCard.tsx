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
      className="featured-card fade-in fade-in--3"
      onClick={() => haptic('light')}
    >
      <div className="featured-card__glow" />
      <div className="featured-card__badge">
        <Flame size={12} /> Новинка
      </div>
      <div className="featured-card__title">
        Все модели — <span>одна подписка</span>
      </div>
      <div className="featured-card__desc">
        GPT-4o, Claude 3.5, Midjourney, DALL·E 3, Stable Diffusion, Sora — всё
        в одном месте. Единый баланс, без переключений.
      </div>
      <button
        className="featured-card__cta"
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