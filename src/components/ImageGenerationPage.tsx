// src/components/ImageGenerationPage.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Image as ImageIcon,
  Settings, Wand2, Maximize2, Layers, Loader2,
  Shuffle, Upload, Trash2, Zap,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

// Конфиг возможностей каждой модели (по slug)
interface ModelCaps {
  aspectRatios: string[]
  resolutions: string[]       // '1K','2K','4K' или пусто
  qualities?: string[]        // 'basic','high' для seedream
  supportsNegativePrompt: boolean
  supportsImg2Img: boolean
  maxInputImages: number
  supportsOutputFormat: boolean
  supportsSeed: boolean
}

const MODEL_CAPS: Record<string, ModelCaps> = {
  'midjourney': {
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    resolutions: ['1K', '2K'],
    supportsNegativePrompt: false,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'midjourney-img2img': {
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    resolutions: ['1K', '2K'],
    supportsNegativePrompt: false,
    supportsImg2Img: true,
    maxInputImages: 8,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'seedream-5-lite': {
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    resolutions: [],
    qualities: ['basic', 'high'],
    supportsNegativePrompt: false,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'imagen-4': {
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    resolutions: [],
    supportsNegativePrompt: true,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: true,
  },
  'flux-2': {
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    resolutions: ['1K', '2K'],
    supportsNegativePrompt: false,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'flux-2-img2img': {
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
    resolutions: ['1K', '2K'],
    supportsNegativePrompt: false,
    supportsImg2Img: true,
    maxInputImages: 8,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'nano-banana-2': {
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9', 'auto'],
    resolutions: ['1K', '2K', '4K'],
    supportsNegativePrompt: false,
    supportsImg2Img: true,
    maxInputImages: 14,
    supportsOutputFormat: true,
    supportsSeed: false,
  },
  'nano-banana-pro': {
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9', 'auto'],
    resolutions: ['1K', '2K', '4K'],
    supportsNegativePrompt: false,
    supportsImg2Img: true,
    maxInputImages: 8,
    supportsOutputFormat: true,
    supportsSeed: false,
  },
  // Fallback для OpenRouter/Evolink моделей
  'gpt-5-image': {
    aspectRatios: ['1:1', '3:2', '2:3'],
    resolutions: [],
    supportsNegativePrompt: false,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
}

const DEFAULT_CAPS: ModelCaps = {
  aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
  resolutions: ['1K', '2K'],
  supportsNegativePrompt: false,
  supportsImg2Img: false,
  maxInputImages: 0,
  supportsOutputFormat: false,
  supportsSeed: false,
}

const ASPECT_RATIO_LABELS: Record<string, string> = {
  '1:1': '1:1 Квадрат',
  '4:3': '4:3',
  '3:4': '3:4',
  '16:9': '16:9 Пейзаж',
  '9:16': '9:16 Портрет',
  '3:2': '3:2',
  '2:3': '2:3',
  '4:5': '4:5',
  '5:4': '5:4',
  '21:9': '21:9 Широкий',
  'auto': 'Авто',
}

const RESOLUTION_LABELS: Record<string, string> = {
  '1K': '1K ~1024px',
  '2K': '2K ~2048px',
  '4K': '4K ~4096px',
}

const QUALITY_LABELS: Record<string, string> = {
  'basic': 'Basic (2K)',
  'high': 'High (4K)',
}

const examplePrompts = [
  'Котёнок в скафандре на Луне, фотореалистичный стиль',
  'Японский сад в тумане, акварель',
  'Киберпанк город ночью, неоновые огни, дождь',
  'Портрет девушки из цветов, стиль Альфонса Мухи',
  'Уютная кофейня, вид из окна на осенний парк',
  'Дракон летит над горами, эпичный свет заката',
]

export function ImageGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const imageModels = allModels.filter((m) => m.category === 'image')

  const [input, setInput] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModelSlug, setSelectedModelSlug] = useState(imageModels[0]?.slug ?? 'midjourney')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Параметры генерации
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [resolution, setResolution] = useState('1K')
  const [quality, setQuality] = useState('basic')
  const [outputFormat, setOutputFormat] = useState('png')
  const [seed, setSeed] = useState<number | undefined>(undefined)
  
  // Img2img
  const [inputImages, setInputImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentModel = imageModels.find((m: any) => m.slug === selectedModelSlug)
  const modelCost = currentModel?.cost || 5
  const caps = MODEL_CAPS[selectedModelSlug] || DEFAULT_CAPS

  // Telegram BackButton
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      const handler = () => { if (onBack) onBack() }
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack])

  // Сброс настроек при смене модели
  useEffect(() => {
    setAspectRatio(caps.aspectRatios[0] || '1:1')
    setResolution(caps.resolutions[0] || '1K')
    setQuality(caps.qualities?.[0] || 'basic')
    setOutputFormat('png')
    setSeed(undefined)
    setNegativePrompt('')
    setInputImages([])
  }, [selectedModelSlug]) // eslint-disable-line

  const imageGenerations = generations.filter((g: any) => g.type === 'image')

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }, [input])

  // Загрузка изображения для img2img
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      toast.error('Поддерживаются только JPEG, PNG, WebP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 10MB')
      return
    }
    if (inputImages.length >= caps.maxInputImages) {
      toast.error(`Максимум ${caps.maxInputImages} изображений`)
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = sessionStorage.getItem('jwt')
      const API = process.env.NEXT_PUBLIC_API_URL || ''

      const response = await fetch(`${API}/upload/image`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // НЕ ставим Content-Type — браузер сам поставит multipart/form-data с boundary
        },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as any).message || 'Upload failed')
      }

      const data = await response.json()
      const url = data.data?.url || data.url
      if (!url) throw new Error('No URL in response')

      setInputImages(prev => [...prev, url])
      haptic('light')
      toast.success('Фото загружено')
    } catch (err: any) {
      console.error('[Upload]', err)
      toast.error(err.message || 'Ошибка загрузки изображения')
    } finally {
      setUploadingImage(false)
    }
  }, [inputImages, caps.maxInputImages, haptic])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
    e.target.value = ''
  }

  const removeInputImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index))
    haptic('light')
  }

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    // Для img2img моделей требуем хотя бы одно изображение
    if (caps.supportsImg2Img && selectedModelSlug.includes('img2img') && inputImages.length === 0) {
      toast.warning('Загрузите хотя бы одно изображение для трансформации')
      return
    }

    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setIsGenerating(true)

    const settings: Record<string, unknown> = {
      aspectRatio,
    }

    if (caps.resolutions.length > 0) settings.resolution = resolution
    if (caps.qualities && caps.qualities.length > 0) settings.quality = quality
    if (caps.supportsNegativePrompt && negativePrompt.trim()) {
      settings.negativePrompt = negativePrompt.trim()
    }
    if (caps.supportsSeed && seed !== undefined) settings.seed = seed
    if (caps.supportsOutputFormat) settings.outputFormat = outputFormat
    if (caps.supportsImg2Img && inputImages.length > 0) {
      settings.inputUrls = inputImages
    }

    const result = await generate({
      type: 'image',
      model: selectedModelSlug,
      prompt,
      settings,
    })

    setIsGenerating(false)

    if (result) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [
    input, negativePrompt, balance, modelCost, selectedModelSlug,
    aspectRatio, resolution, quality, outputFormat, seed,
    inputImages, caps, haptic, hapticNotification, generate,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
  }

  const insertExample = () => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }

  const randomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647))
    haptic('light')
  }

  // Определяем является ли модель img2img
  const isImg2ImgModel = selectedModelSlug.includes('img2img') || 
    (caps.supportsImg2Img && caps.maxInputImages > 0)

  return (
    <div className="gen-page">
      {/* ── Header / Model Selector ── */}
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button
            className="gen-page__model-select"
            onClick={() => { setShowModelPicker(!showModelPicker); haptic('light') }}
          >
            <ImageIcon size={16} />
            <span>{currentModel?.name ?? selectedModelSlug}</span>
            <span className="gen-page__model-cost">{modelCost} 🔥</span>
            <ChevronDown size={14} className={showModelPicker ? 'rotate-180' : ''} />
          </button>
          <button
            className="gen-page__settings-button"
            onClick={() => { setShowSettings(true); haptic('light') }}
          >
            <Settings size={18} />
          </button>
        </div>

        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {imageModels.map((m: any) => (
              <button
                key={m.slug}
                className={`gen-page__model-list-item ${selectedModelSlug === m.slug ? 'selected' : ''}`}
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
                    {m.capabilities?.includes('image_to_image') ? ' · img2img' : ''}
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

        {/* Текущие параметры — быстрый просмотр */}
        <div className="gen-page__params-row">
          <span className="gen-page__param-badge" onClick={() => { setShowSettings(true); haptic('light') }}>
            {aspectRatio}
          </span>
          {caps.resolutions.length > 0 && (
            <span className="gen-page__param-badge" onClick={() => { setShowSettings(true); haptic('light') }}>
              {resolution}
            </span>
          )}
          {caps.qualities && caps.qualities.length > 0 && (
            <span className="gen-page__param-badge" onClick={() => { setShowSettings(true); haptic('light') }}>
              {QUALITY_LABELS[quality] || quality}
            </span>
          )}
          {isImg2ImgModel && (
            <span className={`gen-page__param-badge ${inputImages.length > 0 ? 'gen-page__param-badge--active' : ''}`}>
              {inputImages.length > 0 ? `${inputImages.length} фото` : 'img2img'}
            </span>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="gen-page__results">
        {imageGenerations.length === 0 && (
          <div className="gen-page__empty fade-in fade-in--2">
            <div className="gen-page__empty-icon">
              <ImageIcon size={36} strokeWidth={1.5} />
            </div>
            <div className="gen-page__empty-title">Генерация изображений</div>
            <div className="gen-page__empty-text">
              Опишите что хотите увидеть. Чем детальнее промпт — тем лучше результат.
            </div>
            <button className="gen-page__example-btn" onClick={insertExample}>
              <Wand2 size={14} />
              Пример промпта
            </button>
          </div>
        )}

        {imageGenerations.map((gen: any) => (
          <div key={gen.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{gen.model}</span>
              {gen.prompt}
            </div>
            <MediaResult
              generation={gen}
              onRetry={() => generate({
                type: 'image',
                model: gen.modelSlug,
                prompt: gen.prompt,
                settings: gen.settings,
              })}
            />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="gen-page__input-area">
        {/* Превью загруженных изображений */}
        {inputImages.length > 0 && (
          <div className="gen-page__input-images">
            {inputImages.map((url, idx) => (
              <div key={idx} className="gen-page__input-image-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="gen-page__input-image" />
                <button
                  className="gen-page__input-image-remove"
                  onClick={() => removeInputImage(idx)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {inputImages.length < caps.maxInputImages && (
              <button
                className="gen-page__input-image-add"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
              </button>
            )}
          </div>
        )}

        <div className="chat-input__row">
          {/* Кнопка загрузки для img2img */}
          {caps.supportsImg2Img && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                className={`chat-input__attach ${uploadingImage ? 'chat-input__attach--loading' : ''} ${inputImages.length > 0 ? 'chat-input__attach--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || inputImages.length >= caps.maxInputImages}
                title="Добавить изображение для img2img"
              >
                {uploadingImage
                  ? <Loader2 size={18} className="spin" />
                  : <Upload size={18} />
                }
              </button>
            </>
          )}

          <div className="chat-input__field-wrap">
            <textarea
              ref={inputRef}
              className="chat-input__field"
              placeholder={
                isImg2ImgModel && inputImages.length === 0
                  ? 'Загрузите изображение и опишите изменения...'
                  : 'Опишите изображение...'
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
            {isGenerating
              ? <Loader2 size={18} className="spin" />
              : <Send size={18} />
            }
          </button>
        </div>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="gen-settings-modal" onClick={() => setShowSettings(false)}>
          <div className="gen-settings-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="gen-settings-modal__header">
              <h2 className="gen-settings-modal__title">
                <Settings size={16} />
                Настройки · {currentModel?.name ?? selectedModelSlug}
              </h2>
              <button className="gen-settings-modal__close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="gen-settings-modal__body">

              {/* Aspect Ratio */}
              <div className="gen-field">
                <label className="gen-field__label">
                  <Maximize2 size={13} /> Соотношение сторон
                </label>
                <div className="gen-field__chips gen-field__chips--wrap">
                  {caps.aspectRatios.map((ar) => (
                    <button
                      key={ar}
                      className={`gen-chip ${aspectRatio === ar ? 'gen-chip--active' : ''}`}
                      onClick={() => { setAspectRatio(ar); haptic('light') }}
                    >
                      {ASPECT_RATIO_LABELS[ar] || ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution (для flux, nano-banana, midjourney) */}
              {caps.resolutions.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Zap size={13} /> Разрешение
                  </label>
                  <div className="gen-field__chips">
                    {caps.resolutions.map((r) => (
                      <button
                        key={r}
                        className={`gen-chip ${resolution === r ? 'gen-chip--active' : ''}`}
                        onClick={() => { setResolution(r); haptic('light') }}
                      >
                        {RESOLUTION_LABELS[r] || r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality (seedream) */}
              {caps.qualities && caps.qualities.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Layers size={13} /> Качество
                  </label>
                  <div className="gen-field__chips">
                    {caps.qualities.map((q) => (
                      <button
                        key={q}
                        className={`gen-chip ${quality === q ? 'gen-chip--active' : ''}`}
                        onClick={() => { setQuality(q); haptic('light') }}
                      >
                        {QUALITY_LABELS[q] || q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Output Format (nano-banana) */}
              {caps.supportsOutputFormat && (
                <div className="gen-field">
                  <label className="gen-field__label">Формат файла</label>
                  <div className="gen-field__chips">
                    {['png', 'jpg'].map((fmt) => (
                      <button
                        key={fmt}
                        className={`gen-chip ${outputFormat === fmt ? 'gen-chip--active' : ''}`}
                        onClick={() => { setOutputFormat(fmt); haptic('light') }}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative Prompt (imagen4) */}
              {caps.supportsNegativePrompt && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    Исключить из генерации
                    <span className="gen-field__hint">Negative prompt</span>
                  </label>
                  <textarea
                    className="gen-field__textarea"
                    placeholder="ugly, blurry, bad anatomy, watermark..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Seed (imagen4) */}
              {caps.supportsSeed && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    Seed
                    <span className="gen-field__hint">Для воспроизводимости</span>
                  </label>
                  <div className="gen-field__seed-row">
                    <input
                      type="number"
                      className="gen-field__seed-input"
                      placeholder="Случайный"
                      value={seed ?? ''}
                      onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <button className="gen-field__seed-random" onClick={randomSeed}>
                      <Shuffle size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Img2Img — загрузка изображений */}
              {caps.supportsImg2Img && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    Входные изображения
                    <span className="gen-field__hint">
                      До {caps.maxInputImages} · JPEG, PNG, WebP · макс 10MB
                    </span>
                  </label>

                  <div className="gen-field__images-grid">
                    {inputImages.map((url, idx) => (
                      <div key={idx} className="gen-field__image-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" />
                        <button
                          className="gen-field__image-remove"
                          onClick={() => removeInputImage(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {inputImages.length < caps.maxInputImages && (
                      <button
                        className="gen-field__image-upload"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage
                          ? <Loader2 size={20} className="spin" />
                          : <Upload size={20} />
                        }
                        <span>
                          {uploadingImage ? 'Загрузка...' : 'Добавить'}
                        </span>
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