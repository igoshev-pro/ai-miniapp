// src/components/FavoritesPage.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Star,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  Filter,
  Layers,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

type FavoriteType = 'all' | 'conversation' | 'generation' | 'model'

interface BackendFavorite {
  _id: string
  userId: string
  type: string
  itemId: string
  title: string
  previewUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface FavoriteItem {
  id: string
  favoriteId: string
  type: string
  itemId: string
  title: string
  preview?: string
  thumbnailUrl?: string
  model?: string
  createdAt: string
}

interface FavoritesResponse {
  success: boolean
  data: {
    favorites: BackendFavorite[]
    total: number
    page: number
    pages: number
  }
}

interface Props {
  onBack?: () => void
  onOpenChat?: (modelSlug: string, chatId: string) => void
  onOpenGeneration?: (type: string) => void
  onOpenModel?: (modelSlug: string, category: string) => void
}

function mapFavorite(fav: BackendFavorite): FavoriteItem {
  return {
    id: fav.itemId,
    favoriteId: fav._id,
    type: fav.type,
    itemId: fav.itemId,
    title: fav.title || 'Без названия',
    preview: fav.metadata?.preview || undefined,
    thumbnailUrl: fav.previewUrl || undefined,
    model: fav.metadata?.model || fav.metadata?.modelSlug || undefined,
    createdAt: fav.createdAt,
  }
}

export function FavoritesPage({ onBack, onOpenChat, onOpenGeneration, onOpenModel }: Props) {
  const { haptic, webApp } = useTelegram()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FavoriteType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  // ─── Telegram BackButton ───────────────────────────
  useEffect(() => {
    if (webApp?.BackButton && onBack) {
      webApp.BackButton.show()
      const handler = () => onBack()
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack])

  const loadFavorites = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 1) setIsLoading(true)
      else setIsLoadingMore(true)

      const params: Record<string, string | number> = { page: pageNum, limit: 20 }
      if (filter !== 'all') params.type = filter

      const { data } = await apiClient.get<FavoritesResponse>(
        ENDPOINTS.FAVORITES,
        { params },
      )

      const items = (data.data?.favorites || []).map(mapFavorite)
      const totalPages = data.data?.pages || 1

      if (append) {
        setFavorites((prev) => [...prev, ...items])
      } else {
        setFavorites(items)
      }

      setHasMore(pageNum < totalPages)
      setCurrentPage(pageNum)
    } catch {
      if (!append) setFavorites([])
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [filter])

  useEffect(() => {
    loadFavorites(1, false)
  }, [loadFavorites])

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadFavorites(currentPage + 1, true)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, currentPage, loadFavorites])

  const removeFavorite = useCallback(
    async (item: FavoriteItem) => {
      haptic('medium')
      try {
        await apiClient.post(ENDPOINTS.FAVORITES_TOGGLE, {
          type: item.type,
          itemId: item.itemId,
        })
        setFavorites((prev) => prev.filter((f) => f.favoriteId !== item.favoriteId))
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

      if (item.type === 'conversation') {
        // onOpenChat(modelSlug, chatId) — порядок как в openChat
        onOpenChat?.(item.model || 'gpt-4o-mini', item.itemId)
      } else if (item.type === 'generation') {
        onOpenGeneration?.('image')
      } else if (item.type === 'model') {
        // itemId — это slug модели
        onOpenModel?.(item.itemId, 'text')
      }
    },
    [haptic, onOpenChat, onOpenGeneration, onOpenModel],
  )

  const typeIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <MessageSquare size={14} />
      case 'generation': return <ImageIcon size={14} />
      case 'model': return <Layers size={14} />
      default: return <Star size={14} />
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'conversation': return 'Чат'
      case 'generation': return 'Генерация'
      case 'model': return 'Модель'
      default: return type
    }
  }

  const filterLabel = (type: FavoriteType) => {
    switch (type) {
      case 'all': return 'Все'
      case 'conversation': return 'Чаты'
      case 'generation': return 'Генерации'
      case 'model': return 'Модели'
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

  return (
    <div className="favorites-page">
      <div className="favorites-page__header fade-in fade-in--1">
        <div className="favorites-page__title">
          <Star size={18} />
          Избранное
        </div>
        <div className="favorites-page__count">{favorites.length}</div>
      </div>

      <div className="favorites-page__filters fade-in fade-in--1">
        {(['all', 'conversation', 'generation', 'model'] as FavoriteType[]).map((f) => (
          <button
            key={f}
            className={`favorites-filter ${filter === f ? 'favorites-filter--active' : ''}`}
            onClick={() => {
              setFilter(f)
              haptic('light')
            }}
          >
            {f === 'all' ? <Filter size={12} /> : typeIcon(f)}
            {filterLabel(f)}
          </button>
        ))}
      </div>

      <div className="favorites-page__list fade-in fade-in--2">
        {isLoading ? (
          <div className="chats-history__loading">
            <Loader2 size={20} className="spin" />
            <span>Загрузка...</span>
          </div>
        ) : favorites.length > 0 ? (
          <>
            {favorites.map((item) => (
              <div key={item.favoriteId} className="favorite-card" onClick={() => handleTap(item)}>
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
                    {item.model && (
                      <span className="favorite-card__model">{item.model}</span>
                    )}
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
                    removeFavorite(item)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {hasMore && (
              <div ref={loaderRef} className="chats-history__loading" style={{ padding: '16px 0' }}>
                <Loader2 size={16} className="spin" />
              </div>
            )}
          </>
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