'use client'

import { useState, useCallback } from 'react'
import {
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react'
import type { Generation } from '@/stores/generation.store'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration } from '@/hooks'
import { toast } from '@/stores/toast.store'

interface Props {
  generation: Generation
  onRetry?: () => void
}

// ──── Безопасное скачивание (без window.open — он убивает TG WebApp) ────
async function downloadFile(url: string, filename: string) {
  const tg = (window as any).Telegram?.WebApp

  // 1. Telegram native download
  if (tg?.downloadFile) {
    try {
      tg.downloadFile({ url, file_name: filename })
      return
    } catch {
      // fallback ниже
    }
  }

  // 2. Через бэкенд-прокси (обходит CORS)
  const API = process.env.NEXT_PUBLIC_API_URL || ''
  const proxyUrl = `${API}/upload/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`

  try {
    const token = sessionStorage.getItem('jwt')
    const resp = await fetch(proxyUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.ok) {
      const blob = await resp.blob()
      triggerBlobDownload(blob, filename)
      return
    }
  } catch {
    // fallback ниже
  }

  // 3. Прямой fetch (может не сработать из-за CORS)
  try {
    const resp = await fetch(url)
    if (resp.ok) {
      const blob = await resp.blob()
      triggerBlobDownload(blob, filename)
      return
    }
  } catch {
    // fallback ниже
  }

  // 4. Копируем ссылку вместо window.open (window.open убьёт TG WebApp!)
  try {
    await navigator.clipboard.writeText(url)
    toast.info('Ссылка скопирована — откройте в браузере для скачивания')
  } catch {
    // совсем крайний случай
  }
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

export function MediaResult({ generation, onRetry }: Props) {
  const { haptic } = useTelegram()
  const { toggleFavorite } = useGeneration()
  const { status, progress, resultUrl, resultUrls, error, type, refunded } = generation
  const [currentIndex, setCurrentIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)

  const urls = resultUrls?.length ? resultUrls : resultUrl ? [resultUrl] : []
  const activeUrl = urls[currentIndex] || ''
  const hasMultiple = urls.length > 1

  const handleDownload = useCallback(async () => {
    if (!activeUrl || downloading) return
    haptic('light')
    setDownloading(true)
    try {
      const ext = getFileExtension(activeUrl, type)
      const timestamp = Date.now()
      const filename = `spichki_${type}_${timestamp}_${currentIndex + 1}.${ext}`
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
        const timestamp = Date.now()
        await downloadFile(urls[i], `spichki_${type}_${timestamp}_${i + 1}.${ext}`)
        if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 500))
      }
    } catch {
      toast.error('Ошибка при скачивании')
    } finally {
      setDownloading(false)
    }
  }, [urls, type, hasMultiple, downloading, haptic])

  // ── Pending / Processing ──
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="media-result media-result--loading">
        <div className="media-result__spinner">
          <Loader2 size={28} className="spin" />
        </div>
        <div className="media-result__status">
          {status === 'pending' ? 'В очереди...' : 'Генерация...'}
        </div>
        {progress > 0 && (
          <div className="media-result__progress">
            <div className="media-result__progress-bar">
              <div
                className="media-result__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="media-result__progress-text">{progress}%</span>
          </div>
        )}
        <div className="media-result__hint">
          {type === 'video'
            ? 'Видео может генерироваться до 5 минут'
            : type === 'audio'
              ? 'Обычно занимает 30-60 секунд'
              : 'Обычно занимает 10-30 секунд'}
        </div>
      </div>
    )
  }

  // ── Failed ──
  if (status === 'failed') {
    return (
      <div className="media-result media-result--error">
        <AlertCircle size={28} />
        <div className="media-result__error-text">{error || 'Ошибка генерации'}</div>
        {refunded !== false && (
          <div className="media-result__error-hint">Спички возвращены на баланс</div>
        )}
        {onRetry && (
          <button
            className="media-result__retry-btn"
            onClick={() => {
              haptic('medium')
              onRetry()
            }}
          >
            <RefreshCw size={14} />
            Попробовать снова
          </button>
        )}
      </div>
    )
  }

  // ── Completed ──
  if (status === 'completed' && urls.length > 0) {
    return (
      <div className="media-result media-result--done">
        {/* ── Image ── */}
        {type === 'image' && (
          <div className="media-result__image-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={`Результат ${currentIndex + 1}`}
              className="media-result__image"
              loading="lazy"
            />
            {hasMultiple && (
              <>
                <button
                  className="media-result__nav media-result__nav--prev"
                  onClick={() => {
                    setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1))
                    haptic('light')
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="media-result__nav media-result__nav--next"
                  onClick={() => {
                    setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0))
                    haptic('light')
                  }}
                >
                  <ChevronRight size={18} />
                </button>
                <div className="media-result__dots">
                  {urls.map((_, i) => (
                    <span
                      key={i}
                      className={`media-result__dot ${i === currentIndex ? 'media-result__dot--active' : ''}`}
                    />
                  ))}
                </div>
                <div className="media-result__counter">
                  {currentIndex + 1} / {urls.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Video ── */}
        {type === 'video' && (
          <video
            src={activeUrl}
            controls
            playsInline
            className="media-result__video"
            preload="metadata"
          />
        )}

        {/* ── Audio ── */}
        {type === 'audio' && (
          <div className="media-result__audio-wrap">
            <audio
              src={activeUrl}
              controls
              className="media-result__audio"
              preload="metadata"
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div className="media-result__actions">
          {/* Избранное — через бэкенд API */}
          <button
            className={`media-result__action-btn ${generation.isFavorite ? 'media-result__action-btn--active' : ''}`}
            onClick={() => {
              haptic('light')
              toggleFavorite(generation.id)
            }}
          >
            <Star size={14} fill={generation.isFavorite ? 'currentColor' : 'none'} />
            {generation.isFavorite ? 'В избранном' : 'В избранное'}
          </button>

          {/* Скачать текущий */}
          <button
            className="media-result__action-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Download size={14} />
            )}
            {downloading
              ? 'Скачивание...'
              : hasMultiple
                ? `Скачать (${currentIndex + 1}/${urls.length})`
                : 'Скачать'}
          </button>
          {/* Скачать все */}
          {hasMultiple && (
            <button
              className="media-result__action-btn"
              onClick={handleDownloadAll}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Download size={14} />
              )}
              Все ({urls.length})
            </button>
          )}

          {/* Скопировать ссылку */}
          <button
            className="media-result__action-btn"
            onClick={() => {
              haptic('light')
              navigator.clipboard
                .writeText(activeUrl)
                .then(() => toast.info('Ссылка скопирована'))
                .catch(() => { })
            }}
          >
            <Share2 size={14} />
            Ссылка
          </button>
        </div>
      </div>
    )
  }

  return null
}
