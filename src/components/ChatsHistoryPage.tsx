// src/components/ChatsHistoryPage.tsx

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
  const { toggle: toggleFavorite } = useFavorites()
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatsLoaded) {
      loadChats()
    }
  }, [chatsLoaded, loadChats])

  // Infinite scroll observer
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
    <div className="chats-history">
      <div className="chats-history__header fade-in fade-in--1">
        <div className="chats-history__title">Чаты</div>
        <div className="chats-history__count">{chats.length}</div>
      </div>

      <div className="chats-history__search fade-in fade-in--1">
        <Search size={16} className="chats-history__search-icon" />
        <input
          type="text"
          placeholder="Найти чат..."
          className="chats-history__search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chats-history__list fade-in fade-in--2">
        {!chatsLoaded ? (
          <div className="chats-history__loading">
            <Loader2 size={20} className="spin" />
            <span>Загрузка чатов...</span>
          </div>
        ) : grouped.length > 0 ? (
          <>
            {grouped.map((group) => (
              <div key={group.label} className="feed__date-group">
                <div className="feed__date-label">{group.label}</div>
                {group.items.map((chat) => (
                  <div
                    key={chat.id}
                    className="feed-item"
                    onClick={() => {
                      haptic('light')
                      onChatTap(chat.model, chat.id)
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
                        <div className="feed-item__time">{formatChatTime(chat.updatedAt)}</div>
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
                        className="feed-item__star"
                        onClick={(e) => handleToggleFavorite(chat, e)}
                        aria-label="В избранное"
                      >
                        <Star size={14} />
                      </button>
                      <button
                        className="feed-item__delete"
                        onClick={(e) => handleDelete(chat.id, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="feed-item__arrow">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loaderRef} className="chats-history__loading" style={{ padding: '16px 0' }}>
                <Loader2 size={16} className="spin" />
              </div>
            )}
          </>
        ) : (
          <div className="models-page__empty">
            <Search size={24} />
            <span>{search ? 'Ничего не найдено' : 'Нет чатов'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Утилиты ---

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