// src/components/ChatFeed.tsx

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

  if (!chatsLoaded) {
    return (
      <div className="fade-in fade-in--4">
        <div className="section-title" style={{ marginTop: 24 }}>
          Последние чаты
          <span className="section-title__badge">...</span>
        </div>
        <div className="chats-history__loading">
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
      <div className="section-title" style={{ marginTop: 24 }}>
        Последние чаты
        <span className="section-title__badge">{chats.length}</span>
        {chats.length > 6 && (
          <span className="section-title__link" onClick={onViewAll}>
            Все <ChevronRight size={12} />
          </span>
        )}
      </div>

      <div className="feed">
        {grouped.map((group) => (
          <div key={group.label} className="feed__date-group">
            <div className="feed__date-label">{group.label}</div>
            {group.items.map((chat) => {
              const fav = isFavorite('conversation', chat.id)

              return (
                <div
                  key={chat.id}
                  className="feed-item"
                  onClick={() => {
                    haptic('light')
                    onChatTap?.(chat.modelSlug || chat.model, chat.id)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feed-item__icon">
                    <MessageSquare size={15} />
                  </div>

                  <div className="feed-item__body">
                    <div className="feed-item__top">
                      <div className="feed-item__title">{chat.title || 'Новый чат'}</div>
                      <div className="feed-item__time">{formatTime(chat.updatedAt)}</div>
                    </div>
                    <div className="feed-item__bottom">
                      <span className="feed-item__model-badge">{chat.model}</span>
                      <span className="feed-item__preview">
                        {chat.lastMessage || `${chat.messageCount} сообщений`}
                      </span>
                    </div>
                  </div>

                  <div className="feed-item__actions">
                    <button
                      className={`feed-item__star ${fav ? 'feed-item__star--active' : ''}`}
                      onClick={(e) => handleToggleFavorite(chat, e)}
                      aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
                    >
                      <Star size={14} />
                    </button>
                    <div className="feed-item__arrow">
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