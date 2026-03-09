// src/components/ActionCards.tsx

'use client'

import { Flame, Crown, Gift, Zap } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser } from '@/hooks'

interface Props {
  onNavigate?: (page: string) => void
}

export function ActionCards({ onNavigate }: Props) {
  const { haptic } = useTelegram()
  const { balance, subscription } = useUser()

  const cards = [
    {
      id: 'topup',
      icon: <Flame size={20} />,
      title: 'Пополнить',
      subtitle: `${balance.toLocaleString()} спичек`,
      gradient: 'action-card--fire',
    },
    {
      id: 'subscription',
      icon: <Crown size={20} />,
      title: 'Тарифы',
      subtitle: subscription.plan === 'free' ? 'Бесплатный' : subscription.plan,
      gradient: 'action-card--gold',
    },
    {
      id: 'referral',
      icon: <Gift size={20} />,
      title: 'Друзья',
      subtitle: '+50 спичек',
      gradient: 'action-card--purple',
    },
  ]

  return (
    <div className="action-cards fade-in fade-in--2">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`action-card ${card.gradient}`}
          onClick={() => {
            haptic('light')
            onNavigate?.(card.id)
          }}
          role="button"
          tabIndex={0}
        >
          <div className="action-card__icon">{card.icon}</div>
          <div className="action-card__title">{card.title}</div>
          <div className="action-card__subtitle">{card.subtitle}</div>
        </div>
      ))}
    </div>
  )
}