'use client'

import { useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Star,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChat, useFavorites } from '@/hooks'
import type { Chat } from '@/stores/chat.store'

interface Props {
  onChatTap?: (model: string, chatId: string) => void
  onViewAll?: () => void
}

export function ChatFeed({ onChatTap, onViewAll }: Props) {
  const { haptic, hapticNotification } = useTelegram()
  const { chats, chatsLoaded, loadChats } = useChat()
  const { toggle: toggleFavorite, isFavorite } = useFavorites()

  useEffect(() => {
    if (!chatsLoaded) {
      loadChats()
    }
  }, [chatsLoaded, loadChats])

  const handleToggleFavorite = useCallback(
    async (chat: Chat, e: React.MouseEvent) => {
      e.stopPropagation()
      hapticNotification('success')
      await toggleFavorite('conversation', chat.id, chat.title)
    },
    [hapticNotification, toggleFavorite],
  )

  const recentChats = chats.slice(0, 6)
  const grouped = groupByDate(recentChats)

  // ── Loading state ──
  if (!chatsLoaded) {
    return (
      <div className="fade-in fade-in--4">
        {/* Section title */}
        <div className="flex items-center gap-2 text-[17px] font-bold text-[var(--text-primary)] mb-3 mt-6">
          Последние чаты
          <span className="text-[10px] py-[3px] px-2 rounded-[20px] bg-white/5 text-[var(--gray-500)] font-semibold tracking-wide">
            ...
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
          <Loader2 size={16} className="spin" />
          <span>Загрузка...</span>
        </div>
      </div>
    )
  }

  if (recentChats.length === 0) {
    return null
  }

  return (
    <div className="fade-in fade-in--4">
      {/* Section title */}
      <div className="flex items-center gap-2 text-[17px] font-bold text-[var(--text-primary)] mb-3 mt-6">
        Последние чаты
        <span className="text-[10px] py-[3px] px-2 rounded-[20px] bg-white/5 text-[var(--gray-500)] font-semibold tracking-wide">
          {chats.length}
        </span>
        {chats.length > 6 && (
          <span
            className="ml-auto text-[12px] text-[var(--accent-yellow)] font-semibold cursor-pointer flex items-center gap-0.5 select-none [-webkit-tap-highlight-color:transparent]"
            onClick={onViewAll}
          >
            Все <ChevronRight size={12} />
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex flex-col mb-3">
        {grouped.map((group) => (
          <div key={group.label} className="mb-0.5">
            {/* Date label */}
            <div className="text-[11px] font-semibold text-[var(--gray-600)] uppercase tracking-wide pt-3 pb-1.5">
              {group.label}
            </div>

            {group.items.map((chat) => {
              const fav = isFavorite('conversation', chat.id)

              return (
                <div
                  key={chat.id}
                  className="
                    feed-item
                    flex items-center gap-3
                    py-[11px] px-[13px]
                    rounded-[var(--radius-sm)]
                    bg-[var(--bg-glass)]
                    backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
                    border border-white/[0.08]
                    cursor-pointer
                    transition-all duration-200
                    active:scale-[0.98] active:bg-[var(--bg-card-hover)]
                    mb-1.5
                  "
                  onClick={() => {
                    haptic('light')
                    onChatTap?.(chat.modelSlug || chat.model, chat.id)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 bg-white/[0.04] text-[var(--gray-500)]">
                    <MessageSquare size={15} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[13px] font-semibold text-white truncate flex-1 min-w-0">
                        {chat.title || 'Новый чат'}
                      </div>
                      <div className="text-[10px] text-[var(--gray-600)] shrink-0">
                        {formatTime(chat.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-[3px]">
                      <span className="text-[9px] py-[1px] px-1.5 rounded font-semibold bg-white/[0.04] text-[var(--gray-500)] shrink-0">
                        {chat.model}
                      </span>
                      <span className="text-[11px] text-[var(--gray-600)] truncate">
                        {chat.lastMessage || `${chat.messageCount} сообщений`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      className={`
                        bg-transparent border-none p-1 cursor-pointer
                        flex items-center justify-center rounded-[6px]
                        transition-all duration-200
                        active:scale-[0.85]
                        ${fav
                          ? 'text-[var(--accent-yellow)] [&>svg]:fill-[var(--accent-yellow)]'
                          : 'text-[var(--gray-700)]'
                        }
                      `}
                      onClick={(e) => handleToggleFavorite(chat, e)}
                      aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
                    >
                      <Star size={14} />
                    </button>
                    <div className="text-[var(--gray-700)]">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)

  if (hours < 24) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface DateGroup {
  label: string
  items: Chat[]
}

function groupByDate(chats: Chat[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: Record<string, Chat[]> = {
    'Сегодня': [],
    'Вчера': [],
    'Ранее': [],
  }

  for (const chat of chats) {
    const chatDate = new Date(chat.updatedAt)
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate())

    if (chatDay.getTime() >= today.getTime()) {
      groups['Сегодня'].push(chat)
    } else if (chatDay.getTime() >= yesterday.getTime()) {
      groups['Вчера'].push(chat)
    } else {
      groups['Ранее'].push(chat)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}