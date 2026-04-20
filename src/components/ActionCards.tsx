'use client'

import { Flame, Crown, Gift } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser } from '@/hooks'

interface Props {
  onNavigate?: (page: string) => void
}

const gradientStyles = {
  fire: 'bg-gradient-to-br from-red-400/12 to-amber-400/8 border border-red-400/15',
  gold: 'bg-gradient-to-br from-amber-400/12 to-amber-500/6 border border-amber-400/15',
  purple: 'bg-gradient-to-br from-purple-400/12 to-violet-500/6 border border-purple-400/15',
} as const

const iconColors = {
  fire: 'text-red-400',
  gold: 'text-amber-400',
  purple: 'text-purple-400',
} as const

export function ActionCards({ onNavigate }: Props) {
  const { haptic } = useTelegram()
  const { balance, subscription } = useUser()

  const cards = [
    {
      id: 'topup',
      icon: <Flame size={20} />,
      title: 'Пополнить',
      subtitle: `${balance.toLocaleString()} спичек`,
      variant: 'fire' as const,
    },
    {
      id: 'subscription',
      icon: <Crown size={20} />,
      title: 'Тарифы',
      subtitle: subscription.plan === 'free' ? 'Бесплатный' : subscription.plan,
      variant: 'gold' as const,
    },
    {
      id: 'referral',
      icon: <Gift size={20} />,
      title: 'Друзья',
      subtitle: '+50 спичек',
      variant: 'purple' as const,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 pb-4 fade-in fade-in--2">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`
            flex flex-col items-center gap-1.5 py-4 px-2
            rounded-[14px] cursor-pointer text-center
            transition-[transform,opacity] duration-150
            active:scale-[0.96]
            ${gradientStyles[card.variant]}
          `}
          onClick={() => {
            haptic('light')
            onNavigate?.(card.id)
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`
              w-9 h-9 rounded-[10px] flex items-center justify-center
              bg-white/[0.04] [&>svg]:w-10 [&>svg]:h-10
              ${iconColors[card.variant]}
            `}
          >
            {card.icon}
          </div>
          <div className="text-[13px] font-semibold text-white">
            {card.title}
          </div>
          <div className="text-[10px] text-white/35">
            {card.subtitle}
          </div>
        </div>
      ))}
    </div>
  )
}