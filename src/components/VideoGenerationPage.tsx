'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown, Send, Check, X, Video, Settings, Wand2,
  Clock, Maximize2, Zap, Loader2, Upload, Image as ImageIcon,
  Sparkles, Layers, Volume2, ShieldOff, Type, Film, Images,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { useModelUIConfig, type ModelUIConfig } from '@/hooks/useModelUIConfig'
import { usePriceCalculator } from '@/hooks/usePriceCalculator'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'
import { useAuthStore } from '@/stores'

/* ─── Props ─── */

interface Props {
  initialModel?: string
  onBack?: () => void
}

/* ─── Veo modes ─── */

type VeoMode = 'text' | 'frames' | 'reference'

const VEO_MODE_TO_GENERATION_TYPE: Record<VeoMode, string> = {
  text: 'TEXT_2_VIDEO',
  frames: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
  reference: 'REFERENCE_2_VIDEO',
}

/* ─── UI labels ─── */

const AR_L: Record<string, string> = {
  landscape: '🖥 Пейзаж', portrait: '📱 Портрет',
  '16:9': '16:9', '9:16': '9:16', '1:1': '1:1',
  '4:3': '4:3', '3:4': '3:4', '21:9': '21:9', Auto: 'Авто',
}

const Q_L: Record<string, string> = {
  '720p': '720p', '1080p': '1080p HD', '4k': '4K Ultra',
  '768P': '768P', '1080P': '1080P',
  low: 'Low', medium: 'Medium', high: 'High', auto: 'Авто',
}

const MODE_L: Record<string, string> = {
  std: 'Standard', standard: 'Standard',
  pro: 'Pro', fast: 'Быстрый', turbo: 'Турбо',
  relax: 'Relax',
}

const EXAMPLES = [
  'Кинематографичный пролёт над горами на рассвете, облака ниже камеры',
  'Кот в очках сидит за компьютером и пишет код, уютная комната',
  'Таймлапс звёздного неба над пустыней, Млечный путь',
  'Медленное вращение вокруг чашки кофе с паром, макросъёмка',
  'Футуристический город с летающими машинами, ночь, неон',
]

/* ─── Fallback caps (если бэк не отдал uiConfig) ───
   ⚠️ Синхронизировано с РЕАЛЬНЫМИ slug бэкенд-каталога. */

interface FallbackCaps {
  aspectRatios: string[]
  durations: number[]
  qualities: string[]
  resolutions: string[]
  modes: string[]
  supportsImageInput: boolean
  maxInputImages: number
  supportsSound: boolean
  supportsRemoveWatermark: boolean
}

const FALLBACK: Record<string, FallbackCaps> = {
  // ─── Veo 3.1 (KIE) — slug точно как в каталоге бэка ───
  veo3_lite: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8], qualities: ['720p', '1080p', '4k'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 3,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  veo3_fast: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8], qualities: ['720p', '1080p', '4k'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 3,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  veo3: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8], qualities: ['720p', '1080p', '4k'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  // ─── Sora 2 ───
  'sora-2': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 8, 12], qualities: [],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  'sora-2-pro': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 8, 12], qualities: ['720p', '1080p'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  // ─── Kling 3.0 (KIE) ───
  'kling-3.0': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10, 15], qualities: [],
    resolutions: [], modes: ['std', 'pro'], supportsImageInput: true, maxInputImages: 1,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  // ─── Runway ───
  runway: {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durations: [5, 10], qualities: [],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  // ─── Hailuo 02 ───
  'hailuo-02': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [6, 10], qualities: [],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  // ─── Wan 2.7 (KIE) ───
  'wan-2.7': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durations: [5, 10], qualities: [],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  // ─── Seedance ───
  'seedance-1.5-pro': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10], qualities: [],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
}

const DEFAULT_FALLBACK: FallbackCaps = {
  aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10],
  qualities: [], resolutions: [], modes: [],
  supportsImageInput: false, maxInputImages: 0,
  supportsSound: false, supportsRemoveWatermark: false,
}

/* ─── Helpers ─── */

function isVeoSlug(slug: string): boolean {
  return slug.startsWith('veo')
}

function getParamOptions(config: ModelUIConfig | null, key: string): string[] {
  if (!config?.uiParameters) return []
  const p = config.uiParameters.find((x) => x.key === key)
  return p?.options?.map((o) => String(o.value)) ?? []
}

function getNumericOptions(config: ModelUIConfig | null, key: string): number[] {
  if (!config?.uiParameters) return []
  const p = config.uiParameters.find((x) => x.key === key)
  return p?.options?.map((o) => Number(o.value)).filter((n) => !isNaN(n)) ?? []
}

function hasParam(config: ModelUIConfig | null, key: string): boolean {
  if (!config?.uiParameters) return false
  return config.uiParameters.some((p) => p.key === key)
}

function getDefault(config: ModelUIConfig | null, key: string): string | undefined {
  if (!config?.uiParameters) return undefined
  const p = config.uiParameters.find((x) => x.key === key)
  return p?.defaultValue !== undefined ? String(p.defaultValue) : undefined
}

/* ─── Component ─── */

export function VideoGenerationPage({ initialModel, onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const videoModels = useMemo(
    () => allModels.filter((m: any) => m.category === 'video'),
    [allModels],
  )

  /* ── State ── */

  const [input, setInput] = useState('')

  const resolveInitialSlug = useCallback((): string => {
    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const byExact = videoModels.find(
        (m: any) => m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
      )
      if (byExact) return byExact.slug
    }
    return videoModels[0]?.slug ?? 'veo3_fast'
  }, [initialModel, videoModels])

  const [slug, setSlug] = useState<string>(() => resolveInitialSlug())
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [generating, setGenerating] = useState(false)

  // params
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [quality, setQuality] = useState('')
  const [resolution, setResolution] = useState('')
  const [mode, setMode] = useState<string | undefined>(undefined)
  const [sound, setSound] = useState(false)
  const [removeWatermark, setRemoveWatermark] = useState(true)

  // single image (для не-Veo моделей: kling/wan/sora/runway/hailuo)
  const [imgUrl, setImgUrl] = useState('')

  // 🆕 Veo: режим + кадры + референсы
  const [veoMode, setVeoMode] = useState<VeoMode>('text')
  const [startFrame, setStartFrame] = useState('')
  const [endFrame, setEndFrame] = useState('')
  const [refImages, setRefImages] = useState<string[]>([])

  const [uploading, setUploading] = useState(false)
  // куда загружать: 'single' | 'start' | 'end' | 'ref'
  const uploadTarget = useRef<'single' | 'start' | 'end' | 'ref'>('single')

  const [syncedSlug, setSyncedSlug] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)
  const initialAppliedRef = useRef(false)

  const model = videoModels.find((m: any) => m.slug === slug)
  const modelMinCost = model?.cost || 15

  const isVeo = isVeoSlug(slug)

  /* ── UI config from backend ── */

  const { config: uiConfig, isLoading: isLoadingConfig } = useModelUIConfig(slug)

  /* ── Caps (бэк + fallback) ── */

  const caps = useMemo(() => {
    const fb = FALLBACK[slug] || DEFAULT_FALLBACK

    if (!uiConfig) {
      return {
        aspectRatios: fb.aspectRatios,
        durations: fb.durations,
        qualities: fb.qualities,
        resolutions: fb.resolutions,
        modes: fb.modes,
        supportsImageInput: fb.supportsImageInput,
        maxInputImages: fb.maxInputImages,
        supportsSound: fb.supportsSound,
        supportsRemoveWatermark: fb.supportsRemoveWatermark,
      }
    }

    const arBackend = getParamOptions(uiConfig, 'aspectRatio')
    const durBackend = getNumericOptions(uiConfig, 'duration')
    const qBackend = getParamOptions(uiConfig, 'quality')
    const rBackend = getParamOptions(uiConfig, 'resolution')
    const modeBackend = getParamOptions(uiConfig, 'mode')
    const inputCap = uiConfig.inputCapabilities || {}

    return {
      aspectRatios: arBackend.length ? arBackend : fb.aspectRatios,
      durations:    durBackend.length ? durBackend : fb.durations,
      qualities:    qBackend.length   ? qBackend   : fb.qualities,
      resolutions:  rBackend.length   ? rBackend   : fb.resolutions,
      modes:        modeBackend.length ? modeBackend : fb.modes,
      supportsImageInput: inputCap.acceptsImages === true || fb.supportsImageInput,
      maxInputImages: inputCap.maxInputImages ?? fb.maxInputImages,
      supportsSound:
        hasParam(uiConfig, 'sound') ||
        hasParam(uiConfig, 'generateAudio') ||
        fb.supportsSound,
      supportsRemoveWatermark:
        hasParam(uiConfig, 'removeWatermark') || fb.supportsRemoveWatermark,
    }
  }, [uiConfig, slug])

  // Для НЕ-Veo: одиночное изображение
  const isI2V = !isVeo && caps.supportsImageInput && caps.maxInputImages > 0
  const requiresInputImage =
    !isVeo &&
    (slug.includes('img2vid') || slug.includes('img2video') || slug === 'kling-3.0-motion')

  // Veo: в режиме reference duration фиксируется на 8
  const veoForcesDuration8 = isVeo && veoMode === 'reference'

  /* ── Price calculator ── */

  const priceParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (caps.modes.length > 0 && mode) p.mode = mode
    if (caps.durations.length > 0 && duration !== undefined) {
      p.duration = veoForcesDuration8 ? 8 : duration
    }
    if (caps.aspectRatios.length > 0 && aspectRatio) p.aspectRatio = aspectRatio
    if (caps.qualities.length > 0 && quality) p.quality = quality
    if (caps.resolutions.length > 0 && resolution) p.resolution = resolution
    if (caps.supportsSound) p.sound = sound
    if (caps.supportsRemoveWatermark) p.removeWatermark = removeWatermark

    // hasInputImage для расчёта цены
    if (isVeo) {
      const hasImg =
        (veoMode === 'frames' && !!startFrame) ||
        (veoMode === 'reference' && refImages.length > 0)
      if (hasImg) p.hasInputImage = true
    } else if (imgUrl) {
      p.hasInputImage = true
    }
    return p
  }, [
    mode, duration, aspectRatio, quality, resolution, sound, removeWatermark,
    imgUrl, caps, isVeo, veoMode, startFrame, refImages, veoForcesDuration8,
  ])

  const { price, isCalculating } = usePriceCalculator(slug, priceParams, {
    enabled: !!uiConfig && syncedSlug === slug,
    debounceMs: 300,
  })

  /* ── Cached price (без прыжков) ── */

  const lastPriceRef = useRef<{ cost: number; label?: string; fallback: boolean } | null>(null)

  const isConfigReady = !!uiConfig && !isLoadingConfig && syncedSlug === slug

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
  }, [slug])

  const displayedCost = (() => {
    if (!isConfigReady) return modelMinCost
    if (price && !isCalculating) return price.costInTokens ?? modelMinCost
    if (lastPriceRef.current) return lastPriceRef.current.cost
    return modelMinCost
  })()

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

  const hasPriceVariants = useMemo(() => {
    if (!uiConfig?.uiParameters) return false
    return uiConfig.uiParameters.some(
      (p) => p.affectsPrice && (p.options?.length ?? 0) > 1,
    )
  }, [uiConfig])

  const showFromPrefix = !isConfigReady || (hasPriceVariants && isFallbackPrice)

  /* ── Sync initial model ── */

  useEffect(() => {
    if (initialAppliedRef.current) return
    if (videoModels.length === 0) return

    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const match = videoModels.find(
        (m: any) => m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
      )
      if (match) {
        if (match.slug !== slug) {
          setSyncedSlug(null)
          setSlug(match.slug)
        }
        initialAppliedRef.current = true
        return
      }
      return
    }

    const slugExists = videoModels.some((m: any) => m.slug === slug)
    if (!slugExists) {
      const first = videoModels[0]
      if (first) {
        setSyncedSlug(null)
        setSlug(first.slug)
      }
    }
    initialAppliedRef.current = true
  }, [initialModel, videoModels, slug])

  /* ── Batch reset when caps changed (по slug) ── */

  useEffect(() => {
    const defAr = getDefault(uiConfig, 'aspectRatio') ?? caps.aspectRatios[0] ?? '16:9'
    const defDurStr = getDefault(uiConfig, 'duration')
    const defDur = defDurStr ? Number(defDurStr) : caps.durations[0]
    const defQ = getDefault(uiConfig, 'quality') ?? caps.qualities[0] ?? ''
    const defR = getDefault(uiConfig, 'resolution') ?? caps.resolutions[0] ?? ''
    const defMode = getDefault(uiConfig, 'mode') ?? caps.modes[0]

    setAspectRatio(defAr)
    setDuration(defDur)
    setQuality(defQ)
    setResolution(defR)
    setMode(defMode)
    setSound(false)
    setRemoveWatermark(true)
    setImgUrl('')

    // 🆕 сброс Veo-специфики
    setVeoMode('text')
    setStartFrame('')
    setEndFrame('')
    setRefImages([])

    setSyncedSlug(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiConfig, slug])

  // 🆕 При переключении в reference — форсим duration=8
  useEffect(() => {
    if (veoForcesDuration8) setDuration(8)
  }, [veoForcesDuration8])

  /* ── Misc ── */

  const vidGens = useMemo(
    () => generations.filter((g: any) => g.type === 'video'),
    [generations],
  )

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
  }, [input])

  useEffect(() => {
    const el = resultsContainerRef.current
    if (!el) return
    if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
  }, [vidGens.length])

  /* ── Upload ── */

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.match(/image\/(jpeg|png|webp)/)) {
        toast.error('Только JPEG, PNG, WebP')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Макс 10MB')
        return
      }
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const token = useAuthStore.getState().token
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!r.ok) throw new Error('Upload failed')
        const d = await r.json()
        const url = d.data?.url || d.url
        if (!url) throw new Error('No URL')

                // распределяем по целевому слоту
        const target = uploadTarget.current
        if (target === 'single') {
          setImgUrl(url)
        } else if (target === 'start') {
          setStartFrame(url)
        } else if (target === 'end') {
          setEndFrame(url)
        } else if (target === 'ref') {
          setRefImages((prev) => {
            const max = caps.maxInputImages || 3
            if (prev.length >= max) return prev
            return [...prev, url]
          })
        }

        haptic('light')
        toast.success('Изображение загружено')
      } catch (e: any) {
        toast.error(e.message || 'Ошибка загрузки')
      } finally {
        setUploading(false)
      }
    },
    [haptic, caps.maxInputImages],
  )

  const triggerUpload = useCallback(
    (target: 'single' | 'start' | 'end' | 'ref') => {
      uploadTarget.current = target
      fileRef.current?.click()
    },
    [],
  )

  /* ── Telegram BackButton ── */

  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const handler = () => {
      if (showSettings) { setShowSettings(false); return }
      if (showModelPicker) { setShowModelPicker(false); return }
      onBack?.()
    }
    webApp.BackButton.onClick(handler)
    return () => {
      webApp.BackButton.offClick(handler)
      webApp.BackButton.hide()
    }
  }, [webApp, onBack, showSettings, showModelPicker])

  /* ── Generate ── */

  const doGen = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    // ── Валидация входных изображений ──
    if (isVeo) {
      if (veoMode === 'frames' && !startFrame) {
        toast.warning('Загрузите стартовый кадр')
        return
      }
      if (veoMode === 'reference' && refImages.length === 0) {
        toast.warning('Загрузите хотя бы одно референс-изображение')
        return
      }
    } else if (requiresInputImage && !imgUrl) {
      toast.warning('Загрузите изображение для этой модели')
      return
    }

    if (balance < displayedCost) {
      toast.warning(`Недостаточно спичек. Нужно ${displayedCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setGenerating(true)

    const s: Record<string, unknown> = {}

    // ── duration: kie-модели (kling/wan) ждут строку, veo/sora — число ──
    if (caps.durations.length && duration !== undefined) {
      const dur = veoForcesDuration8 ? 8 : duration
      const isKieStr = slug.startsWith('kling') || slug.startsWith('wan')
      s.duration = isKieStr ? String(dur) : dur
    }

    if (caps.aspectRatios.length && aspectRatio) s.aspectRatio = aspectRatio

    // ── Разрешение/качество ──
    if (caps.qualities.length && quality) s.quality = quality
    if (caps.resolutions.length && resolution) s.resolution = resolution

    if (caps.modes.length && mode) s.mode = mode

    // ── Звук: Veo ждёт generateAudio, остальные — sound ──
    if (caps.supportsSound) {
      s.sound = sound
      if (isVeo) s.generateAudio = sound
    }

    if (caps.supportsRemoveWatermark) s.removeWatermark = removeWatermark

    // ── Входные изображения ──
    if (isVeo) {
      // 🆕 явный режим Veo → generationType
      s.generationType = VEO_MODE_TO_GENERATION_TYPE[veoMode]

      if (veoMode === 'frames') {
        // [start] или [start, end]
        const frames = [startFrame, endFrame].filter(Boolean)
        if (frames.length) s.imageUrls = frames
      } else if (veoMode === 'reference') {
        // 1-3 референса
        if (refImages.length) s.referenceImages = refImages.slice(0, 3)
      }
      // text → ничего не шлём
    } else {
      // обычные i2v модели — одиночное изображение
      if (caps.supportsImageInput && imgUrl) s.imageUrl = imgUrl
    }

    const ok = await generate({ type: 'video', model: slug, prompt, settings: s })
    setGenerating(false)
    if (ok) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [
    input, balance, displayedCost, slug, imgUrl,
    duration, aspectRatio, quality, resolution, mode, sound, removeWatermark,
    caps, requiresInputImage, haptic, hapticNotification, generate,
    isVeo, veoMode, startFrame, endFrame, refImages, veoForcesDuration8,
  ])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doGen()
    }
  }

  const insertExample = useCallback(() => {
    setInput(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])
    haptic('light')
  }, [haptic])

  const switchModel = (newSlug: string) => {
    if (newSlug === slug) return
    setSyncedSlug(null)
    setSlug(newSlug)
  }

  const formatCost = (n: number) => (n % 1 === 0 ? n : n.toFixed(2))

  const hasResults = vidGens.length > 0

  // Кнопка генерации заблокирована?
  const genDisabled =
    !input.trim() ||
    generating ||
    (isVeo && veoMode === 'frames' && !startFrame) ||
    (isVeo && veoMode === 'reference' && refImages.length === 0) ||
    (!isVeo && requiresInputImage && !imgUrl)

  // Бейджики для строки модели
  const activeBadges = useMemo(() => {
    const badges: { key: string; label: string; accent?: boolean }[] = []

    // 🆕 Veo режим
    if (isVeo) {
      const modeLabel =
        veoMode === 'text' ? '✍️ Текст' :
        veoMode === 'frames' ? '🎞 Кадры' : '🖼 Референс'
      badges.push({ key: 'veomode', label: modeLabel, accent: veoMode !== 'text' })
    }

    if (caps.modes.length > 0 && mode) {
      badges.push({ key: 'mode', label: MODE_L[mode] || mode, accent: true })
    }
    if (caps.durations.length > 0 && duration !== undefined) {
      badges.push({ key: 'dur', label: `${veoForcesDuration8 ? 8 : duration} сек` })
    }
    if (caps.aspectRatios.length > 0 && aspectRatio) {
      badges.push({ key: 'ar', label: AR_L[aspectRatio] || aspectRatio })
    }
    if (caps.qualities.length > 0 && quality) {
      badges.push({ key: 'q', label: Q_L[quality] || quality })
    }
    if (caps.resolutions.length > 0 && resolution) {
      badges.push({ key: 'res', label: resolution })
    }
    if (caps.supportsSound) {
      badges.push({ key: 'sound', label: sound ? '🔊' : '🔇', accent: sound })
    }
    if (isI2V) {
      badges.push({
        key: 'img2vid',
        label: imgUrl ? '📸 Фото' : 'img2vid',
        accent: !!imgUrl,
      })
    }
    return badges
  }, [
    caps, mode, duration, aspectRatio, quality, resolution, sound, isI2V, imgUrl,
    isVeo, veoMode, veoForcesDuration8,
  ])

  const getGenCost = (gen: any): number | undefined => {
    return gen.tokensUsed ?? gen.cost ?? gen.costInTokens ?? gen.tokensCost
  }

  /* ─── Render ─── */

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
          <Video size={14} className="text-[var(--gray-500)] shrink-0" />

          <span className="text-white text-[13px] font-semibold truncate shrink-0 max-w-[42%]">
            {model?.name ?? slug}
          </span>

          <div className="flex-1 min-w-0" />

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
            {videoModels.map((m: any) => (
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
                  ${slug === m.slug ? 'text-white' : ''}
                `}
                onClick={() => {
                  switchModel(m.slug)
                  setShowModelPicker(false)
                  haptic('light')
                }}
              >
                <div className="flex flex-col gap-[1px] min-w-0">
                  <span className="font-semibold truncate">{m.name}</span>
                  <span className="text-[11px] text-[var(--gray-600)] truncate">
                    {m.provider}
                    {isVeoSlug(m.slug)
                      ? ' · txt/img/ref'
                      : (m.slug.includes('img') || m.slug.includes('motion'))
                        ? ' · img2vid'
                        : ' · txt2vid'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-white/40">
                    от {formatCost(m.cost)} 🔥
                  </span>
                  {slug === m.slug && <Check size={14} className="text-[var(--accent-yellow)]" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🆕 ── Veo mode tabs ── */}
      {isVeo && (
        <div
          className="
            shrink-0 flex items-center gap-1.5
            px-4 py-2
            bg-[rgba(8,8,10,0.9)]
            border-b border-white/[0.04]
          "
        >
          <VeoTab
            active={veoMode === 'text'}
            icon={<Type size={13} />}
            label="Текст"
            onClick={() => { setVeoMode('text'); haptic('light') }}
          />
          <VeoTab
            active={veoMode === 'frames'}
            icon={<Film size={13} />}
            label="Кадры"
            onClick={() => { setVeoMode('frames'); haptic('light') }}
          />
          <VeoTab
            active={veoMode === 'reference'}
            icon={<Images size={13} />}
            label="Референс"
            onClick={() => { setVeoMode('reference'); haptic('light') }}
          />
        </div>
      )}

      {/* ── Results ── */}
      <div
        ref={resultsContainerRef}
        className="
          fs-page__scroll
          flex-1 min-h-0 overflow-y-auto
          overscroll-contain [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex flex-col gap-3.5 px-4 py-3">
          {!hasResults && !generating && (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in fade-in--2">
              <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
                <Video size={36} strokeWidth={1.5} />
              </div>
              <div className="text-[17px] font-semibold text-white/60">Генерация видео</div>
              <div className="text-[13px] text-white/30 max-w-[280px] leading-[1.5]">
                {isVeo && veoMode === 'frames'
                  ? 'Загрузите кадры (старт и конец) — Veo создаст переход между ними.'
                  : isVeo && veoMode === 'reference'
                  ? 'Загрузите до 3 референсов (персонаж, стиль, локация) и опишите сцену.'
                  : 'Опишите сцену. Видео может генерироваться до 5 минут.'}
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

          {vidGens.map((gen: any) => {
            const genCost = getGenCost(gen)
            return (
              <div key={gen.id} className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
                <div className="text-[13px] text-white/45 leading-[1.4] break-words">
                  <span className="inline-block text-[10px] font-semibold bg-white/[0.06] px-2 py-0.5 rounded mr-1.5 text-white/50 align-middle">
                    {gen.model}
                  </span>
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

          {generating && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold py-1 px-2 rounded-[6px] bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] text-[var(--accent-yellow)]">
                  {model?.name ?? slug}
                </span>
                <span className="text-[12px] text-[var(--gray-400)] flex-1 min-w-0 truncate">
                  {input || 'Генерация...'}
                </span>
              </div>
              <div
                className="
                  aspect-video w-full max-w-[500px] mx-auto
                  rounded-[var(--radius-md)]
                  border border-[var(--border-glass)]
                  bg-[var(--bg-glass)]
                  flex flex-col items-center justify-center gap-3
                  relative overflow-hidden
                "
              >
                <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-[rgba(250,204,21,0.15)] via-transparent to-[rgba(250,204,21,0.08)] animate-pulse" />
                <Loader2 size={36} className="text-[var(--accent-yellow)] animate-spin relative z-10" strokeWidth={1.5} />
                <div className="text-[13px] font-medium text-white/70 relative z-10">
                  Создаём видео...
                </div>
                <div className="text-[11px] text-white/40 relative z-10">
                  Обычно 1–5 минут
                </div>
              </div>
            </div>
          )}

          <div ref={resultsEndRef} />
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
                  {model?.name ?? 'Настройки'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--gray-500)]">Цена:</span>
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
              {/* 🆕 Veo mode (дубль таба в настройках) */}
              {isVeo && (
                <Field label={<><Sparkles size={12} /> Режим Veo</>}>
                  <Grid cols={3}>
                    <OptBtn active={veoMode === 'text'} onClick={() => { setVeoMode('text'); haptic('light') }}>Текст</OptBtn>
                    <OptBtn active={veoMode === 'frames'} onClick={() => { setVeoMode('frames'); haptic('light') }}>Кадры</OptBtn>
                    <OptBtn active={veoMode === 'reference'} onClick={() => { setVeoMode('reference'); haptic('light') }}>Референс</OptBtn>
                  </Grid>
                </Field>
              )}

                            {/* Mode */}
              {caps.modes.length > 0 && (
                <Field label={<><Sparkles size={12} /> Режим</>} priceHint>
                  <Grid cols={caps.modes.length === 2 ? 2 : caps.modes.length === 3 ? 3 : 2}>
                    {caps.modes.map((m) => (
                      <OptBtn key={m} active={mode === m} onClick={() => { setMode(m); haptic('light') }}>
                        {MODE_L[m] || m}
                      </OptBtn>
                    ))}
                  </Grid>
                </Field>
              )}

              {/* Duration */}
              {caps.durations.length > 0 && (
                <Field label={<><Clock size={12} /> Длительность</>} priceHint>
                  {veoForcesDuration8 ? (
                    <div className="text-[12px] text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-[var(--radius-xs)] px-3 py-2.5">
                      В режиме «Референс» длительность фиксирована — <b className="text-white/60">8 сек</b>
                    </div>
                  ) : (
                    <Grid cols={caps.durations.length <= 3 ? caps.durations.length : 3}>
                      {caps.durations.map((d) => (
                        <OptBtn key={d} active={duration === d} onClick={() => { setDuration(d); haptic('light') }}>
                          {d} сек
                        </OptBtn>
                      ))}
                    </Grid>
                  )}
                </Field>
              )}

              {/* Aspect Ratio */}
              {caps.aspectRatios.length > 0 && (
                <Field label={<><Maximize2 size={12} /> Соотношение сторон</>}>
                  <Grid cols={3}>
                    {caps.aspectRatios.map((a) => (
                      <OptBtn key={a} active={aspectRatio === a} onClick={() => { setAspectRatio(a); haptic('light') }}>
                        {AR_L[a] || a}
                      </OptBtn>
                    ))}
                  </Grid>
                </Field>
              )}

              {/* Quality */}
              {caps.qualities.length > 0 && (
                <Field label={<><Zap size={12} /> Качество</>} priceHint>
                  <Grid cols={caps.qualities.length <= 3 ? caps.qualities.length : 3}>
                    {caps.qualities.map((q) => (
                      <OptBtn key={q} active={quality === q} onClick={() => { setQuality(q); haptic('light') }}>
                        {Q_L[q] || q}
                      </OptBtn>
                    ))}
                  </Grid>
                </Field>
              )}

              {/* Resolution */}
              {caps.resolutions.length > 0 && (
                <Field label={<><Layers size={12} /> Разрешение</>} priceHint>
                  <Grid cols={caps.resolutions.length <= 3 ? caps.resolutions.length : 3}>
                    {caps.resolutions.map((r) => (
                      <OptBtn key={r} active={resolution === r} onClick={() => { setResolution(r); haptic('light') }}>
                        {r}
                      </OptBtn>
                    ))}
                  </Grid>
                </Field>
              )}

              {/* Sound */}
              {caps.supportsSound && (
                <Field label={<><Volume2 size={12} /> Звук</>}>
                  <Grid cols={2}>
                    <OptBtn active={sound} onClick={() => { setSound(true); haptic('light') }}>Включить</OptBtn>
                    <OptBtn active={!sound} onClick={() => { setSound(false); haptic('light') }}>Выключить</OptBtn>
                  </Grid>
                </Field>
              )}

              {/* Remove watermark */}
              {caps.supportsRemoveWatermark && (
                <Field label={<><ShieldOff size={12} /> Водяной знак</>}>
                  <Grid cols={2}>
                    <OptBtn active={removeWatermark} onClick={() => { setRemoveWatermark(true); haptic('light') }}>Убрать</OptBtn>
                    <OptBtn active={!removeWatermark} onClick={() => { setRemoveWatermark(false); haptic('light') }}>Оставить</OptBtn>
                  </Grid>
                </Field>
              )}

              {/* Sora warning */}
              {(slug === 'sora-2-pro' || slug === 'sora-2') && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-[12px] text-white/60 leading-relaxed">
                  ⚠️ Sora 2 имеет строгую модерацию. Реальные люди на изображениях не поддерживаются.
                </div>
              )}

              {/* ─── Veo: FRAMES (старт + конец) ─── */}
              {isVeo && veoMode === 'frames' && (
                <Field label={<><Film size={12} /> Кадры (старт → конец)</>}>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Start frame */}
                    <FrameSlot
                      label="Старт"
                      url={startFrame}
                      uploading={uploading && uploadTarget.current === 'start'}
                      onUpload={() => triggerUpload('start')}
                      onRemove={() => setStartFrame('')}
                    />
                    {/* End frame (опционально) */}
                    <FrameSlot
                      label="Конец (опц.)"
                      url={endFrame}
                      uploading={uploading && uploadTarget.current === 'end'}
                      onUpload={() => triggerUpload('end')}
                      onRemove={() => setEndFrame('')}
                    />
                  </div>
                  <div className="text-[10px] text-white/30 mt-1.5 leading-relaxed">
                    Старт обязателен. Конец — опционально (Veo создаст плавный переход).
                  </div>
                </Field>
              )}

              {/* ─── Veo: REFERENCE (1-3 изображения) ─── */}
              {isVeo && veoMode === 'reference' && (
                <Field label={<><Images size={12} /> Референсы (1–{caps.maxInputImages || 3})</>}>
                  <div className="grid grid-cols-3 gap-2">
                    {refImages.map((url, idx) => (
                      <div key={url + idx} className="relative aspect-square rounded-[10px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
                        />
                        <button
                          className="
                            absolute -top-1.5 -right-1.5
                            w-5 h-5 rounded-full border-none
                            bg-red-500 text-white
                            flex items-center justify-center
                            cursor-pointer z-[2]
                          "
                          onClick={() => setRefImages((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {refImages.length < (caps.maxInputImages || 3) && (
                      <button
                        className="
                          aspect-square rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1 text-[10px]
                          cursor-pointer transition-all
                          active:bg-white/[0.07] active:border-white/[0.22]
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        onClick={() => triggerUpload('ref')}
                        disabled={uploading}
                      >
                        {uploading && uploadTarget.current === 'ref'
                          ? <Loader2 size={20} className="animate-spin" />
                          : <Upload size={20} />}
                        <span>Добавить</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1.5 leading-relaxed">
                    Персонаж, стиль или локация. Veo перенесёт их в видео по вашему описанию.
                  </div>
                </Field>
              )}

              {/* ─── Обычные модели: одиночное входное изображение ─── */}
              {!isVeo && caps.supportsImageInput && (
                <Field label={<><ImageIcon size={12} /> Входное изображение</>}>
                  <div className="grid grid-cols-4 gap-2">
                    {imgUrl ? (
                      <div className="relative aspect-square rounded-[10px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
                        />
                        <button
                          className="
                            absolute -top-1.5 -right-1.5
                            w-5 h-5 rounded-full border-none
                            bg-red-500 text-white
                            flex items-center justify-center
                            cursor-pointer z-[2]
                          "
                          onClick={() => setImgUrl('')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="
                          aspect-square rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1 text-[10px]
                          cursor-pointer transition-all
                          active:bg-white/[0.07] active:border-white/[0.22]
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        onClick={() => triggerUpload('single')}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <span>{uploading ? 'Загрузка...' : 'Добавить'}</span>
                      </button>
                    )}
                  </div>
                </Field>
              )}
            </div>
          </div>
        </>
      )}

      {/* Скрытый file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
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
        {/* Превью прикреплённых изображений */}
        {(() => {
          // что показывать в чипах над инпутом
          const chips: { url: string; label: string; onRemove: () => void }[] = []
          if (isVeo) {
            if (veoMode === 'frames') {
              if (startFrame) chips.push({ url: startFrame, label: 'Старт', onRemove: () => setStartFrame('') })
              if (endFrame) chips.push({ url: endFrame, label: 'Конец', onRemove: () => setEndFrame('') })
            } else if (veoMode === 'reference') {
              refImages.forEach((url, idx) =>
                chips.push({ url, label: `Реф ${idx + 1}`, onRemove: () => setRefImages((p) => p.filter((_, i) => i !== idx)) }),
              )
            }
          } else if (imgUrl) {
            chips.push({ url: imgUrl, label: 'Изображение', onRemove: () => setImgUrl('') })
          }

          if (chips.length === 0) return null

          return (
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
              {chips.map((c, i) => (
                <div
                  key={c.url + i}
                  className="
                    flex items-center gap-[5px]
                    py-1.5 px-2.5
                    rounded-[var(--radius-xs)]
                    bg-[var(--bg-glass)] border border-[var(--border-glass)]
                    text-[var(--gray-400)] text-[11px]
                    shrink-0
                  "
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt="" className="w-5 h-5 rounded-[3px] object-cover block" />
                  <span>{c.label}</span>
                  <button
                    className="
                      w-4 h-4 rounded-[4px] border-none
                      bg-white/[0.06] text-[var(--gray-500)]
                      flex items-center justify-center
                      cursor-pointer ml-0.5
                      active:bg-[rgba(239,68,68,0.2)] active:text-[var(--accent-red)]
                    "
                    onClick={() => { c.onRemove(); haptic('light') }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )
        })()}

        <div className="flex items-center gap-2">
          {/* Кнопка загрузки (быстрый доступ) */}
          {((isVeo && veoMode !== 'text') || (!isVeo && caps.supportsImageInput)) && (
            <button
              className={`
                w-[38px] h-[38px] rounded-[10px] border-none
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0 self-center
                ${
                  (isVeo && veoMode === 'frames' && startFrame) ||
                  (isVeo && veoMode === 'reference' && refImages.length > 0) ||
                  (!isVeo && imgUrl)
                    ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                    : 'bg-white/[0.04] text-[var(--gray-500)]'
                }
                active:scale-[0.92]
                disabled:opacity-50 disabled:cursor-default
              `}
              onClick={() => {
                if (isVeo && veoMode === 'frames') triggerUpload(startFrame ? 'end' : 'start')
                else if (isVeo && veoMode === 'reference') triggerUpload('ref')
                else triggerUpload('single')
              }}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
            </button>
          )}

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
              isVeo && veoMode === 'frames'
                ? 'Опишите движение между кадрами...'
                : isVeo && veoMode === 'reference'
                ? 'Опишите сцену с референсами...'
                : requiresInputImage
                ? 'Загрузите фото и опишите видео...'
                : 'Опишите видео...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={generating}
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
            onClick={doGen}
            disabled={genDisabled}
          >
            {generating ? (
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

/* ─────────────────────────────────────────────────────────────
   Helper components
   ───────────────────────────────────────────────────────────── */

function VeoTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`
        flex-1 flex items-center justify-center gap-1.5
        py-2 px-2 rounded-[var(--radius-xs)]
        text-[12px] font-medium
        border transition-all duration-150
        cursor-pointer [-webkit-tap-highlight-color:transparent]
        active:scale-[0.97]
        ${active
          ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
          : 'bg-white/[0.03] border-white/[0.06] text-[var(--gray-400)]'
        }
      `}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function FrameSlot({
  label,
  url,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string
  url: string
  uploading: boolean
  onUpload: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-white/40 font-medium">{label}</span>
      {url ? (
        <div className="relative aspect-video rounded-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
          />
          <button
            className="
              absolute -top-1.5 -right-1.5
              w-5 h-5 rounded-full border-none
              bg-red-500 text-white
              flex items-center justify-center
              cursor-pointer z-[2]
            "
            onClick={onRemove}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          className="
            aspect-video rounded-[10px]
            border-[1.5px] border-dashed border-white/[0.12]
            bg-white/[0.03] text-white/30
            flex flex-col items-center justify-center gap-1 text-[10px]
            cursor-pointer transition-all
            active:bg-white/[0.07] active:border-white/[0.22]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          onClick={onUpload}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span>{uploading ? '...' : 'Загрузить'}</span>
        </button>
      )}
    </div>
  )
}

function Field({
  label,
  priceHint,
  children,
}: {
  label: React.ReactNode
  priceHint?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
        {label}
        {priceHint && (
          <span className="text-[10px] text-[var(--accent-yellow)]/70 normal-case font-medium ml-1">
            влияет на цену
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Grid({
  cols,
  children,
}: {
  cols: number
  children: React.ReactNode
}) {
  const colsClass =
    cols === 1 ? 'grid-cols-1' :
    cols === 2 ? 'grid-cols-2' :
    cols === 3 ? 'grid-cols-3' :
    cols === 4 ? 'grid-cols-4' :
    'grid-cols-3'

  return <div className={`grid gap-1.5 ${colsClass}`}>{children}</div>
}

function OptBtn({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={`
        py-2 px-2.5 rounded-[var(--radius-xs)]
        border text-[12px] font-medium
        cursor-pointer transition-all duration-150
        active:scale-[0.96]
        ${active
          ? 'bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
          : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
        }
      `}
      onClick={onClick}
    >
      {children}
    </button>
  )
}