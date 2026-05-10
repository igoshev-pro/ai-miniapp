'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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

interface ModelCaps {
  aspectRatios: string[]
  resolutions: string[]
  qualities?: string[]
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
  'gpt-5-image': {
    aspectRatios: ['1:1', '3:2', '2:3'],
    resolutions: [],
    supportsNegativePrompt: false,
    supportsImg2Img: false,
    maxInputImages: 0,
    supportsOutputFormat: false,
    supportsSeed: false,
  },
  'gpt-image-1.5-lite': {
    aspectRatios: ['1:1', '2:3', '3:2'],
    resolutions: [],
    qualities: ['auto', 'low', 'medium', 'high'],
    supportsNegativePrompt: false,
    supportsImg2Img: true,
    maxInputImages: 16,
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
  'auto': 'Авто',
  'low': 'Low',
  'medium': 'Medium',
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

  const imageModels = useMemo(
    () => allModels.filter((m: any) => m.category === 'image'),
    [allModels]
  )

  const [input, setInput] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModelSlug, setSelectedModelSlug] = useState(
    imageModels[0]?.slug ?? 'midjourney',
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [resolution, setResolution] = useState('1K')
  const [quality, setQuality] = useState('basic')
  const [outputFormat, setOutputFormat] = useState('png')
  const [seed, setSeed] = useState<number | undefined>(undefined)

  const [inputImages, setInputImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const currentModel = imageModels.find((m: any) => m.slug === selectedModelSlug)
  const modelCost = currentModel?.cost || 5
  const caps = MODEL_CAPS[selectedModelSlug] || DEFAULT_CAPS

  // Telegram BackButton
  useEffect(() => {
    if (!webApp?.BackButton || !onBack) return
    webApp.BackButton.show()
    const handler = () => onBack()
    webApp.BackButton.onClick(handler)
    return () => {
      webApp.BackButton.offClick(handler)
      webApp.BackButton.hide()
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
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

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

      setInputImages((prev) => [...prev, url])
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
    setInputImages((prev) => prev.filter((_, i) => i !== index))
    haptic('light')
  }

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    if (
      caps.supportsImg2Img &&
      selectedModelSlug.includes('img2img') &&
      inputImages.length === 0
    ) {
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

    const settings: Record<string, unknown> = { aspectRatio }

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
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }),
        200,
      )
    }
  }, [
    input, negativePrompt, balance, modelCost, selectedModelSlug,
    aspectRatio, resolution, quality, outputFormat, seed,
    inputImages, caps, haptic, hapticNotification, generate,
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

  const randomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647))
    haptic('light')
  }

  const isImg2ImgModel =
    selectedModelSlug.includes('img2img') ||
    (caps.supportsImg2Img && caps.maxInputImages > 0)

  return (
    <div
      className="
        fixed inset-0 z-[5] flex flex-col
        bg-[var(--bg-primary,#08080a)]
        pt-[calc(var(--header-height)+var(--safe-area-top,0px))]
      "
    >
      {/* ── Model bar ── */}
      <div
        className="
          shrink-0 relative z-40
          flex flex-col gap-1.5
          px-4 pt-2.5 pb-1.5
          bg-[rgba(8,8,10,0.95)]
          backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]
          border-b border-white/[0.04]
        "
      >
        <div className="flex items-center gap-2">
          <button
            className="
              flex-1 min-w-0
              inline-flex items-center gap-1.5
              py-[7px] px-3.5
              rounded-[var(--radius-xs)]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              text-white text-[13px] font-semibold
              cursor-pointer transition-all duration-200
              active:scale-[0.97]
              font-[inherit]
            "
            onClick={() => {
              setShowModelPicker(!showModelPicker)
              haptic('light')
            }}
          >
            <ImageIcon size={14} className="text-[var(--gray-500)] shrink-0" />
            <span className="truncate">{currentModel?.name ?? selectedModelSlug}</span>
            <span className="text-[11px] text-white/40 ml-auto shrink-0">
              {modelCost % 1 === 0 ? modelCost : modelCost.toFixed(2)} 🔥
            </span>
            <ChevronDown
              size={14}
              className={`
                text-[var(--gray-500)] transition-transform duration-200 shrink-0
                ${showModelPicker ? 'rotate-180' : ''}
              `}
            />
          </button>

          <button
            className="
              w-9 h-9 rounded-[9px]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              flex items-center justify-center
              cursor-pointer transition-all duration-150
              shrink-0 [-webkit-tap-highlight-color:transparent]
              text-[var(--gray-500)]
              active:scale-[0.9] active:text-[var(--accent-yellow)]
            "
            onClick={() => {
              setShowSettings(true)
              haptic('light')
            }}
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Текущие параметры — быстрый просмотр */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
          <button
            className="
              shrink-0 py-1 px-2.5
              rounded-[var(--radius-xs)]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass)]
              text-[var(--gray-400)] text-[11px] font-medium
              cursor-pointer transition-all duration-150
              active:scale-[0.95] active:bg-[var(--bg-card-hover)]
            "
            onClick={() => {
              setShowSettings(true)
              haptic('light')
            }}
          >
            {aspectRatio}
          </button>
          {caps.resolutions.length > 0 && (
            <button
              className="
                shrink-0 py-1 px-2.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[11px] font-medium
                cursor-pointer transition-all duration-150
                active:scale-[0.95] active:bg-[var(--bg-card-hover)]
              "
              onClick={() => {
                setShowSettings(true)
                haptic('light')
              }}
            >
              {resolution}
            </button>
          )}
          {caps.qualities && caps.qualities.length > 0 && (
            <button
              className="
                shrink-0 py-1 px-2.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[11px] font-medium
                cursor-pointer transition-all duration-150
                active:scale-[0.95] active:bg-[var(--bg-card-hover)]
              "
              onClick={() => {
                setShowSettings(true)
                haptic('light')
              }}
            >
              {QUALITY_LABELS[quality] || quality}
            </button>
          )}
          {isImg2ImgModel && (
            <button
              className={`
                shrink-0 py-1 px-2.5
                rounded-[var(--radius-xs)]
                border text-[11px] font-medium
                cursor-pointer transition-all duration-150
                active:scale-[0.95]
                ${inputImages.length > 0
                  ? 'bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                  : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                }
              `}
              onClick={() => {
                setShowSettings(true)
                haptic('light')
              }}
            >
              {inputImages.length > 0 ? `${inputImages.length} фото` : 'img2img'}
            </button>
          )}
        </div>

        {/* Model dropdown */}
        {showModelPicker && (
          <div
            className="
              fade-in
              absolute top-[calc(100%+2px)] left-4 right-4 z-50
              rounded-[var(--radius-sm)]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass-heavy)]
              backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
              overflow-hidden max-h-[400px] overflow-y-auto
            "
          >
            {imageModels.map((m: any) => (
              <button
                key={m.slug}
                className={`
                  flex items-center justify-between w-full
                  py-[11px] px-3.5
                  border-none bg-transparent
                  text-[var(--gray-400)] text-[13px]
                  cursor-pointer transition-[background] duration-150
                  font-[inherit] text-left
                  border-b border-[var(--border)]
                  last:border-b-0
                  active:bg-white/[0.04]
                  ${selectedModelSlug === m.slug ? 'text-white' : ''}
                `}
                onClick={() => {
                  setSelectedModelSlug(m.slug)
                  setShowModelPicker(false)
                  haptic('light')
                }}
              >
                <div className="flex flex-col gap-[1px]">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[11px] text-[var(--gray-600)]">
                    {m.provider}
                    {m.capabilities?.includes('image_to_image') ? ' · img2img' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">
                    {m.cost % 1 === 0 ? m.cost : m.cost.toFixed(2)} 🔥
                  </span>
                  {selectedModelSlug === m.slug && (
                    <Check size={14} className="text-[var(--accent-yellow)]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

            {/* ── Results ── */}
      <div
        ref={messagesContainerRef}
        className="
          flex-1 min-h-0 overflow-y-auto
          overscroll-contain [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex flex-col gap-3.5 px-4 py-3">
          {/* Empty state */}
          {imageGenerations.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in fade-in--2">
              <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
                <ImageIcon size={36} strokeWidth={1.5} />
              </div>
              <div className="text-[17px] font-semibold text-white/60">
                Генерация изображений
              </div>
              <div className="text-[13px] text-white/30 max-w-[280px] leading-[1.5]">
                Опишите что вы хотите увидеть. ИИ создаст изображение по вашему описанию.
              </div>
              <button
                className="
                  flex items-center gap-1.5
                  bg-white/[0.06] border border-white/[0.08]
                  rounded-[10px] py-2.5 px-5
                  text-white/50 text-[13px]
                  cursor-pointer mt-2 transition-all duration-150
                  [-webkit-tap-highlight-color:transparent] font-[inherit]
                  active:bg-white/10
                "
                onClick={insertExample}
              >
                <Wand2 size={14} /> Пример промпта
              </button>
            </div>
          )}

          {/* Загруженные input изображения для img2img */}
          {isImg2ImgModel && inputImages.length > 0 && (
            <div className="flex flex-col gap-2 fade-in">
              <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                Исходные ({inputImages.length}/{caps.maxInputImages})
              </div>
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                {inputImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="
                      relative shrink-0
                      w-20 h-20 rounded-[var(--radius-xs)]
                      border border-[var(--border-glass)]
                      bg-[var(--bg-glass)]
                      overflow-hidden
                    "
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Input ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="
                        absolute top-1 right-1
                        w-5 h-5 rounded-full
                        bg-black/60 backdrop-blur-sm
                        text-white
                        flex items-center justify-center
                        cursor-pointer
                        active:scale-90 active:bg-[var(--accent-red)]
                      "
                      onClick={() => removeInputImage(idx)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Список генераций */}
          {imageGenerations.map((gen: any) => (
            <div
              key={gen.id}
              className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]"
              ref={resultsRef}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="
                    text-[11px] font-semibold
                    py-1 px-2
                    rounded-[6px]
                    bg-white/[0.04] border border-white/[0.06]
                    text-[var(--gray-500)]
                  "
                >
                  {gen.model}
                </span>
                <span className="text-[12px] text-[var(--gray-300)] flex-1 min-w-0 truncate">
                  {gen.prompt}
                </span>
              </div>

              <MediaResult
                generation={gen}
                onRetry={() => {
                  setInput(gen.prompt)
                  inputRef.current?.focus()
                  haptic('light')
                }}
              />
            </div>
          ))}

          {/* Streaming generation */}
          {isGenerating && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="
                    text-[11px] font-semibold
                    py-1 px-2
                    rounded-[6px]
                    bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)]
                    text-[var(--accent-yellow)]
                  "
                >
                  {currentModel?.name ?? selectedModelSlug}
                </span>
                <span className="text-[12px] text-[var(--gray-400)] flex-1 min-w-0 truncate">
                  {input || 'Генерация...'}
                </span>
              </div>

              <div
                className="
                  aspect-square w-full max-w-[400px] mx-auto
                  rounded-[var(--radius-md)]
                  border border-[var(--border-glass)]
                  bg-[var(--bg-glass)]
                  backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
                  flex flex-col items-center justify-center gap-3
                  relative overflow-hidden
                "
              >
                {/* Анимированный фон */}
                <div
                  className="
                    absolute inset-0 opacity-30
                    bg-gradient-to-br from-[rgba(250,204,21,0.15)] via-transparent to-[rgba(250,204,21,0.08)]
                    animate-pulse
                  "
                />
                <Loader2
                  size={36}
                  className="text-[var(--accent-yellow)] animate-spin relative z-10"
                  strokeWidth={1.5}
                />
                <div className="text-[13px] font-medium text-white/70 relative z-10">
                  Создаём изображение...
                </div>
                <div className="text-[11px] text-white/40 relative z-10">
                  Обычно 10–30 секунд
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings sheet ── */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setShowSettings(false)}
          />
          <div
            className="
              fixed left-0 right-0 bottom-0 z-[61]
              max-h-[85vh] overflow-y-auto overscroll-contain
              rounded-t-[20px]
              border-t border-[var(--border-glass)]
              bg-[var(--bg-glass-heavy)]
              backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
              [-webkit-overflow-scrolling:touch]
              animate-[slideUp_0.3s_ease-out]
              pb-[calc(20px+var(--safe-bottom))]
            "
          >
            {/* Drag handle */}
            <div className="sticky top-0 pt-2.5 pb-1 flex justify-center bg-[var(--bg-glass-heavy)]">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.04]">
              <div className="text-[15px] font-semibold text-white">Настройки</div>
              <button
                className="
                  w-8 h-8 rounded-full
                  bg-white/[0.04] text-[var(--gray-500)]
                  flex items-center justify-center
                  cursor-pointer
                  active:scale-90 active:bg-white/[0.08]
                "
                onClick={() => setShowSettings(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-5 p-5">
              {/* Соотношение сторон */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                  <Maximize2 size={12} />
                  Соотношение сторон
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {caps.aspectRatios.map((ar) => (
                    <button
                      key={ar}
                      className={`
                        py-2 px-2.5 rounded-[var(--radius-xs)]
                        border text-[12px] font-medium
                        cursor-pointer transition-all duration-150
                        active:scale-[0.96]
                        ${aspectRatio === ar
                          ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                          : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                        }
                      `}
                      onClick={() => {
                        setAspectRatio(ar)
                        haptic('light')
                      }}
                    >
                      {ASPECT_RATIO_LABELS[ar] || ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Разрешение */}
              {caps.resolutions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    <Layers size={12} />
                    Разрешение
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {caps.resolutions.map((r) => (
                      <button
                        key={r}
                        className={`
                          py-2 px-2.5 rounded-[var(--radius-xs)]
                          border text-[12px] font-medium
                          cursor-pointer transition-all duration-150
                          active:scale-[0.96]
                          ${resolution === r
                            ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                            : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                          }
                        `}
                        onClick={() => {
                          setResolution(r)
                          haptic('light')
                        }}
                      >
                        {RESOLUTION_LABELS[r] || r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Качество */}
              {caps.qualities && caps.qualities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    <Zap size={12} />
                    Качество
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {caps.qualities.map((q) => (
                      <button
                        key={q}
                        className={`
                          py-2 px-2.5 rounded-[var(--radius-xs)]
                          border text-[12px] font-medium
                          cursor-pointer transition-all duration-150
                          active:scale-[0.96]
                          ${quality === q
                            ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                            : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                          }
                        `}
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

              {/* Output format */}
              {caps.supportsOutputFormat && (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    Формат
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['png', 'jpeg'].map((f) => (
                      <button
                        key={f}
                        className={`
                          py-2 px-2.5 rounded-[var(--radius-xs)]
                          border text-[12px] font-medium uppercase
                          cursor-pointer transition-all duration-150
                          active:scale-[0.96]
                          ${outputFormat === f
                            ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                            : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                          }
                        `}
                        onClick={() => {
                          setOutputFormat(f)
                          haptic('light')
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative prompt */}
              {caps.supportsNegativePrompt && (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    Negative prompt
                  </div>
                  <textarea
                    className="
                      w-full py-2.5 px-3
                      rounded-[var(--radius-sm)]
                      border border-[var(--border-glass)]
                      bg-white/[0.03]
                      text-white text-[13px] font-[inherit]
                      outline-none resize-none leading-[1.4]
                      transition-[border-color] duration-200
                      placeholder:text-[var(--gray-600)]
                      focus:border-[rgba(250,204,21,0.2)]
                    "
                    placeholder="Что не должно быть на изображении..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Seed */}
              {caps.supportsSeed && (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    Seed
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="
                        flex-1 min-w-0 py-2.5 px-3
                        rounded-[var(--radius-sm)]
                        border border-[var(--border-glass)]
                        bg-white/[0.03]
                        text-white text-[13px] font-[inherit]
                        outline-none
                        transition-[border-color] duration-200
                        placeholder:text-[var(--gray-600)]
                        focus:border-[rgba(250,204,21,0.2)]
                      "
                      placeholder="Случайный"
                      value={seed ?? ''}
                      onChange={(e) =>
                        setSeed(e.target.value ? parseInt(e.target.value, 10) : undefined)
                      }
                    />
                    <button
                      className="
                        shrink-0 w-[42px] h-[42px]
                        rounded-[var(--radius-sm)]
                        border border-[var(--border-glass)]
                        bg-[var(--bg-glass)]
                        text-[var(--gray-400)]
                        flex items-center justify-center
                        cursor-pointer transition-all duration-150
                        active:scale-[0.92] active:text-[var(--accent-yellow)]
                      "
                      onClick={randomSeed}
                    >
                      <Shuffle size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Img2Img — управление загруженными */}
              {isImg2ImgModel && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                      Исходные изображения ({inputImages.length}/{caps.maxInputImages})
                    </div>
                    {inputImages.length > 0 && (
                      <button
                        className="
                          flex items-center gap-1
                          text-[11px] text-[var(--accent-red)]
                          cursor-pointer
                          active:opacity-60
                        "
                        onClick={() => {
                          setInputImages([])
                          haptic('light')
                        }}
                      >
                        <Trash2 size={11} /> Очистить
                      </button>
                    )}
                  </div>

                  {inputImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {inputImages.map((url, idx) => (
                        <div
                          key={idx}
                          className="
                            relative aspect-square
                            rounded-[var(--radius-xs)]
                            border border-[var(--border-glass)]
                            bg-[var(--bg-glass)]
                            overflow-hidden
                          "
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Input ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            className="
                              absolute top-1 right-1
                              w-5 h-5 rounded-full
                              bg-black/60 backdrop-blur-sm
                              text-white
                              flex items-center justify-center
                              cursor-pointer
                              active:scale-90 active:bg-[var(--accent-red)]
                            "
                            onClick={() => removeInputImage(idx)}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {inputImages.length < caps.maxInputImages && (
                    <button
                      className="
                        flex items-center justify-center gap-1.5
                        py-2.5 px-3
                        rounded-[var(--radius-sm)]
                        border border-dashed border-[var(--border-glass)]
                        bg-[var(--bg-glass)]
                        text-[var(--gray-400)] text-[12px] font-medium
                        cursor-pointer transition-all duration-150
                        active:scale-[0.98] active:bg-[var(--bg-card-hover)]
                        disabled:opacity-50 disabled:cursor-default
                      "
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Добавить изображение
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Скрытый file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Input area ── */}
      <div
        className="
          shrink-0 flex flex-col gap-2
          px-2.5 pt-2.5 pb-4
          mb-[calc(59px+var(--safe-bottom))]
          border-t border-[var(--border-glass)]
          bg-[var(--bg-glass-heavy)]
          backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
        "
      >
        <div className="flex items-center gap-2">
          {/* Upload button (для img2img моделей) */}
          {isImg2ImgModel ? (
            <button
              className={`
                w-[38px] h-[38px] rounded-[10px] border-none
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0 self-center
                ${inputImages.length > 0
                  ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                  : 'bg-white/[0.04] text-[var(--gray-500)]'
                }
                active:scale-[0.92]
                disabled:opacity-50 disabled:cursor-default
              `}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || inputImages.length >= caps.maxInputImages}
            >
              {uploadingImage ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
            </button>
          ) : null}

          <textarea
            ref={inputRef}
            className="
              flex-1 min-w-0 block align-middle
              py-[9px] px-3.5
              rounded-[var(--radius-sm)]
              border border-[var(--border-glass)]
              bg-white/[0.03]
              text-white text-[14px] font-[inherit]
              outline-none resize-none leading-[1.4]
              max-h-[120px]
              transition-[border-color] duration-200
              placeholder:text-[var(--gray-600)]
              focus:border-[rgba(250,204,21,0.2)]
            "
            placeholder={
              isImg2ImgModel
                ? 'Загрузите изображение и опишите изменения...'
                : 'Опишите изображение...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isGenerating}
          />

          <button
            className="
              w-[38px] h-[38px] rounded-[10px] border-none
              bg-white/[0.04] text-[var(--accent-yellow)]
              flex items-center justify-center
              cursor-pointer transition-all duration-150
              shrink-0 self-center
              active:scale-[0.92]
              disabled:cursor-default disabled:opacity-50
            "
            onClick={handleGenerate}
            disabled={
              !input.trim() ||
              isGenerating ||
              (isImg2ImgModel &&
                selectedModelSlug.includes('img2img') &&
                inputImages.length === 0)
            }
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="-ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}