'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, X, Check, Upload, Images, AlertCircle } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS } from '@/lib/api'

/**
 * Выбор картинки из своей истории — сгенерированной или ранее загруженной.
 *
 * Нужен, чтобы не перезагружать с телефона то, что уже лежит на сервере:
 * типичный сценарий — сделать картинку, а потом отдать её же референсом
 * в видео. Отдаёт готовые URL, поэтому загрузка не требуется вовсе.
 *
 * Множественный выбор ограничен свободными слотами модели (maxSelect):
 * набрать больше, чем влезет, и упереться в ошибку после выбора — хуже,
 * чем не дать выбрать лишнее сразу.
 */

type Tab = 'generated' | 'uploaded'

interface PickItem {
  id: string
  url: string
  /** Подпись под превью: промпт для генераций, имя файла для загрузок. */
  caption: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** Сколько ещё картинок можно взять. 0 — выбор заблокирован. */
  maxSelect: number
  onPick: (urls: string[]) => void
  /** Открыть системный диалог загрузки — «Загрузить с устройства». */
  onUploadInstead?: () => void
}

const PAGE_LIMIT = 30

export function MediaPicker({
  open,
  onClose,
  maxSelect,
  onPick,
  onUploadInstead,
}: Props) {
  const { haptic } = useTelegram()

  const [tab, setTab] = useState<Tab>('generated')
  const [items, setItems] = useState<PickItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const reqId = useRef(0)

  const load = useCallback(async (which: Tab) => {
    // Счётчик запросов: при быстром переключении вкладок ответ на
    // предыдущую может прийти позже и подменить актуальный список.
    const my = ++reqId.current
    setIsLoading(true)
    setFailed(false)

    try {
      if (which === 'generated') {
        const { data } = await apiClient.get<any>(ENDPOINTS.GENERATION_HISTORY, {
          params: { type: 'image', limit: PAGE_LIMIT },
        })
        if (my !== reqId.current) return

        const list: PickItem[] = (data.data?.generations || [])
          .filter((g: any) => g.status === 'completed' && g.resultUrls?.length)
          .flatMap((g: any) =>
            (g.resultUrls as string[]).map((url, i) => ({
              id: `${g.id || g._id}-${i}`,
              url,
              caption: g.prompt || 'Без промпта',
            })),
          )
        setItems(list)
      } else {
        const { data } = await apiClient.get<any>(ENDPOINTS.UPLOADS_MY, {
          params: { kind: 'image', limit: PAGE_LIMIT },
        })
        if (my !== reqId.current) return

        const list: PickItem[] = (data.data?.uploads || []).map((u: any) => ({
          id: u.id,
          url: u.url,
          caption: u.originalName || 'Файл',
        }))
        setItems(list)
      }
    } catch {
      if (my !== reqId.current) return
      setItems([])
      setFailed(true)
    } finally {
      if (my === reqId.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setSelected([])
    load(tab)
  }, [open, tab, load])

  const toggle = useCallback(
    (url: string) => {
      haptic('light')
      setSelected((prev) => {
        if (prev.includes(url)) return prev.filter((u) => u !== url)
        if (prev.length >= maxSelect) return prev // больше не влезет
        return [...prev, url]
      })
    },
    [maxSelect, haptic],
  )

  const confirm = useCallback(() => {
    if (selected.length === 0) return
    onPick(selected)
    onClose()
  }, [selected, onPick, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Лист прижат к низу, но на мобильном под ним стоит BottomNav (fixed,
          высота 84px + safe-area). Без нижнего отступа жёлтая кнопка
          «Добавить» уезжает под панель и до неё не дотянуться —
          поэтому поднимаем лист на высоту навигации и на неё же
          уменьшаем максимальную высоту. На десктопе панели нет. */}
      <div
        className="
          media-picker__layer
          fixed inset-0 z-[101] flex items-end sm:items-center justify-center
          p-0 sm:p-4 pointer-events-none
        "
      >
        <div
          className="
            media-picker__sheet
            w-full sm:max-w-[520px]
            flex flex-col
            rounded-t-[20px] sm:rounded-[var(--radius-md)]
            bg-[rgba(18,18,22,0.98)]
            border border-white/[0.08]
            pointer-events-auto
          "
        >
          {/* Шапка */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <div className="text-[16px] font-bold text-white">
              Добавить изображение
            </div>
            <button
              className="
                w-7 h-7 rounded-full shrink-0
                bg-white/[0.06] text-white/60
                flex items-center justify-center
                cursor-pointer border-none
                transition-transform duration-150 active:scale-90
              "
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X size={15} />
            </button>
          </div>

          {/* Загрузка с устройства — первым действием, а не внизу списка.
              Это привычный путь; выбор из истории лишь дополняет его. */}
          {onUploadInstead && (
            <div className="px-4 pb-3 shrink-0">
              <button
                className="
                  w-full flex items-center justify-center gap-2
                  py-3 rounded-[10px]
                  bg-white/[0.05] border border-dashed border-white/[0.14]
                  text-[13px] font-semibold text-white/80 font-[inherit]
                  cursor-pointer
                  transition-all duration-150
                  active:scale-[0.98] active:bg-white/[0.08]
                "
                onClick={() => {
                  onClose()
                  onUploadInstead()
                }}
              >
                <Upload size={15} />
                Загрузить с устройства
              </button>
            </div>
          )}

          {/* Разделитель: ниже — то, что уже есть на сервере */}
          <div className="flex items-center gap-3 px-4 pb-2 shrink-0">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] text-white/30 whitespace-nowrap">
              или выбрать из своих
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Вкладки */}
          <div className="flex gap-4 px-4 border-b border-white/[0.06] shrink-0">
            {([
              { id: 'generated' as Tab, label: 'Сгенерированные' },
              { id: 'uploaded' as Tab, label: 'Загруженные' },
            ]).map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  className={`
                    relative pb-2.5 px-0.5 shrink-0
                    text-[13px] font-semibold font-[inherit]
                    bg-transparent border-none cursor-pointer
                    transition-colors duration-150
                    ${active ? 'text-[var(--accent-yellow)]' : 'text-white/40'}
                  `}
                  onClick={() => {
                    if (tab === t.id) return
                    haptic('light')
                    setTab(t.id)
                  }}
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--accent-yellow)] rounded-full" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Содержимое */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[180px]">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-white/30" />
              </div>
            ) : failed ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <AlertCircle size={24} className="text-white/25" />
                <div className="text-[13px] text-white/50">
                  Не удалось загрузить
                </div>
                <button
                  className="
                    mt-1 py-1.5 px-3 rounded-[8px]
                    bg-white/[0.06] border border-white/[0.08]
                    text-[12px] text-white/70 font-[inherit] cursor-pointer
                  "
                  onClick={() => load(tab)}
                >
                  Повторить
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Images size={24} className="text-white/20" />
                <div className="text-[13px] text-white/45 max-w-[240px] leading-[1.5]">
                  {tab === 'generated'
                    ? 'Вы ещё ничего не генерировали'
                    : 'Вы ещё ничего не загружали'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {items.map((it) => {
                  const idx = selected.indexOf(it.url)
                  const isSel = idx !== -1
                  const full = !isSel && selected.length >= maxSelect

                  return (
                    <button
                      key={it.id}
                      title={it.caption}
                      disabled={full}
                      className={`
                        relative aspect-square
                        rounded-[var(--radius-xs)] overflow-hidden
                        border-2 p-0 cursor-pointer
                        transition-all duration-150
                        active:scale-[0.96]
                        [-webkit-tap-highlight-color:transparent]
                        ${isSel
                          ? 'border-[var(--accent-yellow)]'
                          : 'border-transparent'
                        }
                        ${full ? 'opacity-35 cursor-default active:scale-100' : ''}
                      `}
                      onClick={() => toggle(it.url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.url}
                        alt={it.caption.slice(0, 40)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSel && (
                        <span
                          className="
                            absolute top-1 right-1
                            w-5 h-5 rounded-full
                            bg-[var(--accent-yellow)] text-black
                            flex items-center justify-center
                            text-[10px] font-bold
                          "
                        >
                          {maxSelect > 1 ? idx + 1 : <Check size={11} />}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Низ — только подтверждение выбора: загрузка вынесена наверх */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] shrink-0">
            <button
              disabled={selected.length === 0}
              className="
                flex-1 py-2.5 rounded-[10px]
                bg-[var(--accent-yellow)] text-black
                text-[13px] font-bold font-[inherit]
                border-none cursor-pointer
                transition-all duration-150 active:scale-[0.98]
                disabled:opacity-35 disabled:cursor-default disabled:active:scale-100
              "
              onClick={confirm}
            >
              {selected.length === 0
                ? 'Выберите фото'
                : `Добавить${selected.length > 1 ? ` (${selected.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
