'use client'

import { Flame, MessageSquare, Image, Video, Music } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'

const generations = [
  { icon: <MessageSquare size={14} />, value: '∞', label: 'Текст', isText: true },
  { icon: <Image size={14} />, value: '~2.4K', label: 'Фото', isText: false },
  { icon: <Video size={14} />, value: '~620', label: 'Видео', isText: false },
  { icon: <Music size={14} />, value: '~1.8K', label: 'Аудио', isText: false },
]

export function BalanceCard() {
  const { haptic } = useTelegram()

  return (
    <div className="balance-card fade-in fade-in--2">
      <div className="balance-card__row">
        <div>
          <div className="balance-card__label">Баланс</div>
          <div className="balance-card__amount">
            12 450
            <Flame size={20} className="balance-card__amount-icon" />
            <span className="balance-card__currency">спичек</span>
          </div>
        </div>
        <button
          className="balance-card__topup"
          onClick={() => haptic('medium')}
        >
          + Пополнить
        </button>
      </div>

      <div className="balance-card__gens">
        {generations.map((gen) => (
          <div
            key={gen.label}
            className={`balance-gen ${gen.isText ? 'balance-gen--text' : ''}`}
          >
            <div className="balance-gen__icon">{gen.icon}</div>
            <div className="balance-gen__value">{gen.value}</div>
            <div className="balance-gen__label">{gen.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}