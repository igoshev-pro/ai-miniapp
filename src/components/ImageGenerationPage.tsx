'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown, Send, Check, X, Image as ImageIcon,
  Settings, Wand2, Maximize2, Layers, Loader2,
  Shuffle, Upload, Trash2, Zap, Sparkles, Gift,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { useModelUIConfig, type ModelUIConfig } from '@/hooks/useModelUIConfig'
import { usePriceCalculator } from '@/hooks/usePriceCalculator'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'
import { useAuthStore } from '@/stores/auth.store'
import { PriceTag } from './ui/PriceTag'
import { formatFreeBadge, formatFreeLabel, getFreeAccessInfo } from '@/lib/api/freeAccess'

interface Props {
  initialModel?: string
  onBack?: () => void
}

// ─────────────────────────────────────────────────────────────
// UI labels
// ─────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  relax: 'Relax', fast: 'Быстрый', turbo: 'Турбо',
  flex: 'Flex', pro: 'Pro',
  std: 'Standard', standard: 'Standard', hd: 'HD',
  auto: 'Авто', low: 'Low', medium: 'Medium', high: 'High',
  basic: 'Basic',
}

const VERSION_LABELS: Record<string, string> = {
  flex: 'Flex', pro: 'Pro', ultra: 'Ultra', standard: 'Standard',
}

const ASPECT_RATIO_LABELS: Record<string, string> = {
  '1:1': '1:1 Квадрат', '4:3': '4:3', '3:4': '3:4',
  '16:9': '16:9 Пейзаж', '9:16': '9:16 Портрет',
  '3:2': '3:2', '2:3': '2:3', '4:5': '4:5', '5:4': '5:4',
  '21:9': '21:9 Широкий', 'auto': 'Авто',
}

const RESOLUTION_LABELS: Record<string, string> = {
  '1K': '1K ~1024px', '2K': '2K ~2048px', '4K': '4K ~4096px',
}

const QUALITY_LABELS: Record<string, string> = {
  'basic': 'Basic (2K)', 'high': 'High (4K)', 'auto': 'Авто',
  'low': 'Low', 'medium': 'Medium',
  'standard': 'Standard', 'hd': 'HD',
}

const examplePrompts = [
  'Котёнок в скафандре на Луне, фотореалистичный стиль',
  'Японский сад в тумане, акварель',
  'Киберпанк город ночью, неоновые огни, дождь',
  'Портрет девушки из цветов, стиль Альфонса Мухи',
  'Уютная кофейня, вид из окна на осенний парк',
  'Дракон летит над горами, эпичный свет заката',
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getParamOptions(config: ModelUIConfig | null, key: string): string[] {
  if (!config?.uiParameters) return []
  const p = config.uiParameters.find((x) => x.key === key)
  return p?.options?.map((o) => String(o.value)) ?? []
}

function hasParam(config: ModelUIConfig | null, key: string): boolean {
  if (!config?.uiParameters) return false
  return config.uiParameters.some((p) => p.key === key)
}

function getDefaultValue(config: ModelUIConfig | null, key: string): string | undefined {
  if (!config?.uiParameters) return undefined
  const p = config.uiParameters.find((x) => x.key === key)
  return p?.defaultValue !== undefined ? String(p.defaultValue) : undefined
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ImageGenerationPage({ initialModel, onBack }: Props) {
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

  const resolveInitialSlug = useCallback((): string => {
    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const byExact = imageModels.find(
        (m: any) =>
          m.slug?.toLowerCase() === norm ||
          m.name?.toLowerCase() === norm,
      )
      if (byExact) return byExact.slug
    }
    return imageModels[0]?.slug ?? 'midjourney'
  }, [initialModel, imageModels])

  const [selectedModelSlug, setSelectedModelSlug] = useState<string>(() =>
    resolveInitialSlug(),
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // 🆕 Универсальный словарь всех select-параметров модели (mode/resolution/quality/version/aspectRatio/...)
  const [paramValues, setParamValues] = useState<Record<string, any>>({})

  // отдельные поля, которые не входят в select-матрицу
  const [outputFormat, setOutputFormat] = useState('png')
  const [seed, setSeed] = useState<number | undefined>(undefined)
  const [negativePromptState] = useState('') // совместимость (не используется)

  const [inputImages, setInputImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const uploadingRef = useRef(false) // 🆕 синхронный лок от двойной загрузки

  const [syncedSlug, setSyncedSlug] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const initialAppliedRef = useRef(false)

  const currentModel = imageModels.find((m: any) => m.slug === selectedModelSlug)
  const modelMinCost = currentModel?.cost || 5

  const { config: uiConfig, isLoading: isLoadingConfig } = useModelUIConfig(selectedModelSlug)

  // caps derived из бэка
  const caps = useMemo(() => {
    const aspectRatios = getParamOptions(uiConfig, 'aspectRatio')
    const resolutions = getParamOptions(uiConfig, 'resolution')
    const qualities = getParamOptions(uiConfig, 'quality')
    const modes = getParamOptions(uiConfig, 'mode')
    const versions = getParamOptions(uiConfig, 'version')
    const inputCap = uiConfig?.inputCapabilities || {}

    return {
      aspectRatios: aspectRatios.length > 0 ? aspectRatios : ['1:1', '16:9', '9:16'],
      resolutions,
      qualities,
      modes,
      versions,
      supportsNegativePrompt: hasParam(uiConfig, 'negativePrompt'),
      supportsImg2Img: inputCap.acceptsImages === true,
      maxInputImages: inputCap.maxInputImages ?? 0,
      supportsOutputFormat: hasParam(uiConfig, 'outputFormat'),
      supportsSeed: hasParam(uiConfig, 'seed'),
    }
  }, [uiConfig])

  const isImg2ImgModel = caps.supportsImg2Img && caps.maxInputImages > 0
  const requiresInputImage = selectedModelSlug.includes('img2img')

  // удобные геттеры текущих значений из paramValues
  const mode = paramValues.mode as string | undefined
  const resolution = (paramValues.resolution as string | undefined) ?? ''
  const quality = (paramValues.quality as string | undefined) ?? ''
  const version = paramValues.version as string | undefined
  const aspectRatio = (paramValues.aspectRatio as string | undefined) ?? '1:1'

  // 🆕 Есть ли параметры влияющие на цену → значит цена "плавающая" → показываем "от"
  const hasPriceVariants = useMemo(() => {
    if (!uiConfig?.uiParameters) return false
    return uiConfig.uiParameters.some(
      (p) => p.affectsPrice && (p.options?.length ?? 0) > 1,
    )
  }, [uiConfig])

  // 🆕 priceParams — собираем ВСЕ параметры из uiConfig динамически
  const priceParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (uiConfig?.uiParameters) {
      for (const param of uiConfig.uiParameters) {
        const val = paramValues[param.key]
        if (val !== undefined && val !== '') p[param.key] = val
      }
    }
    if (inputImages.length > 0) {
      p.hasInputImage = true
      p.numImages = inputImages.length
    }
    return p
  }, [paramValues, uiConfig, inputImages.length])

  const { price, isCalculating } = usePriceCalculator(
    selectedModelSlug,
    priceParams,
    {
      enabled: !!uiConfig && syncedSlug === selectedModelSlug,
      debounceMs: 300,
    },
  )

  // ── AntiFlicker кэш цены ──
  const lastPriceRef = useRef<{ cost: number; label?: string; fallback: boolean } | null>(null)

  const isConfigReady =
    !!uiConfig &&
    !isLoadingConfig &&
    syncedSlug === selectedModelSlug

  useEffect(() => {
    if (isConfigReady && !isCalculating && price) {
      lastPriceRef.current = {
        cost: price.costInTokens ?? modelMinCost,
        label: price.matchedRule?.label,
        fallback: price.fallback ?? true,
      }
    }
  }, [isConfigReady, isCalculating, price, modelMinCost])

  useEffect(() => {
    lastPriceRef.current = null
  }, [selectedModelSlug])

  const displayedCost = (() => {
    if (!isConfigReady) return modelMinCost
    if (price && !isCalculating) return price.costInTokens ?? modelMinCost
    if (lastPriceRef.current) return lastPriceRef.current.cost
    return modelMinCost
  })()

  // 🆕 Free-доступ с учётом текущих параметров (важно для Midjourney с requiredParams: { mode: 'draft' })
  const freeAccess = useMemo(
    () => getFreeAccessInfo(currentModel || {}, paramValues),
    [currentModel, paramValues],
  )
  const isFreeForUser = freeAccess.isFree

  const matchedLabel = (() => {
    if (!isConfigReady) return undefined
    if (price && !isCalculating) return price.matchedRule?.label
    if (lastPriceRef.current) return lastPriceRef.current.label
    return undefined
  })()

  const isFallbackPrice = (() => {
    if (!isConfigReady) return true
    if (price && !isCalculating) return price.fallback ?? true
    if (lastPriceRef.current) return lastPriceRef.current.fallback
    return true
  })()

  const showPriceLoader =
    !isConfigReady || (isCalculating && !lastPriceRef.current && !price)

  // 🆕 Логика "от"
  const showFromPrefix = !isConfigReady || (hasPriceVariants && isFallbackPrice)

  // Sync slug когда модели догрузились
  useEffect(() => {
    if (initialAppliedRef.current) return
    if (imageModels.length === 0) return

    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const match = imageModels.find((m: any) =>
        m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
      )
      if (match) {
        if (match.slug !== selectedModelSlug) {
          setSyncedSlug(null)
          setSelectedModelSlug(match.slug)
        }
        initialAppliedRef.current = true
        return
      }
      return
    }

    const slugExists = imageModels.some((m: any) => m.slug === selectedModelSlug)
    if (!slugExists) {
      const first = imageModels[0]
      if (first) {
        setSyncedSlug(null)
        setSelectedModelSlug(first.slug)
      }
    }
    initialAppliedRef.current = true
  }, [initialModel, imageModels, selectedModelSlug])

  // Telegram BackButton
  // useEffect(() => {
  //   if (!webApp?.BackButton) return
  //   webApp.BackButton.show()
  //   const handler = () => {
  //     if (showSettings) { setShowSettings(false); return }
  //     if (showModelPicker) { setShowModelPicker(false); return }
  //     onBack?.()
  //   }
  //   webApp.BackButton.onClick(handler)
  //   return () => {
  //     webApp.BackButton.offClick(handler)
  //     webApp.BackButton.hide()
  //   }
  // }, [webApp, onBack, showSettings, showModelPicker])

  // 🆕 Батч-сброс настроек когда пришёл uiConfig — инициализируем ВСЕ select-параметры дефолтами
  useEffect(() => {
    if (!uiConfig) return

    const defaults: Record<string, any> = {}
    if (uiConfig.uiParameters) {
      for (const p of uiConfig.uiParameters) {
        if (p.defaultValue !== undefined) {
          defaults[p.key] = p.defaultValue
        } else if (p.options?.[0]) {
          defaults[p.key] = p.options[0].value
        }
      }
    }
    // гарантируем aspectRatio даже если его нет в конфиге
    if (defaults.aspectRatio === undefined) {
      defaults.aspectRatio =
        getDefaultValue(uiConfig, 'aspectRatio') ?? caps.aspectRatios[0] ?? '1:1'
    }

    setParamValues(defaults)
    setOutputFormat(getDefaultValue(uiConfig, 'outputFormat') ?? 'png')
    setSeed(undefined)
    setNegativePrompt('')
    setInputImages([])

    setSyncedSlug(selectedModelSlug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiConfig])

  const imageGenerations = generations.filter((g: any) => g.type === 'image')

  // Авто-высота textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  // Скролл ленты наверх при первом появлении генераций (заход на страницу)
  const scrolledToTopRef = useRef(false)
  useEffect(() => {
    if (scrolledToTopRef.current) return
    if (imageGenerations.length === 0) return
    messagesContainerRef.current?.scrollTo({ top: 0 })
    scrolledToTopRef.current = true
  }, [imageGenerations.length])

  // ─── Upload image ─────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return
    if (uploadingRef.current) return // 🆕 уже идёт загрузка — игнор повторного вызова
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

    uploadingRef.current = true // 🆕 синхронно блокируем повторный вызов
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = useAuthStore.getState().token
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
      uploadingRef.current = false // 🆕 снимаем лок
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

  // helper для обновления одного параметра
  const setParam = useCallback((key: string, value: any) => {
    setParamValues((prev) => ({ ...prev, [key]: value }))
    haptic('light')
  }, [haptic])

  // ─── Generate ─────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    if (requiresInputImage && inputImages.length === 0) {
      toast.warning('Загрузите хотя бы одно изображение для трансформации')
      return
    }

    // 🆕 Бесплатные модели по подписке — пропускаем проверку баланса
    if (!isFreeForUser && balance < displayedCost) {
      toast.warning(`Недостаточно спичек. Нужно ${displayedCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setIsGenerating(true)

    // 🆕 settings = все select-параметры из paramValues + доп. поля
    const settings: Record<string, unknown> = { ...priceParams }
    // убираем служебные поля от прайс-калькулятора
    delete settings.hasInputImage
    delete settings.numImages

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
        () =>
          messagesContainerRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
          }),
        100,
      )
    }
  }, [
    input, negativePrompt, balance, displayedCost, selectedModelSlug,
    priceParams, outputFormat, seed, inputImages, caps,
    requiresInputImage, isFreeForUser, // 🆕
    haptic, hapticNotification, generate,
  ])

  const insertExample = () => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }

  const randomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647))
    haptic('light')
  }

  const formatCost = (n: number) => (n % 1 === 0 ? n : n.toFixed(2))

  const switchModel = (newSlug: string) => {
    if (newSlug === selectedModelSlug) return
    setSyncedSlug(null)
    setSelectedModelSlug(newSlug)
  }

  // 🆕 Собираем активные бейджики для строки настроек
  const activeBadges = useMemo(() => {
    const badges: { key: string; label: string; accent?: boolean }[] = []
    if (caps.versions.length > 0 && version) {
      badges.push({ key: 'version', label: VERSION_LABELS[version] || version, accent: true })
    }
    if (caps.modes.length > 0 && mode) {
      badges.push({ key: 'mode', label: MODE_LABELS[mode] || mode, accent: true })
    }
    if (aspectRatio) {
      badges.push({ key: 'ar', label: aspectRatio })
    }
    if (caps.resolutions.length > 0 && resolution) {
      badges.push({ key: 'res', label: resolution })
    }
    if (caps.qualities.length > 0 && quality) {
      badges.push({ key: 'q', label: QUALITY_LABELS[quality] || quality })
    }
    if (isImg2ImgModel) {
      badges.push({
        key: 'img2img',
        label: inputImages.length > 0 ? `${inputImages.length} фото` : 'img2img',
        accent: inputImages.length > 0,
      })
    }
    return badges
  }, [caps, version, mode, aspectRatio, resolution, quality, isImg2ImgModel, inputImages.length])

  // 🆕 Извлечение стоимости генерации
  const getGenCost = (gen: any): number | undefined => {
    return gen.tokensUsed ?? gen.cost ?? gen.costInTokens ?? gen.tokensCost
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div
      className="
        fs-page
        fixed inset-0 z-[5] flex flex-col
        bg-[var(--bg-primary,#08080a)]
        pt-[calc(var(--header-height)+var(--safe-area-top,0px))]
      "
    >
      {/* ── Model bar ── */}
      <div
        className="
        fs-page__bar
          shrink-0 relative z-40
          flex items-center gap-2
          px-4 pt-2.5 pb-2.5
          bg-[rgba(8,8,10,0.95)]
          backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]
          border-b border-white/[0.04]
        "
      >
        <button
          className="
            flex-1 min-w-0
            flex items-center gap-2
            py-[7px] px-3
            rounded-[var(--radius-xs)]
            border border-[var(--border-glass)]
            bg-[var(--bg-glass)]
            backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
            cursor-pointer transition-all duration-200
            active:scale-[0.98]
            font-[inherit]
          "
          onClick={() => {
            setShowModelPicker(!showModelPicker)
            haptic('light')
          }}
        >
          <ImageIcon size={14} className="text-[var(--gray-500)] shrink-0" />

          <span className="text-white text-[13px] font-semibold truncate shrink-0 max-w-[42%]">
            {currentModel?.name ?? selectedModelSlug}
          </span>

          <div className="flex-1 min-w-0" />

          {/* Бейджики выбранных параметров — прижаты вправо, рядом с ценой */}
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 shrink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden justify-end">
            {activeBadges.map((b) => (
              <span
                key={b.key}
                className={`
                  shrink-0 py-[2px] px-2 rounded-[6px]
                  text-[10px] font-medium leading-none
                  border
                  ${b.accent
                    ? 'bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.25)] text-[var(--accent-yellow)]'
                    : 'bg-white/[0.04] border-white/[0.06] text-[var(--gray-400)]'
                  }
                `}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* Цена — справа, рядом с бейджиками */}
          {isFreeForUser ? (
            <span
              className="
                text-[11px] shrink-0 inline-flex items-center gap-1
                text-emerald-400 font-semibold
              "
              title={
                freeAccess.limit === 'unlimited'
                  ? 'Безлимитно по подписке'
                  : `Лимит: ${freeAccess.hourlyLimit ?? '∞'}/час, ${freeAccess.dailyLimit ?? '∞'}/сутки`
              }
            >
              <Gift size={11} />
              {formatFreeBadge(freeAccess)}
            </span>
          ) : (
            <span
              className={`
                text-[11px] shrink-0 inline-flex items-center gap-1
                transition-opacity duration-200
                ${!isFallbackPrice ? 'text-[var(--accent-yellow)]' : 'text-white/40'}
                ${isCalculating && lastPriceRef.current ? 'opacity-60' : 'opacity-100'}
              `}
            >
              {showPriceLoader && <Loader2 size={10} className="animate-spin" />}
              {showFromPrefix && <span className="text-white/35">от</span>}
              {formatCost(displayedCost)} 🔥
            </span>
          )}
        </button>

        {/* Шестерёнка — справа, открывает настройки */}
        <button
          className="
            w-9 h-9 rounded-[9px]
            border border-[var(--border-glass)]
            bg-[var(--bg-glass)]
            backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
            flex items-center justify-center
            cursor-pointer transition-all duration-150
            shrink-0 [-webkit-tap-highlight-color:transparent]
            text-[var(--gray-400)]
            active:scale-[0.9] active:text-[var(--accent-yellow)]
          "
          onClick={() => {
            setShowSettings(true)
            haptic('light')
          }}
        >
          <Settings size={16} />
        </button>

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
                  switchModel(m.slug)
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
                  {(() => {
                    const mFree = getFreeAccessInfo(m, undefined)
                    const hasReqParams =
                      !!m.freeLimit?.requiredParams &&
                      Object.keys(m.freeLimit.requiredParams).length > 0

                    if (mFree.isFree && !hasReqParams) {
                      return (
                        <span className="text-[11px] font-semibold text-emerald-400 inline-flex items-center gap-0.5">
                          <Gift size={10} />
                          {formatFreeBadge(mFree)}
                        </span>
                      )
                    }
                    if (m.isFreeInPlan && hasReqParams) {
                      return (
                        <span
                          className="text-[10px] font-medium text-emerald-400/80"
                          title="Бесплатно в определённом режиме"
                        >
                          В режиме
                        </span>
                      )
                    }
                    return (
                      <span className="text-[11px] text-white/40">
                        от {formatCost(m.cost)} 🔥
                      </span>
                    )
                  })()}
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
          fs-page__scroll
          flex-1 min-h-0 overflow-y-auto
          overscroll-contain [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex flex-col gap-3.5 px-4 py-3">
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

          {imageGenerations.map((gen: any) => {
            const genCost = getGenCost(gen)
            return (
              <div
                key={gen.id}
                className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]"
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

                {gen.status === 'completed' && genCost != null && (
                  <div className="flex items-center px-0.5">
                    <span className="text-[10px] text-white/30">
                      {formatCost(genCost)} 🔥 затрачено
                    </span>
                  </div>
                )}
              </div>
            )
          })}

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
            className="gen-settings-overlay"
            onClick={() => setShowSettings(false)}
          />
          <div className="gen-settings-sheet">
            <div className="sticky top-0 pt-2.5 pb-1 flex justify-center bg-[var(--bg-glass-heavy)]">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.04]">
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-semibold text-white">
                  {currentModel?.name ?? 'Настройки'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--gray-500)]">Цена:</span>
                  {isFreeForUser ? (
                    <span className="font-semibold inline-flex items-center gap-1 text-emerald-400">
                      <Gift size={11} />
                      {formatFreeLabel(freeAccess)}
                    </span>
                  ) : (
                    <>
                      <span
                        className={`
                          font-semibold inline-flex items-center gap-1
                          ${!isFallbackPrice ? 'text-[var(--accent-yellow)]' : 'text-white/50'}
                        `}
                      >
                        {showPriceLoader && <Loader2 size={10} className="animate-spin" />}
                        {showFromPrefix && <span className="text-white/35">от</span>}
                        {formatCost(displayedCost)} 🔥
                      </span>
                      {matchedLabel && !isFallbackPrice && (
                        <span className="text-white/40">· {matchedLabel}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
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
              {/* 🆕 Версия модели (Flex/Pro) */}
              {caps.versions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    <Sparkles size={12} />
                    Версия модели
                    <span className="text-[10px] text-[var(--accent-yellow)]/70 normal-case font-medium ml-1">
                      влияет на цену
                    </span>
                  </div>
                  <div
                    className={`grid gap-1.5 ${caps.versions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                      }`}
                  >
                    {caps.versions.map((v) => (
                      <button
                        key={v}
                        className={`
                          py-2 px-2.5 rounded-[var(--radius-xs)]
                          border text-[12px] font-medium
                          cursor-pointer transition-all duration-150
                          active:scale-[0.96]
                          ${version === v
                            ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                            : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                          }
                        `}
                        onClick={() => setParam('version', v)}
                      >
                        {VERSION_LABELS[v] || v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Режим */}
              {caps.modes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    <Sparkles size={12} />
                    Режим
                    <span className="text-[10px] text-[var(--accent-yellow)]/70 normal-case font-medium ml-1">
                      влияет на цену
                    </span>
                  </div>
                  <div
                    className={`grid gap-1.5 ${caps.modes.length === 2
                      ? 'grid-cols-2'
                      : caps.modes.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2'
                      }`}
                  >
                    {caps.modes.map((m) => (
                      <button
                        key={m}
                        className={`
                          py-2 px-2.5 rounded-[var(--radius-xs)]
                          border text-[12px] font-medium
                          cursor-pointer transition-all duration-150
                          active:scale-[0.96]
                          ${mode === m
                            ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                            : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
                          }
                        `}
                        onClick={() => setParam('mode', m)}
                      >
                        {MODE_LABELS[m] || m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      onClick={() => setParam('aspectRatio', ar)}
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
                    <span className="text-[10px] text-[var(--accent-yellow)]/70 normal-case font-medium ml-1">
                      влияет на цену
                    </span>
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
                        onClick={() => setParam('resolution', r)}
                      >
                        {RESOLUTION_LABELS[r] || r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Качество */}
              {caps.qualities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                    <Zap size={12} />
                    Качество
                    <span className="text-[10px] text-[var(--accent-yellow)]/70 normal-case font-medium ml-1">
                      влияет на цену
                    </span>
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
                        onClick={() => setParam('quality', q)}
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

              {/* 🆕 Кнопка ОК — завершает настройки */}
              <button
                className="
                  mt-1 w-full py-3 rounded-[var(--radius-sm)]
                  bg-[var(--accent-yellow)] text-black
                  text-[14px] font-semibold
                  flex items-center justify-center gap-2
                  cursor-pointer transition-all duration-150
                  active:scale-[0.98] active:bg-[var(--accent-yellow-bright)]
                  [-webkit-tap-highlight-color:transparent]
                "
                onClick={() => {
                  setShowSettings(false)
                  haptic('light')
                }}
              >
                <Check size={16} /> Готово
              </button>
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
        fs-page__input
          shrink-0 flex flex-col gap-2
          px-2.5 pt-2.5 pb-4
          mb-[calc(59px+var(--safe-bottom))]
          border-t border-[var(--border-glass)]
          bg-[var(--bg-glass-heavy)]
          backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
        "
      >
        <div className="flex items-center gap-2">
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
              (requiresInputImage && inputImages.length === 0)
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