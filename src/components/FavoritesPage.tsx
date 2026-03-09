// src/components/FavoritesPage.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Music,
  Loader2,
  Search,
  Filter,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

type FavoriteType = 'all' | 'chat' | 'image' | 'video' | 'audio'

interface FavoriteItem {
  id: string
  type: 'chat' | 'image' | 'video' | 'audio'
  model: string
  title: string
  preview?: string
  thumbnailUrl?: string
  resultUrl?: string
  createdAt: string
}

interface Props {
  onOpenChat?: (chatId: string, model: string) => void
  onOpenGeneration?: (type: string) => void
}

export function FavoritesPage({ onOpenChat, onOpenGeneration }: Props) {
  const { haptic, hapticNotification } = useTelegram()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FavoriteType>('all')

  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = filter !== 'all' ? `?type=${filter}` : ''
      const { data } = await apiClient.get<{ favorites: FavoriteItem[] }>(
        `${ENDPOINTS.FAVORITES}${params}`,
      )
      setFavorites(data.favorites)
    } catch {
      // Fallback — пустой список
      setFavorites([])
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const removeFavorite = useCallback(
    async (id: string) => {
      haptic('medium')
      try {
        await apiClient.delete(`${ENDPOINTS.FAVORITES}/${id}`)
        setFavorites((prev) => prev.filter((f) => f.id !== id))
        toast.info('Удалено из избранного')
      } catch (err) {
        if (isApiError(err)) {
          toast.error(err.message || 'Ошибка')
        }
      }
    },
    [haptic],
  )

  const handleTap = useCallback(
    (item: FavoriteItem) => {
      haptic('light')
      if (item.type === 'chat' && onOpenChat) {
        onOpenChat(item.id, item.model)
      } else if (onOpenGeneration) {
        onOpenGeneration(item.type)
      }
    },
    [haptic, onOpenChat, onOpenGeneration],
  )

  const typeIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageSquare size={14} />
      case 'image': return <ImageIcon size={14} />
      case 'video': return <Video size={14} />
      case 'audio': return <Music size={14} />
      default: return <Star size={14} />
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'chat': return 'Чат'
      case 'image': return 'Картинка'
      case 'video': return 'Видео'
      case 'audio': return 'Аудио'
      default: return type
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Только что'
    if (mins < 60) return `${mins} мин назад`
    if (hours < 24) return `${hours}ч назад`
    if (days < 7) return `${days}д назад`
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  const filtered = favorites

  return (
    <div className="favorites-page">
      <div className="favorites-page__header fade-in fade-in--1">
        <div className="favorites-page__title">
          <Star size={18} />
          Избранное
        </div>
        <div className="favorites-page__count">{favorites.length}</div>
      </div>

      {/* Фильтры */}
      <div className="favorites-page__filters fade-in fade-in--1">
        {(['all', 'chat', 'image', 'video', 'audio'] as FavoriteType[]).map((f) => (
          <button
            key={f}
            className={`favorites-filter ${filter === f ? 'favorites-filter--active' : ''}`}
            onClick={() => {
              setFilter(f)
              haptic('light')
            }}
          >
            {f === 'all' ? (
              <>
                <Filter size={12} />
                Все
              </>
            ) : (
              <>
                {typeIcon(f)}
                {typeLabel(f)}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Список */}
      <div className="favorites-page__list fade-in fade-in--2">
        {isLoading ? (
          <div className="chats-history__loading">
            <Loader2 size={20} className="spin" />
            <span>Загрузка...</span>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((item) => (
            <div key={item.id} className="favorite-card" onClick={() => handleTap(item)}>
              {/* Превью */}
              {item.thumbnailUrl && (
                <div className="favorite-card__thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnailUrl} alt="" />
                </div>
              )}

              <div className="favorite-card__body">
                <div className="favorite-card__top">
                  <span className="favorite-card__type-badge">
                    {typeIcon(item.type)}
                    {typeLabel(item.type)}
                  </span>
                  <span className="favorite-card__model">{item.model}</span>
                </div>

                <div className="favorite-card__title">{item.title}</div>

                {item.preview && (
                  <div className="favorite-card__preview">{item.preview}</div>
                )}

                <div className="favorite-card__bottom">
                  <span className="favorite-card__date">{formatDate(item.createdAt)}</span>
                </div>
              </div>

              <button
                className="favorite-card__remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFavorite(item.id)
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="favorites-page__empty">
            <Star size={32} />
            <div className="favorites-page__empty-title">Пусто</div>
            <div className="favorites-page__empty-text">
              Добавляйте чаты и генерации в избранное, чтобы быстро находить их
            </div>
          </div>
        )}
      </div>
    </div>
  )
}