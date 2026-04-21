'use client'

import {
  MessageCircle,
  Palette,
  Clapperboard,
  Brain,
  ChevronRight,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'

const iconMap: Record<string, React.ReactNode> = {
  message: <MessageCircle size={18} />,
  palette: <Palette size={18} />,
  clapperboard: <Clapperboard size={18} />,
  brain: <Brain size={18} />,
}

const iconColorMap: Record<string, string> = {
  chat: 'text-[#60a5fa] bg-[rgba(96,165,250,0.1)]',
  image: 'text-[#c084fc] bg-[rgba(192,132,252,0.1)]',
  video: 'text-[#f87171] bg-[rgba(248,113,113,0.1)]',
  text: 'text-[#4ade80] bg-[rgba(74,222,128,0.1)]',
}

interface Props {
  items: any[]
}

export function HistoryList({ items }: Props) {
  const { haptic } = useTelegram()

  return (
    <div className="history-list flex flex-col gap-1.5 fade-in fade-in--5">
      {items.map((item) => {
        const iconColor =
          iconColorMap[item.type] || 'text-[var(--gray-500)] bg-white/[0.04]'

        return (
          <div
            key={item.id}
            className="
              history-item
              flex items-center gap-3
              py-[11px] px-[13px]
              rounded-[var(--radius-sm)]
              bg-[var(--bg-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              border border-[var(--border-glass)]
              cursor-pointer
              transition-all duration-200
              active:scale-[0.98] active:bg-[var(--bg-card-hover)]
            "
            onClick={() => haptic('light')}
            role="button"
            tabIndex={0}
          >
            {/* Icon */}
            <div
              className={`
                w-9 h-9 rounded-[9px]
                flex items-center justify-center
                shrink-0
                ${iconColor}
              `}
            >
              {iconMap[item.iconKey]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">
                {item.title}
              </div>
              <div className="text-[11px] text-[var(--gray-600)] mt-[2px] truncate">
                {item.model} · {item.time}
              </div>
            </div>

            {/* Arrow */}
            <div className="text-[var(--gray-700)] shrink-0 flex items-center">
              <ChevronRight size={16} />
            </div>
          </div>
        )
      })}
    </div>
  )
}