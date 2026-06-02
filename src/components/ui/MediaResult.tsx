// src/components/ui/MediaResult.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Download, RefreshCw, Loader2, AlertCircle, Share2,
  ChevronLeft, ChevronRight, Star, ExternalLink, DownloadCloud,
} from 'lucide-react'
import type { Generation } from '@/stores/generation.store'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration } from '@/hooks'
import { toast } from '@/stores/toast.store'
import { useAuthStore } from '@/stores'

interface Props {
  generation: Generation
  onRetry?: () => void
}

/* ─── Helpers ─── */

async function downloadFile(url: string, filename: string) {
  // ⚠️ tg.downloadFile() убран — он показывает нативную модалку Telegram
  //    с подтверждением и длинным URL. Качаем сразу через blob.

  const API = process.env.NEXT_PUBLIC_API_URL || ''
  const proxyUrl = `${API}/upload/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  try {
    const token = useAuthStore.getState().token
    const resp = await fetch(proxyUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.ok) { triggerBlobDownload(await resp.blob(), filename); return }
  } catch {}

  try {
    const resp = await fetch(url)
    if (resp.ok) { triggerBlobDownload(await resp.blob(), filename); return }
  } catch {}

  try {
    await navigator.clipboard.writeText(url)
    toast.info('Ссылка скопирована — откройте в браузере')
  } catch {}
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
}

function getFileExtension(url: string, type: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  if (match) return match[1].toLowerCase()
  if (type === 'image') return 'png'
  if (type === 'video') return 'mp4'
  if (type === 'audio') return 'mp3'
  return 'bin'
}

/* ─── Component ─── */

export function MediaResult({ generation, onRetry }: Props) {
  const { haptic } = useTelegram()
  const { toggleFavorite } = useGeneration()
  const { status, progress, resultUrl, resultUrls, error, type, refunded } = generation

  const [currentIndex, setCurrentIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const urls = resultUrls?.length ? resultUrls : resultUrl ? [resultUrl] : []
  const activeUrl = urls[currentIndex] || ''
  const hasMultiple = urls.length > 1

  useEffect(() => { setImageError(false) }, [activeUrl])

  const handleDownload = useCallback(async () => {
    if (!activeUrl || downloading) return
    haptic('light')
    setDownloading(true)
    try {
      const ext = getFileExtension(activeUrl, type)
      const filename = `spichki_${type}_${Date.now()}_${currentIndex + 1}.${ext}`
      await downloadFile(activeUrl, filename)
    } catch {
      toast.error('Не удалось скачать файл')
    } finally {
      setDownloading(false)
    }
  }, [activeUrl, type, currentIndex, downloading, haptic])

  const handleDownloadAll = useCallback(async () => {
    if (!hasMultiple || downloading) return
    haptic('medium')
    setDownloading(true)
    try {
      for (let i = 0; i < urls.length; i++) {
        const ext = getFileExtension(urls[i], type)
        await downloadFile(urls[i], `spichki_${type}_${Date.now()}_${i + 1}.${ext}`)
        if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 500))
      }
      toast.success(`Скачано ${urls.length} файлов`)
    } catch {
      toast.error('Ошибка при скачивании')
    } finally {
      setDownloading(false)
    }
  }, [urls, type, hasMultiple, downloading, haptic])

  const handleCopyLink = useCallback(() => {
    if (!activeUrl) return
    haptic('light')
    navigator.clipboard.writeText(activeUrl)
      .then(() => toast.info('Ссылка скопирована'))
      .catch(() => toast.error('Не удалось скопировать'))
  }, [activeUrl, haptic])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1))
    haptic('light')
  }, [urls.length, haptic])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0))
    haptic('light')
  }, [urls.length, haptic])

  /* ─── Pending / Processing ─── */
  if (status === 'pending' || status === 'processing') {
    return (
      <div
        className="
          flex flex-col items-center justify-center gap-2.5
          py-8 px-5
          rounded-[14px]
          border border-white/[0.06]
          bg-white/[0.02]
        "
      >
        <Loader2 size={28} className="text-amber-400 animate-spin" />
        <div className="text-[14px] font-medium text-white/80">
          {status === 'pending' ? 'В очереди...' : 'Генерация...'}
        </div>
        {progress > 0 && (
          <div className="flex items-center gap-2.5 w-full max-w-[240px] mt-1">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-amber-400 shrink-0 tabular-nums">
              {progress}%
            </span>
          </div>
        )}
        <div className="text-[12px] text-white/35 text-center mt-0.5">
          {type === 'video' && 'Видео может генерироваться до 5 минут'}
          {type === 'audio' && 'Обычно занимает 30–60 секунд'}
          {type === 'image' && 'Обычно занимает 10–30 секунд'}
        </div>
      </div>
    )
  }

  /* ─── Failed ─── */
  if (status === 'failed') {
    return (
      <div
        className="
          flex flex-col items-center justify-center gap-2
          py-7 px-5
          rounded-[14px]
          border border-red-500/20
          bg-red-500/[0.04]
          text-red-400
        "
      >
        <AlertCircle size={28} />
        <div className="text-[13px] font-medium text-center max-w-[280px]">
          {error || 'Ошибка генерации'}
        </div>
        {refunded !== false && (
          <div className="text-[11px] text-white/40 mt-0.5">
            Спички возвращены на баланс
          </div>
        )}
        {onRetry && (
          <button
            className="
              mt-2 inline-flex items-center gap-1.5
              py-2 px-4 rounded-[10px]
              border border-white/[0.08] bg-white/[0.04]
              text-[12.5px] text-white/70
              cursor-pointer transition-all duration-150
              active:scale-[0.97] active:bg-white/[0.08]
              font-[inherit]
            "
            onClick={() => { haptic('medium'); onRetry() }}
          >
            <RefreshCw size={13} /> Попробовать снова
          </button>
        )}
      </div>
    )
  }

  /* ─── Completed но нет URL ─── */
  if (status === 'completed' && urls.length === 0) {
    return (
      <div
        className="
          flex flex-col items-center justify-center gap-2
          py-7 px-5
          rounded-[14px]
          border border-amber-500/20
          bg-amber-500/[0.04]
          text-amber-400
        "
      >
        <AlertCircle size={28} />
        <div className="text-[13px] font-medium text-white/80 text-center">
          Генерация завершена, но результат не получен
        </div>
        <div className="text-[10px] text-white/30 font-mono">ID: {generation.id}</div>
        {onRetry && (
          <button
            className="
              mt-2 inline-flex items-center gap-1.5
              py-2 px-4 rounded-[10px]
              border border-white/[0.08] bg-white/[0.04]
              text-[12.5px] text-white/70
              cursor-pointer transition-all duration-150
              active:scale-[0.97] active:bg-white/[0.08]
              font-[inherit]
            "
            onClick={() => { haptic('medium'); onRetry() }}
          >
            <RefreshCw size={13} /> Попробовать снова
          </button>
        )}
      </div>
    )
  }

  /* ─── Completed с результатом ─── */
  if (urls.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {/* ── Image ── */}
      {type === 'image' && (
        <div className="relative rounded-[14px] overflow-hidden bg-black/40 border border-white/[0.06]">
          {imageError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-5 text-white/55">
              <AlertCircle size={24} className="text-red-400" />
              <span className="text-[13px]">Не удалось загрузить изображение</span>
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-1
                  text-[12px] text-amber-400 underline
                  decoration-dotted underline-offset-2
                "
              >
                <ExternalLink size={12} /> Открыть ссылку
              </a>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeUrl}
              alt={`Результат ${currentIndex + 1}`}
              className="block w-full h-auto"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          )}

          {hasMultiple && !imageError && (
            <>
              <button
                onClick={goPrev}
                className="
                  absolute top-1/2 left-2 -translate-y-1/2
                  w-8 h-8 rounded-full
                  bg-black/55 backdrop-blur-md
                  border border-white/10
                  flex items-center justify-center
                  text-white/85 cursor-pointer
                  transition active:scale-[0.92]
                "
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goNext}
                className="
                  absolute top-1/2 right-2 -translate-y-1/2
                  w-8 h-8 rounded-full
                  bg-black/55 backdrop-blur-md
                  border border-white/10
                  flex items-center justify-center
                  text-white/85 cursor-pointer
                  transition active:scale-[0.92]
                "
              >
                <ChevronRight size={16} />
              </button>
              <div
                className="
                  absolute bottom-2 left-1/2 -translate-x-1/2
                  flex items-center gap-1
                  py-1 px-2 rounded-full
                  bg-black/55 backdrop-blur-md
                  border border-white/10
                "
              >
                {urls.map((_, i) => (
                  <span
                    key={i}
                    className={`
                      w-1.5 h-1.5 rounded-full transition-all
                      ${i === currentIndex ? 'bg-amber-400 w-3' : 'bg-white/30'}
                    `}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Video ── */}
      {type === 'video' && (
        <div className="rounded-[14px] overflow-hidden bg-black border border-white/[0.06]">
          <video
            key={activeUrl}
            src={activeUrl}
            controls
            playsInline
            preload="metadata"
            className="block w-full h-auto max-h-[60vh]"
          />
        </div>
      )}

      {/* ── Audio ── */}
      {type === 'audio' && (
        <div
          className="
            rounded-[14px] overflow-hidden
            border border-white/[0.06]
            bg-white/[0.02]
            p-2
          "
        >
          <audio
            key={activeUrl}
            src={activeUrl}
            controls
            preload="metadata"
            className="block w-full h-10"
          />
        </div>
      )}

      {/* ── Actions bar ── */}
      <div
        className="
          flex items-center gap-1
          py-1
        "
      >
        {/* Favorite */}
        <ActionBtn
          active={!!generation.isFavorite}
          title={generation.isFavorite ? 'В избранном' : 'В избранное'}
          onClick={() => { haptic('light'); toggleFavorite(generation.id) }}
        >
          <Star size={15} fill={generation.isFavorite ? 'currentColor' : 'none'} />
        </ActionBtn>

        {/* Download current */}
        <ActionBtn
          title={hasMultiple ? `Скачать ${currentIndex + 1} из ${urls.length}` : 'Скачать'}
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading
            ? <Loader2 size={15} className="animate-spin" />
            : <Download size={15} />
          }
        </ActionBtn>

        {/* Download all */}
        {hasMultiple && (
          <ActionBtn
            title={`Скачать все (${urls.length})`}
            disabled={downloading}
            onClick={handleDownloadAll}
          >
            <DownloadCloud size={15} />
          </ActionBtn>
        )}

        {/* Share */}
        <ActionBtn title="Скопировать ссылку" onClick={handleCopyLink}>
          <Share2 size={15} />
        </ActionBtn>

        {/* Pager (когда несколько результатов) */}
        {hasMultiple && (
          <div
            className="
              ml-auto inline-flex items-center
              h-8 rounded-[10px]
              border border-white/[0.08]
              bg-white/[0.04]
              text-white/65
              overflow-hidden
            "
          >
            <button
              onClick={goPrev}
              className="
                w-7 h-8 flex items-center justify-center
                cursor-pointer transition
                active:bg-white/[0.08]
                border-r border-white/[0.06]
              "
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-[11.5px] font-semibold tabular-nums text-white/75">
              {currentIndex + 1} / {urls.length}
            </span>
            <button
              onClick={goNext}
              className="
                w-7 h-8 flex items-center justify-center
                cursor-pointer transition
                active:bg-white/[0.08]
                border-l border-white/[0.06]
              "
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Action button ─── */

function ActionBtn({
  children,
  onClick,
  title,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`
        w-8 h-8 rounded-[10px]
        border flex items-center justify-center
        cursor-pointer transition-all duration-150
        [-webkit-tap-highlight-color:transparent]
        active:scale-[0.92]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${active
          ? 'border-amber-400/35 bg-amber-400/[0.12] text-amber-400'
          : 'border-white/[0.08] bg-white/[0.04] text-white/55 active:bg-white/[0.08] active:text-white/85'
        }
      `}
    >
      {children}
    </button>
  )
}