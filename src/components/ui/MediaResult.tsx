// src/components/ui/MediaResult.tsx

'use client'

import { useState } from 'react'
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
import { useFavorites } from '@/hooks'

interface Props {
  generation: Generation
  onRetry?: () => void
}

export function MediaResult({ generation, onRetry }: Props) {
  const { haptic } = useTelegram()
  const { toggle: toggleFavorite } = useFavorites()
  const { status, progress, resultUrl, resultUrls, error, type, refunded } = generation
  const [currentIndex, setCurrentIndex] = useState(0)

  const urls = resultUrls?.length ? resultUrls : resultUrl ? [resultUrl] : []
  const activeUrl = urls[currentIndex] || ''
  const hasMultiple = urls.length > 1

  // Pending / Processing
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

  // Failed
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

  // Completed
  if (status === 'completed' && urls.length > 0) {
    return (
      <div className="media-result media-result--done">
        {type === 'image' && (
          <div className="media-result__image-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={`Результат ${currentIndex + 1}`}
              className="media-result__image"
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
              </>
            )}
          </div>
        )}

        {type === 'video' && (
          <video
            src={activeUrl}
            controls
            playsInline
            className="media-result__video"
            preload="metadata"
          />
        )}

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

        <div className="media-result__actions">
          <button
            className="media-result__action-btn"
            onClick={() => {
              haptic('light')
              toggleFavorite(
                'generation',
                generation.id,
                generation.prompt || `${type} генерация`,
                activeUrl,
              )
            }}
          >
            <Star size={14} />
            В избранное
          </button>
          <a
            href={activeUrl}
            download
            className="media-result__action-btn"
            onClick={() => haptic('light')}
          >
            <Download size={14} />
            Скачать{hasMultiple ? ` (${currentIndex + 1}/${urls.length})` : ''}
          </a>
          <button
            className="media-result__action-btn"
            onClick={() => {
              haptic('light')
              if (navigator.share) {
                navigator.share({ url: activeUrl }).catch(() => {})
              } else {
                navigator.clipboard.writeText(activeUrl).catch(() => {})
              }
            }}
          >
            <Share2 size={14} />
            Поделиться
          </button>
        </div>
      </div>
    )
  }

  return null
}