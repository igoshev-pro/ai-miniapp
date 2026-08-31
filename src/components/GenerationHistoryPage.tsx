'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Images,
  Loader2,
  Image as ImageIcon,
  Clapperboard,
  Music,
  X,
  Star,
  AlertCircle,
  FileText,
  Trash2,
  MessageSquare,
  Layers,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { toast } from '@/stores/toast.store'
import { useModels } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import type { Generation, GenerationType } from '@/stores/generation.store'

/**
 * GenerationHistoryPage — галерея всего, что пользователь сгенерировал.
 *
 * Живёт отдельно от лент внутри страниц генерации: те показывают только
 * текущую сессию и подмешивают активные задачи, а сюда человек приходит
 * искать старую работу. Поэтому здесь своя загрузка с пагинацией, а не
 * общий generation.store (в нём висят последние 50 записей без страниц).
 *
 * Фильтр по типу уходит на бэкенд параметром `type`: тянуть всю историю
 * ради вкладки «Видео» бессмысленно, а индекс { userId, type, createdAt }
 * там уже есть.
 */

type Filter = 'all' | GenerationType | 'document'
/** Вкладки верхнего уровня: что сгенерировано ИИ и что человек загрузил сам. */
type Tab = 'generated' | 'uploaded' | 'favorites'

/** Элемент избранного: это не только генерации, но и чаты с моделями. */
interface FavoriteItem {
  id: string
  favoriteId: string
  type: 'conversation' | 'generation' | 'model'
  subtype?: string
  itemId: string
  title: string
  thumbnailUrl?: string
  model?: string
  createdAt: string
}

interface FavoritesResponse {
  success: boolean
  data: {
    favorites: any[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
}

interface HistoryResponse {
  success: boolean
  data: {
    generations: any[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
}

interface UploadItem {
  id: string
  kind: 'image' | 'video' | 'audio' | 'document'
  url: string
  originalName: string
  size: number
  mimetype: string
  createdAt: string
}

interface UploadsResponse {
  success: boolean
  data: {
    uploads: UploadItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
}

interface Props {
  onBack?: () => void
  /** Открыть страницу генерации нужного типа с этой моделью. */
  onOpenGeneration?: (type: GenerationType, modelSlug?: string) => void
  /** Открыть чат — нужен для избранных чатов и текстовых моделей. */
  onOpenChat?: (modelSlug: string, chatId: string) => void
}

const PAGE_SIZE = 24

/** Тот же маппер, что в useGeneration — бэкенд отдаёт одинаковую форму. */
function mapGeneration(g: any): Generation {
  return {
    id: g.id || g._id,
    type: g.type,
    model: g.modelSlug,
    modelSlug: g.modelSlug,
    prompt: g.prompt || '',
    status: g.status,
    progress: g.status === 'completed' ? 100 : g.progress || 0,
    resultUrl: g.resultUrls?.[0],
    resultUrls: g.resultUrls,
    audioIds: g.metadata?.audioIds,
    tokensUsed: g.tokensCost,
    isFavorite: g.isFavorite,
    error: g.errorMessage,
    settings: g.params,
    createdAt: g.createdAt || new Date().toISOString(),
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Только что'
  if (mins < 60) return `${mins} мин назад`
  if (hours < 24) return `${hours}ч назад`
  if (days < 7) return `${days}д назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const FILTERS: { id: Filter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Все', icon: <Images size={13} /> },
  { id: 'image', label: 'Картинки', icon: <ImageIcon size={13} /> },
  { id: 'video', label: 'Видео', icon: <Clapperboard size={13} /> },
  { id: 'audio', label: 'Аудио', icon: <Music size={13} /> },
]

/** У загрузок есть документы, которых у генераций не бывает. */
const UPLOAD_FILTERS: { id: Filter; label: string; icon: React.ReactNode }[] = [
  ...FILTERS,
  { id: 'document', label: 'Документы', icon: <FileText size={13} /> },
]

/** В избранном лежат ещё чаты и модели — тут свой набор. */
type FavFilter = 'all' | 'generation' | 'conversation' | 'model'

const FAV_FILTERS: { id: FavFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Все', icon: <Star size={13} /> },
  { id: 'generation', label: 'Генерации', icon: <ImageIcon size={13} /> },
  { id: 'conversation', label: 'Чаты', icon: <MessageSquare size={13} /> },
  { id: 'model', label: 'Модели', icon: <Layers size={13} /> },
]

/** Бэкенд отдаёт избранное своей формой — приводим к нашей. */
function mapFavorite(fav: any): FavoriteItem {
  return {
    id: fav.itemId,
    favoriteId: fav._id,
    type: fav.type,
    subtype: fav.metadata?.type || undefined,
    itemId: fav.itemId,
    title: fav.title || 'Без названия',
    thumbnailUrl: fav.previewUrl || undefined,
    model: fav.metadata?.model || fav.metadata?.modelSlug || undefined,
    createdAt: fav.createdAt,
  }
}

/** Размер файла человеку: 2.4 МБ вместо 2516582. */
function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function GenerationHistoryPage({ onBack, onOpenGeneration, onOpenChat }: Props) {
  const { haptic } = useTelegram()
  const { models } = useModels()

  const [tab, setTab] = useState<Tab>('generated')

  const [items, setItems] = useState<Generation[]>([])
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  /** Свой фильтр у избранного: там типы не пересекаются с типами генераций. */
  const [favFilter, setFavFilter] = useState<FavFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState(false)
  const [opened, setOpened] = useState<Generation | null>(null)

  const loaderRef = useRef<HTMLDivElement>(null)

  /** slug → человекочитаемое имя: в истории бэкенд отдаёт только slug. */
  const modelNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of models as any[]) map[m.slug] = m.name
    return map
  }, [models])

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (append) setIsLoadingMore(true)
        else {
          setIsLoading(true)
          setFailed(false)
        }

        const params: Record<string, string | number> = {
          page: pageNum,
          limit: PAGE_SIZE,
        }

        if (tab === 'generated') {
          if (filter !== 'all') params.type = filter

          const { data } = await apiClient.get<HistoryResponse>(
            ENDPOINTS.GENERATION_HISTORY,
            { params },
          )

          const mapped = (data.data?.generations || []).map(mapGeneration)
          const pages = data.data?.pagination?.pages || 1

          setItems((prev) => (append ? [...prev, ...mapped] : mapped))
          setTotal(data.data?.pagination?.total ?? mapped.length)
          setHasMore(pageNum < pages)
        } else if (tab === 'uploaded') {
          // На вкладке загрузок «kind» вместо «type», и есть документы.
          if (filter !== 'all') params.kind = filter

          const { data } = await apiClient.get<UploadsResponse>(
            ENDPOINTS.UPLOADS_MY,
            { params },
          )

          const list = data.data?.uploads || []
          const pages = data.data?.pagination?.pages || 1

          setUploads((prev) => (append ? [...prev, ...list] : list))
          setTotal(data.data?.pagination?.total ?? list.length)
          setHasMore(pageNum < pages)
        } else {
          // Избранное живёт на своём эндпоинте и хранит не только
          // генерации, но и чаты с моделями — фильтры здесь другие.
          if (favFilter !== 'all') params.type = favFilter

          const { data } = await apiClient.get<FavoritesResponse>(
            ENDPOINTS.FAVORITES,
            { params },
          )

          const list = (data.data?.favorites || []).map(mapFavorite)
          const pages = data.data?.pagination?.pages || 1

          setFavorites((prev) => (append ? [...prev, ...list] : list))
          setTotal(data.data?.pagination?.total ?? list.length)
          setHasMore(pageNum < pages)
        }

        setPage(pageNum)
      } catch {
        if (!append) {
          if (tab === 'generated') setItems([])
          else if (tab === 'uploaded') setUploads([])
          else setFavorites([])
          setFailed(true)
        } else {
          toast.error('Не удалось подгрузить ещё')
        }
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [filter, favFilter, tab],
  )

  useEffect(() => {
    load(1, false)
  }, [load])

  // Бесконечная прокрутка
  useEffect(() => {
    const el = loaderRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isLoading) {
          load(page + 1, true)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, isLoading, page, load])

  const toggleFavorite = useCallback(
    async (gen: Generation, e: React.MouseEvent) => {
      e.stopPropagation()
      haptic('light')

      // Оптимистично: ждать ответ ради галочки — раздражает.
      const next = !gen.isFavorite
      setItems((prev) =>
        prev.map((g) => (g.id === gen.id ? { ...g, isFavorite: next } : g)),
      )
      setOpened((o) => (o && o.id === gen.id ? { ...o, isFavorite: next } : o))

      try {
        await apiClient.put(ENDPOINTS.GENERATION_FAVORITE(gen.id))
      } catch {
        setItems((prev) =>
          prev.map((g) =>
            g.id === gen.id ? { ...g, isFavorite: !next } : g,
          ),
        )
        setOpened((o) =>
          o && o.id === gen.id ? { ...o, isFavorite: !next } : o,
        )
        toast.error('Не удалось изменить избранное')
      }
    },
    [haptic],
  )

  const openItem = useCallback(
    (gen: Generation) => {
      haptic('light')
      setOpened(gen)
    },
    [haptic],
  )

  /** Удаление загруженного файла — вместе с файлом в хранилище, безвозвратно. */
  const deleteUpload = useCallback(
    async (item: UploadItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!window.confirm(`Удалить «${item.originalName || 'файл'}»? Это навсегда.`)) {
        return
      }
      haptic('medium')

      const before = uploads
      setUploads((prev) => prev.filter((u) => u.id !== item.id))

      try {
        await apiClient.delete(ENDPOINTS.UPLOADS_DELETE(item.id))
        setTotal((t) => Math.max(0, t - 1))
        toast.info('Файл удалён')
      } catch {
        setUploads(before)
        toast.error('Не удалось удалить файл')
      }
    },
    [uploads, haptic],
  )

  const switchTab = useCallback(
    (next: Tab) => {
      if (tab === next) return
      haptic('light')
      setTab(next)
      // «Документы» есть только у загрузок — на генерациях такой фильтр
      // не дал бы ничего, кроме пустого экрана.
      if (next === 'generated' && filter === 'document') setFilter('all')
      setPage(1)
      setHasMore(false)
      setTotal(0)
    },
    [tab, filter, haptic],
  )

  // Показываем только то, что реально можно посмотреть.
  const visible = useMemo(
    () => items.filter((g) => g.status === 'completed' && g.resultUrl),
    [items],
  )

  const isEmpty =
    tab === 'generated'
      ? visible.length === 0
      : tab === 'uploaded'
        ? uploads.length === 0
        : favorites.length === 0

  /** Открыть элемент избранного — у каждого типа своя цель. */
  const openFavorite = useCallback(
    (item: FavoriteItem) => {
      haptic('light')
      if (item.type === 'conversation') {
        onOpenChat?.(item.model || 'gpt-4o-mini', item.itemId)
      } else if (item.type === 'generation') {
        onOpenGeneration?.((item.subtype as GenerationType) || 'image')
      } else {
        // Модель: текстовую открываем чатом, остальные — генерацией.
        const m = (models as any[]).find((x) => x.slug === item.itemId)
        const category = m?.category || 'text'
        if (category === 'text') onOpenChat?.(item.itemId, '')
        else onOpenGeneration?.(category as GenerationType, item.itemId)
      }
    },
    [haptic, onOpenChat, onOpenGeneration, models],
  )

  /** Убрать из избранного — оптимистично, как звезда на генерациях. */
  const removeFavorite = useCallback(
    async (item: FavoriteItem, e: React.MouseEvent) => {
      e.stopPropagation()
      haptic('medium')

      const before = favorites
      setFavorites((prev) => prev.filter((f) => f.favoriteId !== item.favoriteId))

      try {
        await apiClient.post(ENDPOINTS.FAVORITES_TOGGLE, {
          type: item.type,
          itemId: item.itemId,
        })
        setTotal((t) => Math.max(0, t - 1))
      } catch {
        setFavorites(before)
        toast.error('Не удалось убрать из избранного')
      }
    },
    [favorites, haptic],
  )

  return (
    <div className="px-4 pb-[100px]">
      {/* ── Заголовок ── */}
      <div className="flex items-center justify-between pt-4 pb-2 fade-in fade-in--1">
        <div className="flex items-center gap-2 text-[20px] font-bold text-white">
          <Images size={18} />
          История
        </div>
        {total > 0 && (
          <div className="text-[13px] text-white/30 bg-white/[0.06] py-[3px] px-2.5 rounded-[10px]">
            {total}
          </div>
        )}
      </div>

      {/* ── Вкладки ── */}
      <div className="flex gap-4 border-b border-white/[0.06] mb-3 fade-in fade-in--1 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          { id: 'generated' as Tab, label: 'Сгенерированные' },
          { id: 'uploaded' as Tab, label: 'Загруженные' },
          { id: 'favorites' as Tab, label: 'Избранное' },
        ]).map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              className={`
                relative shrink-0 whitespace-nowrap pb-2.5 px-0.5
                text-[14px] font-semibold font-[inherit]
                bg-transparent border-none cursor-pointer
                transition-colors duration-150
                [-webkit-tap-highlight-color:transparent]
                ${active ? 'text-[var(--accent-yellow)]' : 'text-white/40'}
              `}
              onClick={() => switchTab(t.id)}
            >
              {t.label}
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--accent-yellow)] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Фильтры ── */}
      <div className="flex gap-1.5 pb-3 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none fade-in fade-in--1">
        {tab === 'favorites'
          ? FAV_FILTERS.map((f) => {
              const active = favFilter === f.id
              return (
                <button
                  key={f.id}
                  className={`
                    shrink-0 flex items-center gap-1.5
                    py-[7px] px-3
                    rounded-[8px] border
                    text-[12px] font-medium font-[inherit]
                    cursor-pointer transition-all duration-150
                    [-webkit-tap-highlight-color:transparent]
                    active:scale-[0.96]
                    ${active
                      ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                      : 'bg-white/[0.04] border-white/[0.06] text-[var(--gray-400)]'
                    }
                  `}
                  onClick={() => {
                    if (favFilter === f.id) return
                    haptic('light')
                    setFavFilter(f.id)
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              )
            })
          : (tab === 'uploaded' ? UPLOAD_FILTERS : FILTERS).map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  className={`
                    shrink-0 flex items-center gap-1.5
                    py-[7px] px-3
                    rounded-[8px] border
                    text-[12px] font-medium font-[inherit]
                    cursor-pointer transition-all duration-150
                    [-webkit-tap-highlight-color:transparent]
                    active:scale-[0.96]
                    ${active
                      ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                      : 'bg-white/[0.04] border-white/[0.06] text-[var(--gray-400)]'
                    }
                  `}
                  onClick={() => {
                    if (filter === f.id) return
                    haptic('light')
                    setFilter(f.id)
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              )
            })}
      </div>

      {/* ── Содержимое ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/30">
          <Loader2 size={24} className="animate-spin" />
          <div className="text-[13px]">Загружаем историю…</div>
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle size={28} className="text-white/25" />
          <div className="text-[15px] font-semibold text-white/60">
            Не удалось загрузить историю
          </div>
          <button
            className="
              mt-1 py-2 px-4 rounded-[10px]
              bg-white/[0.06] border border-white/[0.08]
              text-[13px] text-white/70 font-[inherit]
              cursor-pointer transition-all duration-150
              active:scale-[0.97]
            "
            onClick={() => load(1, false)}
          >
            Попробовать снова
          </button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Images size={28} className="text-white/20" />
          <div className="text-[15px] font-semibold text-white/50">
            {filter === 'all' ? 'Здесь пока пусто' : 'Ничего такого ещё нет'}
          </div>
          <div className="text-[13px] text-white/30 max-w-[260px] leading-[1.5]">
            {tab === 'generated'
              ? 'Всё, что вы создадите, появится здесь — можно будет вернуться и скачать в любой момент.'
              : tab === 'uploaded'
                ? 'Здесь будут файлы, которые вы загружали для генерации. Их можно использовать повторно, не загружая заново.'
                : 'Отмечайте звёздочкой генерации, чаты и модели — они соберутся здесь.'}
          </div>
          {tab === 'generated' && onOpenGeneration && (
            <button
              className="
                mt-2 py-2.5 px-5 rounded-[10px]
                bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)]
                text-[13px] text-[var(--accent-yellow)] font-semibold font-[inherit]
                cursor-pointer transition-all duration-150
                active:scale-[0.97]
              "
              onClick={() => {
                haptic('light')
                onOpenGeneration(
                  filter === 'all' || filter === 'document'
                    ? 'image'
                    : (filter as GenerationType),
                )
              }}
            >
              Создать первую
            </button>
          )}
        </div>
      ) : tab === 'favorites' ? (
        <>
          {/* Избранное — список, а не сетка: половина записей это чаты
              и модели без превью, плиткой они выглядели бы пустыми. */}
          <div className="flex flex-col gap-1.5 fade-in fade-in--2">
            {favorites.map((fav) => (
              <div
                key={fav.favoriteId}
                role="button"
                tabIndex={0}
                className="
                  flex items-center gap-3
                  py-[11px] px-[13px]
                  rounded-[var(--radius-sm)]
                  bg-[var(--bg-glass)]
                  border border-[var(--border-glass)]
                  cursor-pointer
                  transition-all duration-200
                  active:scale-[0.98]
                  [-webkit-tap-highlight-color:transparent]
                "
                onClick={() => openFavorite(fav)}
              >
                {/* Превью или иконка типа */}
                {fav.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={fav.thumbnailUrl}
                    alt=""
                    className="w-9 h-9 rounded-[9px] object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`
                      w-9 h-9 rounded-[9px] shrink-0
                      flex items-center justify-center
                      ${fav.type === 'conversation'
                        ? 'text-[#60a5fa] bg-[rgba(96,165,250,0.1)]'
                        : fav.type === 'model'
                          ? 'text-[#4ade80] bg-[rgba(74,222,128,0.1)]'
                          : 'text-[#c084fc] bg-[rgba(192,132,252,0.1)]'
                      }
                    `}
                  >
                    {fav.type === 'conversation' ? (
                      <MessageSquare size={16} />
                    ) : fav.type === 'model' ? (
                      <Layers size={16} />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">
                    {fav.title}
                  </div>
                  <div className="text-[11px] text-[var(--gray-600)] mt-[2px] truncate">
                    {fav.type === 'conversation'
                      ? 'Чат'
                      : fav.type === 'model'
                        ? 'Модель'
                        : 'Генерация'}
                    {' · '}
                    {formatDate(fav.createdAt)}
                  </div>
                </div>

                <button
                  aria-label="Убрать из избранного"
                  className="
                    shrink-0 w-7 h-7 rounded-md
                    flex items-center justify-center
                    text-yellow-400 [&_svg]:fill-yellow-400
                    bg-transparent border-none cursor-pointer
                    transition-transform duration-150
                    active:scale-90
                  "
                  onClick={(e) => removeFavorite(fav, e)}
                >
                  <Star size={15} />
                </button>
              </div>
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <Loader2 size={20} className="animate-spin text-white/30" />
              )}
            </div>
          )}
        </>
      ) : tab === 'uploaded' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 fade-in fade-in--2">
            {uploads.map((up) => (
              <div
                key={up.id}
                className="
                  relative aspect-square
                  rounded-[var(--radius-sm)] overflow-hidden
                  border border-[var(--border-glass)]
                  bg-[var(--bg-glass)]
                "
              >
                {up.kind === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={up.url}
                    alt={up.originalName || 'Загруженный файл'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : up.kind === 'video' ? (
                  <video
                    src={up.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/25">
                    {up.kind === 'audio' ? <Music size={28} /> : <FileText size={28} />}
                  </div>
                )}

                <span
                  className="
                    absolute top-1.5 left-1.5
                    w-6 h-6 rounded-md
                    bg-black/55 backdrop-blur-sm
                    flex items-center justify-center
                    text-white/80
                  "
                >
                  {up.kind === 'video' ? (
                    <Clapperboard size={12} />
                  ) : up.kind === 'audio' ? (
                    <Music size={12} />
                  ) : up.kind === 'document' ? (
                    <FileText size={12} />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                </span>

                <button
                  aria-label="Удалить файл"
                  className="
                    absolute top-1.5 right-1.5
                    w-6 h-6 rounded-md
                    bg-black/55 backdrop-blur-sm
                    flex items-center justify-center
                    text-white/60 cursor-pointer border-none
                    transition-colors duration-150
                    active:scale-90 active:text-red-400
                  "
                  onClick={(e) => deleteUpload(up, e)}
                >
                  <Trash2 size={12} />
                </button>

                <span
                  className="
                    absolute inset-x-0 bottom-0
                    px-2 pt-5 pb-1.5
                    bg-gradient-to-t from-black/85 to-transparent
                    flex flex-col gap-0.5
                  "
                >
                  <span className="text-[10px] text-white/90 font-medium truncate">
                    {up.originalName || 'Файл'}
                  </span>
                  <span className="text-[9px] text-white/45">
                    {formatDate(up.createdAt)}
                    {up.size ? ` · ${formatSize(up.size)}` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <Loader2 size={20} className="animate-spin text-white/30" />
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 fade-in fade-in--2">
            {visible.map((gen) => (
              <button
                key={gen.id}
                className="
                  group relative aspect-square
                  rounded-[var(--radius-sm)] overflow-hidden
                  border border-[var(--border-glass)]
                  bg-[var(--bg-glass)]
                  cursor-pointer p-0
                  transition-all duration-200
                  active:scale-[0.97]
                  [-webkit-tap-highlight-color:transparent]
                "
                onClick={() => openItem(gen)}
              >
                {gen.type === 'audio' ? (
                  <div className="w-full h-full flex items-center justify-center text-white/25">
                    <Music size={28} />
                  </div>
                ) : gen.type === 'video' ? (
                  <video
                    src={gen.resultUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={gen.resultUrl}
                    alt={gen.prompt.slice(0, 60) || 'Генерация'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}

                {/* Тип — слева сверху */}
                <span
                  className="
                    absolute top-1.5 left-1.5
                    w-6 h-6 rounded-md
                    bg-black/55 backdrop-blur-sm
                    flex items-center justify-center
                    text-white/80
                  "
                >
                  {gen.type === 'video' ? (
                    <Clapperboard size={12} />
                  ) : gen.type === 'audio' ? (
                    <Music size={12} />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                </span>

                {/* Избранное — справа сверху */}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={
                    gen.isFavorite ? 'Убрать из избранного' : 'В избранное'
                  }
                  className={`
                    absolute top-1.5 right-1.5
                    w-6 h-6 rounded-md
                    bg-black/55 backdrop-blur-sm
                    flex items-center justify-center
                    transition-colors duration-150
                    ${gen.isFavorite
                      ? 'text-yellow-400 [&_svg]:fill-yellow-400'
                      : 'text-white/60'
                    }
                  `}
                  onClick={(e) => toggleFavorite(gen, e)}
                >
                  <Star size={12} />
                </span>

                {/* Подпись снизу */}
                <span
                  className="
                    absolute inset-x-0 bottom-0
                    px-2 pt-5 pb-1.5
                    bg-gradient-to-t from-black/85 to-transparent
                    text-left
                    flex flex-col gap-0.5
                  "
                >
                  <span className="text-[10px] text-white/90 font-medium line-clamp-2 leading-[1.3]">
                    {gen.prompt || 'Без промпта'}
                  </span>
                  <span className="text-[9px] text-white/45">
                    {formatDate(gen.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <Loader2 size={20} className="animate-spin text-white/30" />
              )}
            </div>
          )}
        </>
      )}

      {/* ── Просмотр одной генерации ── */}
      {opened && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
            onClick={() => setOpened(null)}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="
                w-full max-w-[520px] max-h-[85vh] overflow-y-auto
                rounded-[var(--radius-md)]
                bg-[rgba(18,18,22,0.98)]
                border border-white/[0.08]
                p-4 pointer-events-auto
                flex flex-col gap-3
              "
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 text-[13px] text-white/45 leading-[1.4] break-words">
                  <span className="inline-block text-[10px] font-semibold bg-white/[0.06] px-2 py-0.5 rounded mr-1.5 text-white/50 align-middle">
                    {modelNames[opened.modelSlug] || opened.modelSlug}
                  </span>
                  {opened.prompt || 'Без промпта'}
                </div>
                <button
                  className="
                    shrink-0 w-7 h-7 rounded-full
                    bg-white/[0.06] text-white/60
                    flex items-center justify-center
                    cursor-pointer transition-all duration-150
                    active:scale-90
                  "
                  onClick={() => setOpened(null)}
                  aria-label="Закрыть"
                >
                  <X size={15} />
                </button>
              </div>

              <MediaResult
                generation={opened}
                onRetry={
                  onOpenGeneration
                    ? () => {
                        setOpened(null)
                        onOpenGeneration(opened.type, opened.modelSlug)
                      }
                    : undefined
                }
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-white/30">
                  {formatDate(opened.createdAt)}
                </span>
                <button
                  className={`
                    flex items-center gap-1.5
                    py-1.5 px-3 rounded-[8px]
                    text-[12px] font-medium font-[inherit]
                    border cursor-pointer transition-all duration-150
                    active:scale-[0.96]
                    ${opened.isFavorite
                      ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)] [&_svg]:fill-current'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/50'
                    }
                  `}
                  onClick={(e) => toggleFavorite(opened, e)}
                >
                  <Star size={13} />
                  {opened.isFavorite ? 'В избранном' : 'В избранное'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
