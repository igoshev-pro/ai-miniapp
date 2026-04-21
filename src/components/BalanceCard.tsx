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
    <div className="fade-in fade-in--2 rounded-2xl bg-[var(--bg-glass)] backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)] border border-white/[0.08] p-4">
      {/* Top row: balance + topup */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[11px] font-medium text-white/40 mb-1">Баланс</div>
          <div className="flex items-center gap-1.5 text-[22px] font-extrabold text-white tracking-tight leading-none">
            12 450
            <Flame size={20} className="text-[var(--accent-yellow)]" />
            <span className="text-xs font-semibold text-white/35 self-end mb-0.5 ml-0.5">
              спичек
            </span>
          </div>
        </div>
        <button
          className="
            px-4 py-2 rounded-[var(--radius-btn)]
            bg-[var(--accent-yellow)] text-[#0a0a0a]
            text-[13px] font-bold
            transition-all duration-150
            active:scale-[0.96] active:opacity-85
            select-none [-webkit-tap-highlight-color:transparent]
          "
          onClick={() => haptic('medium')}
        >
          + Пополнить
        </button>
      </div>

      {/* Generation estimates */}
      <div className="flex gap-2">
        {generations.map((gen) => (
          <div
            key={gen.label}
            className={`
              flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[10px]
              ${gen.isText
                ? 'bg-[var(--accent-yellow)]/[0.08] border border-[var(--accent-yellow)]/20'
                : 'bg-white/[0.03]'
              }
            `}
          >
            <div className={`${gen.isText ? 'text-[var(--accent-yellow)]' : 'text-white/35'}`}>
              {gen.icon}
            </div>
            <div className={`
              text-[15px] font-bold leading-none
              ${gen.isText ? 'text-[var(--accent-yellow)]' : 'text-white'}
            `}>
              {gen.value}
            </div>
            <div className="text-[10px] text-white/40 font-medium">
              {gen.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}