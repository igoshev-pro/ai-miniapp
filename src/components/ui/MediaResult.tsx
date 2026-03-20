// src/components/ui/MediaResult.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Download, RefreshCw, Loader2, AlertCircle, Share2,
  ChevronLeft, ChevronRight, Star,
} from 'lucide-react'
import type { Generation } from '@/stores/generation.store'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration } from '@/hooks'
import { toast } from '@/stores/toast.store'

interface Props {
  generation: Generation
  onRetry?: () => void
}

async function downloadFile(url: string, filename: string) {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.downloadFile) {
    try { tg.downloadFile({ url, file_name: filename }); return } catch {}
  }

  const API = process.env.NEXT_PUBLIC_API_URL || ''
  const proxyUrl = `${API}/upload/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  try {
    const token = sessionStorage.getItem('jwt')
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
    toast.info('Ссылка скопирована — откройте в браузере для скачивания')
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

  // Debug
  useEffect(() => {
    console.log('[MediaResult] render:', {
      id: generation.id,
      status,
      type,
      urls,
      resultUrl,
      resultUrls,
    })
  }, [generation.id, status, type, urls.length]) // eslint-disable-line

  // Сброс ошибки картинки при смене URL
  useEffect(() => {
    setImageError(false)
  }, [activeUrl])

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
              <div className="media-result__progress-fill" style={{ width: `${progress}%` }} />
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
          <button className="media-result__retry-btn" onClick={() => { haptic('medium'); onRetry() }}>
            <RefreshCw size={14} /> Попробовать снова
          </button>
        )}
      </div>
    )
  }

  // ── Completed но нет URL ──
  if (status === 'completed' && urls.length === 0) {
    return (
      <div className="media-result media-result--error">
        <AlertCircle size={28} />
        <div className="media-result__error-text">
          Генерация завершена, но результат не получен
        </div>
        <div className="media-result__error-hint" style={{ fontSize: '11px', opacity: 0.6 }}>
          ID: {generation.id}
        </div>
        {onRetry && (
          <button className="media-result__retry-btn" onClick={() => { haptic('medium'); onRetry() }}>
            <RefreshCw size={14} /> Попробовать снова
          </button>
        )}
      </div>
    )
  }

  // ── Completed с результатом ──
  if (urls.length > 0) {
    return (
      <div className="media-result media-result--done">

        {/* ── Image ── */}
        {type === 'image' && (
          <div className="media-result__image-container">
            {imageError ? (
              <div className="media-result__image-fallback" style={{
                padding: '24px', textAlign: 'center', background: 'var(--bg-secondary, #1a1a2e)',
                borderRadius: '12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
              }}>
                                <AlertCircle size={24} />
                <span>Не удалось загрузить изображение</span>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent, #6c5ce7)', fontSize: '12px', textDecoration: 'underline' }}
                >
                  Открыть ссылку
                </a>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeUrl}
                alt={`Результат ${currentIndex + 1}`}
                className="media-result__image"
                loading="lazy"
                onError={() => {
                  console.error('[MediaResult] Image load error:', activeUrl)
                  setImageError(true)
                }}
              />
            )}
            {hasMultiple && !imageError && (
              <>
                <button
                  className="media-result__nav media-result__nav--prev"
                  onClick={() => { setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1)); haptic('light') }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="media-result__nav media-result__nav--next"
                  onClick={() => { setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0)); haptic('light') }}
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
          <div className="media-result__video-container">
            <video
              key={activeUrl}
              src={activeUrl}
              controls
              playsInline
              className="media-result__video"
              preload="metadata"
              onError={(e) => {
                console.error('[MediaResult] Video load error:', activeUrl, e)
              }}
            />
            {hasMultiple && (
              <div className="media-result__video-nav" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px', padding: '6px 0',
              }}>
                <button onClick={() => { setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1)); haptic('light') }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', opacity: 0.7 }}>{currentIndex + 1} / {urls.length}</span>
                <button onClick={() => { setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0)); haptic('light') }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Audio ── */}
        {type === 'audio' && (
          <div className="media-result__audio-wrap">
            <audio
              key={activeUrl}
              src={activeUrl}
              controls
              className="media-result__audio"
              preload="metadata"
              onError={(e) => {
                console.error('[MediaResult] Audio load error:', activeUrl, e)
              }}
            />
            {hasMultiple && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px', padding: '6px 0', fontSize: '13px',
              }}>
                <button onClick={() => { setCurrentIndex((i) => (i > 0 ? i - 1 : urls.length - 1)); haptic('light') }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ opacity: 0.7 }}>{currentIndex + 1} / {urls.length}</span>
                <button onClick={() => { setCurrentIndex((i) => (i < urls.length - 1 ? i + 1 : 0)); haptic('light') }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="media-result__actions">
          {/* Избранное */}
          <button
            className={`media-result__action-btn ${generation.isFavorite ? 'media-result__action-btn--active' : ''}`}
            onClick={() => { haptic('light'); toggleFavorite(generation.id) }}
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
            {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
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
              {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              Все ({urls.length})
            </button>
          )}

          {/* Копировать ссылку */}
          <button
            className="media-result__action-btn"
            onClick={() => {
              haptic('light')
              navigator.clipboard.writeText(activeUrl)
                .then(() => toast.info('Ссылка скопирована'))
                .catch(() => {})
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