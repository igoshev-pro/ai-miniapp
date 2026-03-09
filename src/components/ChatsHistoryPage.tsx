// src/components/ChatsHistoryPage.tsx

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  MessageSquare,
  Image,
  Video,
  Music,
  Star,
  ChevronRight,
  Search,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChat } from '@/hooks'
import type { Chat } from '@/stores/chat.store'

const categoryIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare size={15} />,
  image: <Image size={15} />,
  video: <Video size={15} />,
  audio: <Music size={15} />,
}

interface Props {
  onChatTap: (model: string, chatId: string) => void
}

export function ChatsHistoryPage({ onChatTap }: Props) {
  const { haptic, hapticNotification } = useTelegram()
  const { chats, chatsLoaded, loadChats, deleteChat } = useChat()
  const [search, setSearch] = useState('')

  // Загружаем чаты при монтировании
  useEffect(() => {
    if (!chatsLoaded) {
      loadChats()
    }
  }, [chatsLoaded, loadChats])

  const handleDelete = useCallback(
    (chatId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      haptic('medium')
      deleteChat(chatId)
    },
    [haptic, deleteChat],
  )

  const filtered = search
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.model.toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage || '').toLowerCase().includes(search.toLowerCase()),
      )
    : chats

  // Группировка по датам
  const grouped = groupByDate(filtered)

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
          grouped.map((group) => (
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
                    {categoryIcons[chat.category] || <MessageSquare size={15} />}
                  </div>

                  <div className="feed-item__body">
                    <div className="feed-item__top">
                      <div className="feed-item__title">{chat.title || 'Новый чат'}</div>
                      <div className="feed-item__time">{formatChatTime(chat.updatedAt)}</div>
                    </div>
                    <div className="feed-item__bottom">
                      <span className="feed-item__model-badge">{chat.model}</span>
                      <span className="feed-item__preview">
                        {chat.lastMessage || 'Нет сообщений'}
                      </span>
                    </div>
                  </div>

                  <div className="feed-item__actions">
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
          ))
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

    if (chatDay.getTime() === today.getTime()) {
      groups['Сегодня'].push(chat)
    } else if (chatDay.getTime() === yesterday.getTime()) {
      groups['Вчера'].push(chat)
    } else {
      groups['Ранее'].push(chat)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}