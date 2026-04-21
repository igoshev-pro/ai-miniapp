'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Star,
  ChevronRight,
  Search,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChat, useFavorites } from '@/hooks'
import type { Chat } from '@/stores/chat.store'

interface Props {
  onChatTap: (model: string, chatId: string) => void
}

export function ChatsHistoryPage({ onChatTap }: Props) {
  const { haptic, hapticNotification } = useTelegram()
  const { chats, chatsLoaded, loadChats, deleteChat } = useChat()
  const { toggle: toggleFavorite, isFavorite } = useFavorites()
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatsLoaded) {
      loadChats()
    }
  }, [chatsLoaded, loadChats])

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [chatsLoaded])

  const handleDelete = useCallback(
    (chatId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      haptic('medium')
      deleteChat(chatId)
    },
    [haptic, deleteChat],
  )

  const handleToggleFavorite = useCallback(
    async (chat: Chat, e: React.MouseEvent) => {
      e.stopPropagation()
      hapticNotification('success')
      await toggleFavorite('conversation', chat.id, chat.title)
    },
    [hapticNotification, toggleFavorite],
  )

  const filtered = search
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.model.toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage || '').toLowerCase().includes(search.toLowerCase()),
      )
    : chats

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visible.length < filtered.length
  const grouped = groupByDate(visible)

  return (
    <div className="chats-history relative z-[1] px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3.5 fade-in fade-in--1">
        <div className="text-[18px] font-bold text-white">Чаты</div>
        <div className="text-[11px] py-[3px] px-2 rounded-[20px] bg-white/5 text-[var(--gray-500)] font-semibold">
          {chats.length}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3 fade-in fade-in--1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-600)] pointer-events-none"
        />
        <input
          type="text"
          placeholder="Найти чат..."
          className="
            w-full py-2.5 pr-3 pl-[38px]
            rounded-[var(--radius-sm)]
            border border-[var(--border-glass)]
            bg-[var(--bg-glass)]
            backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
            text-white text-[13px]
            outline-none transition-[border-color] duration-200
            font-[inherit]
            placeholder:text-[var(--gray-600)]
            focus:border-[rgba(250,204,21,0.2)]
          "
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="fade-in fade-in--2">
        {!chatsLoaded ? (
          /* Loading */
          <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
            <Loader2 size={20} className="spin" />
            <span>Загрузка чатов...</span>
          </div>
        ) : grouped.length > 0 ? (
          <>
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
                        onChatTap(chat.modelSlug, chat.id)
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
                            {formatChatTime(chat.updatedAt)}
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
                        <button
                          className="
                            bg-transparent border-none
                            text-white/25 p-1
                            cursor-pointer rounded-[6px]
                            transition-all duration-150
                            hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)]
                          "
                          onClick={(e) => handleDelete(chat.id, e)}
                        >
                          <Trash2 size={14} />
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

            {/* Infinite scroll loader */}
            {hasMore && (
              <div
                ref={loaderRef}
                className="flex flex-col items-center gap-2 py-4 text-white/30 text-[13px]"
              >
                <Loader2 size={16} className="spin" />
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
            <Search size={24} />
            <span>{search ? 'Ничего не найдено' : 'Нет чатов'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
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
    Сегодня: [],
    Вчера: [],
    Ранее: [],
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