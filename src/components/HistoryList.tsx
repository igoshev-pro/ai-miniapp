'use client'

import {
  MessageCircle,
  Palette,
  Clapperboard,
  Brain,
  ChevronRight,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
// import type { HistoryData } from '@/lib/data'

const iconMap: Record<string, React.ReactNode> = {
  message: <MessageCircle size={18} />,
  palette: <Palette size={18} />,
  clapperboard: <Clapperboard size={18} />,
  brain: <Brain size={18} />,
}

interface Props {
  items: any[]
}

export function HistoryList({ items }: Props) {
  const { haptic } = useTelegram()

  return (
    <div className="history-list fade-in fade-in--5">
      {items.map((item) => (
        <div
          key={item.id}
          className="history-item"
          onClick={() => haptic('light')}
          role="button"
          tabIndex={0}
        >
          <div
            className={`history-item__icon history-item__icon--${item.type}`}
          >
            {iconMap[item.iconKey]}
          </div>
          <div className="history-item__content">
            <div className="history-item__title">{item.title}</div>
            <div className="history-item__meta">
              {item.model} · {item.time}
            </div>
          </div>
          <div className="history-item__arrow">
            <ChevronRight size={16} />
          </div>
        </div>
      ))}
    </div>
  )
}