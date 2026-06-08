'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown, Send, Check, X, Video, Settings, Wand2,
  Clock, Maximize2, Zap, Loader2, Upload, Image as ImageIcon,
  Sparkles, Layers, Volume2, ShieldOff,
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

/* ─── UI labels ─── */

const AR_L: Record<string, string> = {
  landscape: '🖥 Пейзаж', portrait: '📱 Портрет',
  '16:9': '16:9', '9:16': '9:16', '1:1': '1:1',
  '4:3': '4:3', '3:4': '3:4', '21:9': '21:9',
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
  // Veo: разрешение влияет на цену (720p=15/75, 4k=45.3/112). API duration 4/6/8 (на цену не влияет).
  'veo-3.1-fast': {
    aspectRatios: ['16:9', '9:16'], durations: [], qualities: ['720p', '1080p', '4k'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  'veo-3.1-pro': {
    aspectRatios: ['16:9', '9:16'], durations: [], qualities: ['720p', '1080p', '4k'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false,
  },
  // Sora 2 Pro: quality влияет на цену (720p=86, 1080p=143). duration 4/8/12 не влияет.
  'sora-2-pro': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 8, 12], qualities: ['720p', '1080p'],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  // Kling 2.5 turbo (kie): duration '5'/'10' влияет на цену. aspect_ratio 16:9/9:16/1:1.
  'kling-2.5-turbo-pro': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10], qualities: [],
    resolutions: [], modes: [], supportsImageInput: false, maxInputImages: 0,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  'kling-2.5-turbo-pro-img2video': {
    aspectRatios: [], durations: [5, 10], qualities: [],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false,
  },
  // WAN 2.5 (kie): resolution 720p/1080p + duration '5'/'10' влияют на цену.
  'wan-2.5': {
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

/* ─── Какие slug используют evolink (Veo/Sora) — для них разрешение
       нужно дублировать в resolution (см. buildVideoBody маппит resolution→quality) ─── */
const EVOLINK_VIDEO_SLUGS = new Set(['veo-3.1-fast', 'veo-3.1-pro', 'sora-2-pro'])

/* ─── Helpers ─── */

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
    return videoModels[0]?.slug ?? 'veo-3.1-fast'
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
  const [imgUrl, setImgUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const [syncedSlug, setSyncedSlug] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)
  const initialAppliedRef = useRef(false)

  const model = videoModels.find((m: any) => m.slug === slug)
  const modelMinCost = model?.cost || 15

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
      // 🆕 поддержка sound И generateAudio (Veo)
      supportsSound:
        hasParam(uiConfig, 'sound') ||
        hasParam(uiConfig, 'generateAudio') ||
        fb.supportsSound,
      supportsRemoveWatermark:
        hasParam(uiConfig, 'removeWatermark') || fb.supportsRemoveWatermark,
    }
  }, [uiConfig, slug])

  const isI2V = caps.supportsImageInput && caps.maxInputImages > 0
  const requiresInputImage = slug.includes('img2vid') || slug.includes('img2video') || slug === 'kling-3.0-motion'

  /* ── Price calculator ── */

  const priceParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (caps.modes.length > 0 && mode) p.mode = mode
    if (caps.durations.length > 0 && duration !== undefined) p.duration = duration
    if (caps.aspectRatios.length > 0 && aspectRatio) p.aspectRatio = aspectRatio
    if (caps.qualities.length > 0 && quality) p.quality = quality
    if (caps.resolutions.length > 0 && resolution) p.resolution = resolution
    if (caps.supportsSound) p.sound = sound
    if (caps.supportsRemoveWatermark) p.removeWatermark = removeWatermark
    if (imgUrl) p.hasInputImage = true
    return p
  }, [mode, duration, aspectRatio, quality, resolution, sound, removeWatermark, imgUrl, caps])

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

  /* ── Sync initial model ── */

    useEffect(() => {
    if (initialAppliedRef.current) return
    if (videoModels.length === 0) return // ждём загрузки моделей

    // 1) Если задана начальная модель — ищем точное совпадение
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
      // ещё не нашли — ждём догрузки
      return
    }

    // 2) initialModel нет — фиксируем первую реальную модель из каталога,
    //    если текущий slug отсутствует в списке (был хардкод-fallback)
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

    setSyncedSlug(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiConfig, slug])

  /* ── Misc ── */

  const vidGens = useMemo(
    () => generations.filter((g: any) => g.type === 'video'),
    [generations],
  )

  // textarea autosize
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
  }, [input])

  // autoscroll
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
        setImgUrl(url)
        haptic('light')
        toast.success('Изображение загружено')
      } catch (e: any) {
        toast.error(e.message || 'Ошибка загрузки')
      } finally {
        setUploading(false)
      }
    },
    [haptic],
  )

  /* ── Generate ── */

  const doGen = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return
    if (requiresInputImage && !imgUrl) {
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

    // ── duration: kie-модели (kling/wan) ждут строку, evolink (veo/sora) — число ──
    if (caps.durations.length && duration !== undefined) {
      const isKie = slug.startsWith('kling') || slug.startsWith('wan')
      s.duration = isKie ? String(duration) : duration
    }

        if (caps.aspectRatios.length && aspectRatio) s.aspectRatio = aspectRatio

    // ── Разрешение/качество ──
    // Veo/Sora (evolink): buildVideoBody маппит request.resolution → body.quality.
    //   Поэтому для evolink дублируем выбранное значение И в quality, И в resolution —
    //   что бы ни читал бэк, значение дойдёт.
    // Kie-модели (wan): используют resolution напрямую.
    if (caps.qualities.length && quality) {
      s.quality = quality
      if (EVOLINK_VIDEO_SLUGS.has(slug)) {
        s.resolution = quality // дублируем для evolink buildVideoBody
      }
    }
    if (caps.resolutions.length && resolution) {
      s.resolution = resolution
    }

    if (caps.modes.length && mode) s.mode = mode

    // ── Звук: Veo ждёт generateAudio, остальные — sound ──
    if (caps.supportsSound) {
      s.sound = sound
      if (slug.startsWith('veo')) {
        s.generateAudio = sound
      }
    }

    if (caps.supportsRemoveWatermark) s.removeWatermark = removeWatermark
    if (caps.supportsImageInput && imgUrl) s.imageUrl = imgUrl

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
            <Video size={14} className="text-[var(--gray-500)] shrink-0" />
            <span className="truncate">{model?.name ?? slug}</span>

            <span
              className={`
                text-[11px] ml-auto shrink-0 inline-flex items-center gap-1
                transition-opacity duration-200
                ${!isFallbackPrice ? 'text-[var(--accent-yellow)]' : 'text-white/40'}
                ${isCalculating && lastPriceRef.current ? 'opacity-60' : 'opacity-100'}
              `}
            >
              {showPriceLoader && <Loader2 size={10} className="animate-spin" />}
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

        {/* Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
          {caps.modes.length > 0 && mode && (
            <button
              className="
                shrink-0 py-1 px-2.5
                rounded-[var(--radius-xs)]
                border border-[rgba(250,204,21,0.25)]
                bg-[rgba(250,204,21,0.08)]
                text-[var(--accent-yellow)] text-[11px] font-medium
                cursor-pointer transition-all duration-150
                active:scale-[0.95]
                inline-flex items-center gap-1
              "
              onClick={() => { setShowSettings(true); haptic('light') }}
            >
              <Sparkles size={10} />
              {MODE_L[mode] || mode}
            </button>
          )}

          {caps.durations.length > 0 && duration !== undefined && (
            <Chip onClick={() => { setShowSettings(true); haptic('light') }}>
              {duration} сек
            </Chip>
          )}

          {caps.aspectRatios.length > 0 && aspectRatio && (
            <Chip onClick={() => { setShowSettings(true); haptic('light') }}>
              {AR_L[aspectRatio] || aspectRatio}
            </Chip>
          )}

          {caps.qualities.length > 0 && quality && (
            <Chip onClick={() => { setShowSettings(true); haptic('light') }}>
              {Q_L[quality] || quality}
            </Chip>
          )}

          {caps.resolutions.length > 0 && resolution && (
            <Chip onClick={() => { setShowSettings(true); haptic('light') }}>
              {resolution}
            </Chip>
          )}

          {caps.supportsSound && (
            <Chip
              active={sound}
              onClick={() => { setShowSettings(true); haptic('light') }}
            >
              {sound ? '🔊 Звук' : '🔇 Без звука'}
            </Chip>
          )}

          {isI2V && (
            <Chip
              active={!!imgUrl}
              onClick={() => { setShowSettings(true); haptic('light') }}
            >
              {imgUrl ? '📸 Фото' : 'img2vid'}
            </Chip>
          )}

          {matchedLabel && !isFallbackPrice && (
            <span
              className="
                shrink-0 py-1 px-2.5
                rounded-[var(--radius-xs)]
                bg-[rgba(250,204,21,0.06)]
                text-[var(--accent-yellow)]/70 text-[10px] font-medium
                ml-auto
              "
            >
              {matchedLabel}
            </span>
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
                    {m.slug.includes('img') || m.slug.includes('motion') ? ' · img2vid' : ' · txt2vid'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-white/40">
                    {formatCost(m.cost)} 🔥
                  </span>
                  {slug === m.slug && <Check size={14} className="text-[var(--accent-yellow)]" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
                Опишите сцену. Видео может генерироваться до 5 минут.
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

          {vidGens.map((gen: any) => (
            <div key={gen.id} className="animate-[fadeIn_0.3s_ease-out]">
              <div className="text-[13px] text-white/45 mb-2 leading-[1.4] break-words">
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
            </div>
          ))}

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
                <div className="text-[15px] font-semibold text-white">Настройки</div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--gray-500)]">Цена:</span>
                  <span
                    className={`
                      font-semibold inline-flex items-center gap-1
                      ${!isFallbackPrice ? 'text-[var(--accent-yellow)]' : 'text-white/50'}
                    `}
                  >
                    {showPriceLoader && <Loader2 size={10} className="animate-spin" />}
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
                  <Grid cols={caps.durations.length <= 3 ? caps.durations.length : 3}>
                    {caps.durations.map((d) => (
                      <OptBtn key={d} active={duration === d} onClick={() => { setDuration(d); haptic('light') }}>
                        {d} сек
                      </OptBtn>
                    ))}
                  </Grid>
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
              {slug === 'sora-2-pro' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-[12px] text-white/60 leading-relaxed">
                  ⚠️ Sora 2 Pro имеет строгую модерацию. Реальные люди на изображениях не поддерживаются.
                </div>
              )}

              {/* Image input */}
              {caps.supportsImageInput && (
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
                        onClick={() => fileRef.current?.click()}
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
        {imgUrl && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
            <div
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
              <img src={imgUrl} alt="" className="w-5 h-5 rounded-[3px] object-cover block" />
              <span>Изображение</span>
              <button
                className="
                  w-4 h-4 rounded-[4px] border-none
                  bg-white/[0.06] text-[var(--gray-500)]
                  flex items-center justify-center
                  cursor-pointer ml-0.5
                  active:bg-[rgba(239,68,68,0.2)] active:text-[var(--accent-red)]
                "
                onClick={() => { setImgUrl(''); haptic('light') }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {caps.supportsImageInput && (
            <button
              className={`
                w-[38px] h-[38px] rounded-[10px] border-none
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0 self-center
                ${imgUrl
                  ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                  : 'bg-white/[0.04] text-[var(--gray-500)]'
                }
                active:scale-[0.92]
                disabled:opacity-50 disabled:cursor-default
              `}
              onClick={() => fileRef.current?.click()}
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
              requiresInputImage
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
            disabled={
              !input.trim() ||
              generating ||
              (requiresInputImage && !imgUrl)
            }
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

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={`
        shrink-0 py-1 px-2.5
        rounded-[var(--radius-xs)]
        border text-[11px] font-medium
        cursor-pointer transition-all duration-150
        active:scale-[0.95]
        ${active
          ? 'bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
          : 'bg-[var(--bg-glass)] border-[var(--border-glass)] text-[var(--gray-400)]'
        }
      `}
      onClick={onClick}
    >
      {children}
    </button>
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