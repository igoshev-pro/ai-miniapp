'use client'

import { useState, useCallback } from 'react'
import {
  MessageSquare,
  Image,
  Video,
  Music,
  Star,
  ChevronRight,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import {
  chatFeedData,
  dateLabels,
  dateOrder,
  type ChatItem,
} from '@/lib/data'

const iconMap: Record<string, React.ReactNode> = {
  message: <MessageSquare size={15} />,
  image: <Image size={15} />,
  video: <Video size={15} />,
  audio: <Music size={15} />,
}

interface Props {
  onChatTap?: (model: string) => void
}

export function ChatFeed({ onChatTap }: Props) {
  const { haptic, hapticNotification } = useTelegram()
  const [chats, setChats] = useState<ChatItem[]>(chatFeedData)

  const toggleFavorite = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setChats((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
        )
      )
      hapticNotification('success')
    },
    [hapticNotification]
  )

  const grouped = dateOrder
    .map((dateKey) => ({
      dateKey,
      label: dateLabels[dateKey],
      items: chats.filter((c) => c.date === dateKey),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="fade-in fade-in--4">
      <div className="section-title">
        Последние чаты
        <span className="section-title__badge">{chats.length}</span>
      </div>

      <div className="feed">
        {grouped.map((group) => (
          <div key={group.dateKey} className="feed__date-group">
            <div className="feed__date-label">{group.label}</div>
            {group.items.map((item) => (
              <FeedItem
                key={item.id}
                item={item}
                onTap={() => {
                  haptic('light')
                  onChatTap?.(item.model)
                }}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedItem({
  item,
  onTap,
  onToggleFavorite,
}: {
  item: ChatItem
  onTap: () => void
  onToggleFavorite: (id: string, e: React.MouseEvent) => void
}) {
  return (
    <div className="feed-item" onClick={onTap} role="button" tabIndex={0}>
      <div className="feed-item__icon">{iconMap[item.iconKey]}</div>

      <div className="feed-item__body">
        <div className="feed-item__top">
          <div className="feed-item__title">{item.title}</div>
          <div className="feed-item__time">{item.time}</div>
        </div>
        <div className="feed-item__bottom">
          <span className="feed-item__model-badge">{item.model}</span>
          <span className="feed-item__preview">{item.preview}</span>
        </div>
      </div>

      <div className="feed-item__actions">
        <button
          className={`feed-item__star ${
            item.isFavorite ? 'feed-item__star--active' : ''
          }`}
          onClick={(e) => onToggleFavorite(item.id, e)}
          aria-label={item.isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star size={14} />
        </button>
        <div className="feed-item__arrow">
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  )
}