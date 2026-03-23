'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Video, Settings, Wand2,
  Clock, Maximize2, Zap, Loader2, Upload, Image as ImageIcon,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

interface VideoModelCaps {
  aspectRatios: string[]
  durations: number[]
  qualities: string[]
  resolutions: string[]
  supportsImageInput: boolean
  supportsSound: boolean
  supportsRemoveWatermark: boolean
  hasMode: boolean
  hasQuality: boolean
}

const MODEL_CAPS: Record<string, VideoModelCaps> = {
  // ── Существующие ──
  'sora-2': {
    aspectRatios: ['landscape', 'portrait'],
    durations: [10, 15],
    qualities: [],
    resolutions: [],
    supportsImageInput: false,
    supportsSound: false,
    supportsRemoveWatermark: true,
    hasMode: false,
    hasQuality: false,
  },
  'sora-2-img2vid': {
    aspectRatios: ['landscape', 'portrait'],
    durations: [10, 15],
    qualities: [],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: true,
    hasMode: false,
    hasQuality: false,
  },
  'kling-3.0': {
    aspectRatios: ['16:9', '9:16', '1:1'],
    durations: [3, 5, 7, 10, 15],
    qualities: ['720p', '1080p'],
    resolutions: [],
    supportsImageInput: false,
    supportsSound: true,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },
  'kling-3.0-img2vid': {
    aspectRatios: ['16:9', '9:16', '1:1'],
    durations: [3, 5, 7, 10, 15],
    qualities: ['720p', '1080p'],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: true,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },
  'kling-3.0-motion': {
    aspectRatios: [],
    durations: [],
    qualities: ['720p', '1080p'],
    resolutions: [],
    // Motion control требует и image и reference video
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },
  'runway': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    durations: [5, 10],
    qualities: ['720p', '1080p'],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },
  'hailuo-2.3-standard': {
    aspectRatios: [],
    durations: [6, 10],
    qualities: [],
    resolutions: [],
    supportsImageInput: false,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: false,
  },
  'hailuo-2.3-pro': {
    aspectRatios: [],
    durations: [6, 10],
    qualities: [],
    resolutions: ['768P', '1080P'],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: false,
  },

  // ── Новые модели Evolink ──

  // Veo 3.1 Fast — veo-3.1-fast-generate-preview на бэке
  'veo-3.1-fast': {
    aspectRatios: ['16:9', '9:16'],
    // 4, 6, 8 секунд по доке Evolink
    durations: [4, 6, 8],
    qualities: ['720p', '1080p', '4k'],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },

  // Veo 3.1 Pro — veo-3.1-generate-preview на бэке
  'veo-3.1-pro': {
    aspectRatios: ['16:9', '9:16'],
    durations: [4, 6, 8],
    qualities: ['720p', '1080p', '4k'],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },

  // Sora 2 Pro — sora-2-pro-preview на бэке
  // По доке: duration 4/8/12, quality 720p/1080p, image input (без реальных людей)
  'sora-2-pro': {
    aspectRatios: ['16:9', '9:16'],
    durations: [4, 8, 12],
    qualities: ['720p', '1080p'],
    resolutions: [],
    supportsImageInput: true,
    supportsSound: false,
    supportsRemoveWatermark: false,
    hasMode: false,
    hasQuality: true,
  },
}

const DEFAULT_CAPS: VideoModelCaps = {
  aspectRatios: ['16:9', '9:16', '1:1'],
  durations: [5, 10],
  qualities: [],
  resolutions: [],
  supportsImageInput: false,
  supportsSound: false,
  supportsRemoveWatermark: false,
  hasMode: false,
  hasQuality: false,
}

const ASPECT_LABELS: Record<string, string> = {
  'landscape': '🖥 Пейзаж',
  'portrait': '📱 Портрет',
  '16:9': '16:9',
  '9:16': '9:16',
  '1:1': '1:1',
  '4:3': '4:3',
  '3:4': '3:4',
}

const QUALITY_LABELS: Record<string, string> = {
  '720p': '720p Стандарт',
  '1080p': '1080p HD',
  '4k': '4K Ultra',
  '768P': '768P',
  '1080P': '1080P',
}

const examplePrompts = [
  'Кинематографичный пролёт над горами на рассвете, облака ниже камеры',
  'Кот в очках сидит за компьютером и пишет код, уютная комната',
  'Таймлапс звёздного неба над пустыней, Млечный путь',
  'Медленное вращение вокруг чашки кофе с паром, макросъёмка',
  'Футуристический город с летающими машинами, ночь, неон',
]

export function VideoGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const videoModels = allModels.filter((m) => m.category === 'video')

  const [input, setInput] = useState('')
  const [selectedModelSlug, setSelectedModelSlug] = useState(
    videoModels[0]?.slug ?? 'veo-3.1-fast',
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Settings
  const [duration, setDuration] = useState(5)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [quality, setQuality] = useState('720p')
  const [resolution, setResolution] = useState('768P')
  const [sound, setSound] = useState(false)
  const [removeWatermark, setRemoveWatermark] = useState(true)

  // Image input
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentModel = videoModels.find((m) => m.slug === selectedModelSlug)
  const modelCost = currentModel?.cost || 15
  const caps = MODEL_CAPS[selectedModelSlug] || DEFAULT_CAPS

  // Telegram BackButton
  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const handler = () => { if (onBack) onBack() }
    webApp.BackButton.onClick(handler)
    return () => {
      webApp.BackButton.offClick(handler)
      webApp.BackButton.hide()
    }
  }, [webApp, onBack])

  // Reset on model change
  useEffect(() => {
    const c = MODEL_CAPS[selectedModelSlug] || DEFAULT_CAPS
    setDuration(c.durations[0] || 5)
    setAspectRatio(c.aspectRatios[0] || '16:9')
    setQuality(c.qualities[0] || '720p')
    setResolution(c.resolutions[0] || '768P')
    setSound(false)
    setRemoveWatermark(true)
    setImageUrl('')
  }, [selectedModelSlug])

  const videoGenerations = generations.filter((g) => g.type === 'video')

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }, [input])

  // Upload image
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file.type.match(/image\/(jpeg|png|webp)/)) {
        toast.error('Только JPEG, PNG, WebP')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Макс 10MB')
        return
      }
      setUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const token = sessionStorage.getItem('jwt')
        const API = process.env.NEXT_PUBLIC_API_URL || ''
        const resp = await fetch(`${API}/upload/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (!resp.ok) throw new Error('Upload failed')
        const data = await resp.json()
        const url = data.data?.url || data.url
        if (!url) throw new Error('No URL')
        setImageUrl(url)
        haptic('light')
        toast.success('Изображение загружено')
      } catch (err: any) {
        toast.error(err.message || 'Ошибка загрузки')
      } finally {
        setUploadingImage(false)
      }
    },
    [haptic],
  )

  // Generate
  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    // Для img2vid моделей — требуем изображение
    const isImg2VidModel =
      selectedModelSlug.includes('img2vid') ||
      selectedModelSlug === 'kling-3.0-motion'
    if (isImg2VidModel && !imageUrl) {
      toast.warning('Загрузите изображение для этой модели')
      return
    }

    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setIsGenerating(true)

    const settings: Record<string, unknown> = {}

    // Длительность (если есть варианты)
    if (caps.durations.length > 0) settings.duration = duration

    // Aspect ratio
    if (caps.aspectRatios.length > 0) settings.aspectRatio = aspectRatio

    // Quality
    if (caps.hasQuality && caps.qualities.length > 0) settings.quality = quality

    // Resolution (Hailuo)
    if (caps.resolutions.length > 0) settings.resolution = resolution

    // Sound (Kling)
    if (caps.supportsSound) settings.sound = sound

    // Remove watermark (Sora)
    if (caps.supportsRemoveWatermark) settings.removeWatermark = removeWatermark

    // Image input
    if (caps.supportsImageInput && imageUrl) settings.imageUrl = imageUrl

    const result = await generate({
      type: 'video',
      model: selectedModelSlug,
      prompt,
      settings,
    })

    setIsGenerating(false)

    if (result) {
      setInput('')
      hapticNotification('success')
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }),
        200,
      )
    }
  }, [
    input, balance, modelCost, selectedModelSlug, imageUrl,
    duration, aspectRatio, quality, resolution, sound, removeWatermark,
    caps, haptic, hapticNotification, generate,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const insertExample = () => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }

  const isImg2VidModel =
    selectedModelSlug.includes('img2vid') ||
    selectedModelSlug === 'kling-3.0-motion'

  return (
    <div className="gen-page">
      {/* ── Header ── */}
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button
            className="gen-page__model-select"
            onClick={() => {
              setShowModelPicker(!showModelPicker)
              haptic('light')
            }}
          >
            <Video size={16} />
            <span>{currentModel?.name ?? selectedModelSlug}</span>
            <span className="gen-page__model-cost">{modelCost} 🔥</span>
            <ChevronDown
              size={14}
              className={showModelPicker ? 'rotate-180' : ''}
            />
          </button>
          <button
            className="gen-page__settings-button"
            onClick={() => {
              setShowSettings(true)
              haptic('light')
            }}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Quick params */}
        <div className="gen-page__params-row">
          {caps.durations.length > 0 && (
            <span className="gen-page__param-badge">{duration} сек</span>
          )}
          {caps.aspectRatios.length > 0 && (
            <span className="gen-page__param-badge">{aspectRatio}</span>
          )}
          {caps.hasQuality && caps.qualities.length > 0 && (
            <span className="gen-page__param-badge">{quality}</span>
          )}
          {caps.resolutions.length > 0 && (
            <span className="gen-page__param-badge">{resolution}</span>
          )}
          {isImg2VidModel && (
            <span
              className={`gen-page__param-badge ${imageUrl ? 'gen-page__param-badge--active' : ''}`}
            >
              {imageUrl ? '📸 Фото' : 'img2vid'}
            </span>
          )}
        </div>

        {/* Model picker */}
        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {videoModels.map((m) => (
              <button
                key={m.slug}
                className={`gen-page__model-list-item ${selectedModelSlug === m.slug ? 'selected' : ''
                  }`}
                onClick={() => {
                  setSelectedModelSlug(m.slug)
                  setShowModelPicker(false)
                  haptic('light')
                }}
              >
                <div className="gen-page__model-list-info">
                  <span className="gen-page__model-name">{m.name}</span>
                  <span className="gen-page__model-provider">
                    {m.provider}
                    {m.slug.includes('img') || m.slug.includes('motion')
                      ? ' · img2vid'
                      : ' · txt2vid'}
                  </span>
                </div>
                <div className="gen-page__model-right">
                  <span className="gen-page__model-cost-sm">{m.cost} 🔥</span>
                  {selectedModelSlug === m.slug && <Check size={14} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div className="gen-page__results">
        {videoGenerations.length === 0 && (
          <div className="gen-page__empty fade-in fade-in--2">
            <div className="gen-page__empty-icon">
              <Video size={36} strokeWidth={1.5} />
            </div>
            <div className="gen-page__empty-title">Генерация видео</div>
            <div className="gen-page__empty-text">
              Опишите сцену. Видео может генерироваться до 5 минут.
            </div>
            <button className="gen-page__example-btn" onClick={insertExample}>
              <Wand2 size={14} /> Пример промпта
            </button>
          </div>
        )}

        {videoGenerations.map((gen) => (
          <div key={gen.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{gen.model}</span>
              {gen.prompt}
            </div>
            <MediaResult
              generation={gen}
              onRetry={() =>
                generate({
                  type: 'video',
                  model: gen.modelSlug,
                  prompt: gen.prompt,
                  settings: gen.settings,
                })
              }
            />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      {/* ── Input ── */}
      <div className="gen-page__input-area">
        {/* Image preview */}
        {imageUrl && (
          <div className="gen-page__input-images">
            <div className="gen-page__input-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="gen-page__input-image" />
              <button
                className="gen-page__input-image-remove"
                onClick={() => setImageUrl('')}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="chat-input__row">
          {caps.supportsImageInput && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f)
                  e.target.value = ''
                }}
              />
              <button
                className={`chat-input__attach ${imageUrl ? 'chat-input__attach--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <Upload size={18} />
                )}
              </button>
            </>
          )}

          <div className="chat-input__field-wrap">
            <textarea
              ref={inputRef}
              className="chat-input__field"
              placeholder={
                isImg2VidModel
                  ? 'Загрузите фото и опишите видео...'
                  : 'Опишите видео...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isGenerating}
            />
          </div>

          <button
            className="chat-input__send"
            onClick={handleGenerate}
            disabled={!input.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div
          className="gen-settings-modal"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="gen-settings-modal__content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gen-settings-modal__header">
              <h2 className="gen-settings-modal__title">
                <Video size={16} /> Настройки · {currentModel?.name}
              </h2>
              <button
                className="gen-settings-modal__close"
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="gen-settings-modal__body">

              {/* Duration */}
              {caps.durations.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Clock size={13} /> Длительность
                  </label>
                  <div className="gen-field__chips">
                    {caps.durations.map((d) => (
                      <button
                        key={d}
                        className={`gen-chip ${duration === d ? 'gen-chip--active' : ''}`}
                        onClick={() => {
                          setDuration(d)
                          haptic('light')
                        }}
                      >
                        {d} сек
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aspect Ratio */}
              {caps.aspectRatios.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Maximize2 size={13} /> Соотношение сторон
                  </label>
                  <div className="gen-field__chips">
                    {caps.aspectRatios.map((ar) => (
                      <button
                        key={ar}
                        className={`gen-chip ${aspectRatio === ar ? 'gen-chip--active' : ''}`}
                        onClick={() => {
                          setAspectRatio(ar)
                          haptic('light')
                        }}
                      >
                        {ASPECT_LABELS[ar] || ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality */}
              {caps.hasQuality && caps.qualities.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Zap size={13} /> Качество
                  </label>
                  <div className="gen-field__chips">
                    {caps.qualities.map((q) => (
                      <button
                        key={q}
                        className={`gen-chip ${quality === q ? 'gen-chip--active' : ''}`}
                        onClick={() => {
                          setQuality(q)
                          haptic('light')
                        }}
                      >
                        {QUALITY_LABELS[q] || q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution (Hailuo) */}
              {caps.resolutions.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">Разрешение</label>
                  <div className="gen-field__chips">
                    {caps.resolutions.map((r) => (
                      <button
                        key={r}
                        className={`gen-chip ${resolution === r ? 'gen-chip--active' : ''}`}
                        onClick={() => {
                          setResolution(r)
                          haptic('light')
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sound (Kling) */}
              {caps.supportsSound && (
                <div className="gen-field">
                  <label className="gen-field__label">🔊 Звуковые эффекты</label>
                  <div className="gen-field__chips">
                    <button
                      className={`gen-chip ${sound ? 'gen-chip--active' : ''}`}
                      onClick={() => {
                        setSound(true)
                        haptic('light')
                      }}
                    >
                      Включить
                    </button>
                    <button
                      className={`gen-chip ${!sound ? 'gen-chip--active' : ''}`}
                      onClick={() => {
                        setSound(false)
                        haptic('light')
                      }}
                    >
                      Выключить
                    </button>
                  </div>
                </div>
              )}

              {/* Remove watermark (Sora) */}
              {caps.supportsRemoveWatermark && (
                <div className="gen-field">
                  <label className="gen-field__label">Водяной знак</label>
                  <div className="gen-field__chips">
                    <button
                      className={`gen-chip ${removeWatermark ? 'gen-chip--active' : ''}`}
                      onClick={() => {
                        setRemoveWatermark(true)
                        haptic('light')
                      }}
                    >
                      Убрать
                    </button>
                    <button
                      className={`gen-chip ${!removeWatermark ? 'gen-chip--active' : ''}`}
                      onClick={() => {
                        setRemoveWatermark(false)
                        haptic('light')
                      }}
                    >
                      Оставить
                    </button>
                  </div>
                </div>
              )}

              {/* Sora 2 Pro — предупреждение о цензуре */}
              {selectedModelSlug === 'sora-2-pro' && (
                <div className="gen-field">
                  <div
                    style={{
                      background: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠️ Sora 2 Pro имеет строгую модерацию контента. Задачи с
                    реальными людьми на изображениях не поддерживаются.
                  </div>
                </div>
              )}

              {/* Image upload в настройках */}
              {caps.supportsImageInput && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <ImageIcon size={13} /> Входное изображение
                    <span className="gen-field__hint">
                      JPEG, PNG, WebP · макс 10MB
                      {selectedModelSlug === 'sora-2-pro' &&
                        ' · без реальных людей'}
                    </span>
                  </label>

                  <div className="gen-field__images-grid">
                    {imageUrl && (
                      <div className="gen-field__image-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="" />
                        <button
                          className="gen-field__image-remove"
                          onClick={() => setImageUrl('')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    {!imageUrl && (
                      <button
                        className="gen-field__image-upload"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage
                          ? <Loader2 size={20} className="spin" />
                          : <Upload size={20} />
                        }
                        <span>{uploadingImage ? 'Загрузка...' : 'Добавить'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}