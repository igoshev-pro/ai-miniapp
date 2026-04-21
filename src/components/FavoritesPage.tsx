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
import { useModels } from '@/hooks'

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
  subtype?: string
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
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
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
    subtype: fav.metadata?.type || undefined,
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
  const { models: allModels } = useModels()

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FavoriteType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

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

  const loadFavorites = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (pageNum === 1) setIsLoading(true)
        else setIsLoadingMore(true)

        const params: Record<string, string | number> = { page: pageNum, limit: 20 }
        if (filter !== 'all') params.type = filter

        const { data } = await apiClient.get<FavoritesResponse>(ENDPOINTS.FAVORITES, { params })

        const items = (data.data?.favorites || []).map(mapFavorite)
        const totalPages = data.data?.pagination?.pages || 1

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
    },
    [filter],
  )

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
        onOpenChat?.(item.model || 'gpt-4o-mini', item.itemId)
      } else if (item.type === 'generation') {
        onOpenGeneration?.(item.subtype || 'image')
      } else if (item.type === 'model') {
        const modelData = allModels.find((m: any) => m.slug === item.itemId)
        const category = modelData?.category || 'text'

        if (category === 'text') {
          onOpenChat?.(item.itemId, '')
        } else {
          onOpenGeneration?.(category)
        }
      }
    },
    [haptic, onOpenChat, onOpenGeneration, allModels],
  )

  const typeIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare size={14} />
      case 'generation':
        return <ImageIcon size={14} />
      case 'model':
        return <Layers size={14} />
      default:
        return <Star size={14} />
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'Чат'
      case 'generation':
        return 'Генерация'
      case 'model':
        return 'Модель'
      default:
        return type
    }
  }

  const filterLabel = (type: FavoriteType) => {
    switch (type) {
      case 'all':
        return 'Все'
      case 'conversation':
        return 'Чаты'
      case 'generation':
        return 'Генерации'
      case 'model':
        return 'Модели'
      default:
        return type
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
    <div className="favorites-page px-4 pb-[100px]">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2 fade-in fade-in--1">
        <div className="flex items-center gap-2 text-[20px] font-bold text-white">
          <Star size={18} />
          Избранное
        </div>
        <div className="text-[13px] text-white/30 bg-white/[0.06] py-[3px] px-2.5 rounded-[10px]">
          {favorites.length}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 pb-3 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none fade-in fade-in--1">
        {(['all', 'conversation', 'generation', 'model'] as FavoriteType[]).map((f) => (
          <button
            key={f}
            className={`
              shrink-0 flex items-center gap-1
              py-[7px] px-3
              rounded-[8px] border
              text-[12px] font-[inherit]
              cursor-pointer transition-all duration-150
              [-webkit-tap-highlight-color:transparent]
              ${
                filter === f
                  ? 'bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.3)] text-[#fbbf24]'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/50'
              }
            `}
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

      {/* List */}
      <div className="favorites-page__list flex flex-col gap-1.5 fade-in fade-in--2">
        {isLoading ? (
          /* Loading */
          <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
            <Loader2 size={20} className="spin" />
            <span>Загрузка...</span>
          </div>
        ) : favorites.length > 0 ? (
          <>
            {favorites.map((item) => (
              <div
                key={item.favoriteId}
                className="
                  favorite-card
                  flex items-start gap-2.5
                  p-3
                  bg-white/[0.02] border border-white/[0.04]
                  rounded-[12px]
                  cursor-pointer transition-[background] duration-150
                  active:bg-white/[0.05]
                "
                onClick={() => handleTap(item)}
              >
                {/* Thumbnail */}
                {item.thumbnailUrl && (
                  <div className="w-12 h-12 rounded-[8px] overflow-hidden shrink-0 bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 min-w-0">
                  {/* Top: type badge + model */}
                  <div className="flex items-center gap-1.5 mb-[3px]">
                    <span className="flex items-center gap-[3px] text-[10px] text-white/40 bg-white/[0.06] py-[2px] px-1.5 rounded">
                      {typeIcon(item.type)}
                      {typeLabel(item.type)}
                    </span>
                    {item.model && (
                      <span className="text-[10px] text-white/30">{item.model}</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="text-[13px] text-white/85 truncate">
                    {item.title}
                  </div>

                  {/* Preview */}
                  {item.preview && (
                    <div className="text-[11px] text-white/30 mt-0.5 truncate">
                      {item.preview}
                    </div>
                  )}

                  {/* Date */}
                  <div className="mt-1">
                    <span className="text-[10px] text-white/20">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  className="
                    shrink-0 bg-transparent border-none
                    p-1.5 text-white/20
                    cursor-pointer transition-colors duration-150
                    hover:text-[#f87171]
                  "
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFavorite(item)
                  }}
                >
                  <Trash2 size={14} />
                </button>
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
          /* Empty */
          <div className="flex flex-col items-center gap-2 py-[60px] px-5 text-white/20 text-center">
            <Star size={32} />
            <div className="text-[16px] font-semibold text-white/40">Пусто</div>
            <div className="text-[13px] max-w-[240px]">
              Добавляйте чаты и генерации в избранное, чтобы быстро находить их
            </div>
          </div>
        )}
      </div>
    </div>
  )
}