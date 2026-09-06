'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  Send,
  Check,
  X,
  Video,
  Settings,
  Wand2,
  Clock,
  Maximize2,
  Loader2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  ShieldOff,
  Film,
  Images,
  Type,
  Rocket,
  Gauge,
  Crown,
  Scissors,
  Plus,
  Trash2,
  Tag,
  FileText,
  Gift,
  Paperclip,
  Flame,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { useSavedSettings, validators } from '@/hooks/useSavedSettings'
import { useModelUIConfig, type ModelUIConfig } from '@/hooks/useModelUIConfig'
import { usePriceCalculator } from '@/hooks/usePriceCalculator'
import { MediaResult } from '@/components/ui/MediaResult'
import { MediaPicker } from '@/components/ui/MediaPicker'
import { toast } from '@/stores/toast.store'
import { useAuthStore } from '@/stores'
import { formatFreeBadge, formatFreeLabel, getFreeAccessInfo } from '@/lib/api/freeAccess'

/* ─── Props ─── */

interface Props {
  initialModel?: string
  onBack?: () => void
}

/* ─── Veo modes ─── */

type VeoMode = 'text' | 'frames' | 'reference'

/**
 * 🆕 Цели загрузки, куда можно класть несколько фото за раз.
 * single / start / end / seedance-first / seedance-last принимают ровно
 * одну картинку — там мультивыбор в системном диалоге только путал бы.
 */
const MULTI_UPLOAD_TARGETS = ['ref', 'element', 'seedance', 'sora']

const VEO_MODE_TO_GENERATION_TYPE: Record<VeoMode, string> = {
  text: 'TEXT_2_VIDEO',
  frames: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
  reference: 'REFERENCE_2_VIDEO',
}

const VEO_REFERENCE_SUPPORT: Record<string, boolean> = {
  veo3_lite: true,
  veo3_fast: true,
  veo3: false,
}

function veoSupportsReference(slug: string): boolean {
  return VEO_REFERENCE_SUPPORT[slug] ?? true
}

/* ─── UI labels ─── */

type AROrient = 'landscape' | 'portrait' | 'square' | 'wide'

const AR_META: Record<string, { label: string; orient: AROrient }> = {
  landscape: { label: 'Пейзаж', orient: 'landscape' },
  portrait: { label: 'Портрет', orient: 'portrait' },
  '16:9': { label: '16:9', orient: 'landscape' },
  '9:16': { label: '9:16', orient: 'portrait' },
  '1:1': { label: '1:1', orient: 'square' },
  '4:3': { label: '4:3', orient: 'landscape' },
  '3:4': { label: '3:4', orient: 'portrait' },
  '21:9': { label: '21:9', orient: 'wide' },
  '3:2': { label: '3:2', orient: 'landscape' },
  '2:3': { label: '2:3', orient: 'portrait' },
  Auto: { label: 'Авто', orient: 'square' },
}

const RES_META: Record<string, { label: string; sub?: string; tier: number }> = {
  '480p': { label: '480p', sub: 'SD', tier: 0 },
  '720p': { label: '720p', sub: 'HD', tier: 1 },
  '1080p': { label: '1080p', sub: 'Full HD', tier: 2 },
  '1080P': { label: '1080p', sub: 'Full HD', tier: 2 },
  '768P': { label: '768p', sub: 'SD', tier: 1 },
  '4k': { label: '4K', sub: 'Ultra HD', tier: 3 },
  '4К': { label: '4K', sub: 'Ultra HD', tier: 3 },
  '1': { label: '1x', sub: 'Улучшение', tier: 1 },
  '2': { label: '2x', sub: 'Увеличение', tier: 2 },
  '4': { label: '4x', sub: 'Увеличение', tier: 3 },
}

const MODE_META: Record<string, { label: string; icon: typeof Rocket }> = {
  std: { label: 'Standard', icon: Gauge },
  standard: { label: 'Standard', icon: Gauge },
  pro: { label: 'Pro', icon: Crown },
  fast: { label: 'Быстрый', icon: Rocket },
  turbo: { label: 'Турбо', icon: Rocket },
  relax: { label: 'Relax', icon: Gauge },
}

const VEO_MODE_META: Record<VeoMode, { label: string; icon: typeof Type }> = {
  text: { label: 'Текст', icon: Type },
  frames: { label: 'Кадры', icon: Film },
  reference: { label: 'Референс', icon: Images },
}

const EXAMPLES = [
  'Кинематографичный пролёт над горами на рассвете, облака ниже камеры',
  'Кот в очках сидит за компьютером и пишет код, уютная комната',
  'Таймлапс звёздного неба над пустыней, Млечный путь',
  'Медленное вращение вокруг чашки кофе с паром, макросъёмка',
  'Футуристический город с летающими машинами, ночь, неон',
]

/* ─── Fallback caps ─── */

interface FallbackCaps {
  aspectRatios: string[]
  durations: number[]
  resolutions: string[]
  modes: string[]
  supportsImageInput: boolean
  maxInputImages: number
  supportsSound: boolean
  supportsRemoveWatermark: boolean
  supportsResizeMode: boolean
}

const FALLBACK: Record<string, FallbackCaps> = {
  veo3_lite: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'], modes: [], supportsImageInput: true, maxInputImages: 3,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  veo3_fast: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'], modes: [], supportsImageInput: true, maxInputImages: 3,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  veo3: {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'sora-2': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 8, 12],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: true,
  },
  'sora-2-pro': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 8, 12],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: true,
  },
  'kling-2.5-turbo': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'kling-3.0': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10, 15],
    resolutions: [], modes: ['std', 'pro'], supportsImageInput: true, maxInputImages: 1,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  runway: {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durations: [5, 10],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'hailuo-02': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [6, 10],
    resolutions: [], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'hailuo-2.3-standard': {
    aspectRatios: [], durations: [6, 10],
    resolutions: ['768P', '1080P'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'hailuo-2.3-pro': {
    aspectRatios: [], durations: [6, 10],
    resolutions: ['768P', '1080P'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'wan-2.7': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durations: [5, 10],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'wan-2.5': {
    aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10],
    resolutions: ['720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'seedance-1.5-pro': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], durations: [4, 8, 12],
    resolutions: ['480p', '720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 2,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'seedance-2': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    resolutions: ['480p', '720p', '1080p', '4k'], modes: [], supportsImageInput: true, maxInputImages: 10,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'seedance-2-fast': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    resolutions: ['480p', '720p'], modes: [], supportsImageInput: true, maxInputImages: 10,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'seedance-2-5': {
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'],
    durations: Array.from({ length: 30 }, (_, i) => i + 1),
    resolutions: ['480p', '720p', '1080p'], modes: [], supportsImageInput: true, maxInputImages: 4,
    supportsSound: true, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'topaz-video-upscale': {
    aspectRatios: [], durations: [], resolutions: ['1', '2', '4'],
    modes: [], supportsImageInput: false, maxInputImages: 0,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
  'gemini-omni-video': {
    aspectRatios: ['16:9', '9:16'], durations: [4, 6, 8, 10],
    resolutions: ['720p', '1080p', '4k'], modes: [], supportsImageInput: true, maxInputImages: 1,
    supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
  },
}

const DEFAULT_FALLBACK: FallbackCaps = {
  aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10],
  resolutions: [], modes: [],
  supportsImageInput: false, maxInputImages: 0,
  supportsSound: false, supportsRemoveWatermark: false, supportsResizeMode: false,
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

/* ─── Совместимость опций (из pricingMatrix) ─── */

const COMBO_KEYS = ['duration', 'resolution', 'mode', 'tier', 'aspectRatio'] as const

function getMatrixKeys(config: ModelUIConfig | null): string[] {
  if (!config?.pricingMatrix?.length) return []
  const keys = new Set<string>()
  for (const rule of config.pricingMatrix) {
    const cond = rule.conditions || {}
    for (const k of Object.keys(cond)) keys.add(k)
  }
  return [...keys]
}

function isComboAllowed(
  config: ModelUIConfig | null,
  candidateKey: string,
  candidateVal: string | number,
  current: Record<string, string | number | undefined>,
): boolean {
  if (!config?.pricingMatrix?.length) return true

  const matrixKeys = getMatrixKeys(config)
  if (!matrixKeys.includes(candidateKey)) return true

  const target: Record<string, string | number> = { [candidateKey]: candidateVal }
  for (const k of COMBO_KEYS) {
    if (k === candidateKey) continue
    if (!matrixKeys.includes(k)) continue
    const v = current[k]
    if (v !== undefined && v !== '') target[k] = v
  }

  return config.pricingMatrix.some((rule) => {
    const cond = rule.conditions || {}
    for (const [k, want] of Object.entries(target)) {
      if (cond[k] === undefined) continue
      if (String(cond[k]) !== String(want)) return false
    }
    return true
  })
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

  const { getValidParams, getLastModel, rememberModel, saveParams } =
    useSavedSettings('video')

  const resolveInitialSlug = useCallback((): string => {
    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const byExact = videoModels.find(
        (m: any) => m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
      )
      if (byExact) return byExact.slug
    }
    const last = getLastModel(videoModels.map((m: any) => m.slug))
    if (last) return last
    return videoModels[0]?.slug ?? 'veo3_fast'
  }, [initialModel, videoModels, getLastModel])

  const [slug, setSlug] = useState<string>(() => resolveInitialSlug())
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [generating, setGenerating] = useState(false)

  // params
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution, setResolution] = useState('')
  const [mode, setMode] = useState<string | undefined>(undefined)
  const [sound, setSound] = useState(false)
  const [removeWatermark, setRemoveWatermark] = useState(true)
  const [resizeMode, setResizeMode] = useState<'crop' | 'pad'>('crop')

  const [imgUrl, setImgUrl] = useState('')

  // Veo
  const [veoMode, setVeoMode] = useState<VeoMode>('text')
  const [startFrame, setStartFrame] = useState('')
  const [endFrame, setEndFrame] = useState('')
  const [refImages, setRefImages] = useState<string[]>([])

  // Kling 2.5 Turbo
  const [cfgScale, setCfgScale] = useState(0.5)
  const [nsfwChecker, setNsfwChecker] = useState(true)

  // Kling 3.0
  const [multiShots, setMultiShots] = useState(false)
  const [shots, setShots] = useState<{ prompt: string; duration: number }[]>([
    { prompt: '', duration: 5 },
  ])
  const [elements, setElements] = useState<
    { name: string; description: string; urls: string[] }[]
  >([])
  const elementUploadIdxRef = useRef<number>(0)

  // Motion Control
  const [motionVideoUrl, setMotionVideoUrl] = useState('')
  const [motionVideoDuration, setMotionVideoDuration] = useState<number | null>(null)
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const videoFileRef = useRef<HTMLInputElement>(null)

  // Seedance
  const [fixedLens, setFixedLens] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [refVideos, setRefVideos] = useState<string[]>([])
  // 🆕 длительности (сек) загруженных видео-референсов — параллельно refVideos.
  // Индексы соответствуют друг другу. Нужны для посекундной цены Seedance 2.
  const [refVideoDurations, setRefVideoDurations] = useState<number[]>([])
  const [refAudios, setRefAudios] = useState<string[]>([])
  const [uploadingRefVideo, setUploadingRefVideo] = useState(false)
  const [uploadingRefAudio, setUploadingRefAudio] = useState(false)
  const refVideoFileRef = useRef<HTMLInputElement>(null)
  const refAudioFileRef = useRef<HTMLInputElement>(null)

  // 🆕 Множественные референс-фото для Seedance (1.5: до 2, 2/2-fast: до 10)
  const [seedanceImages, setSeedanceImages] = useState<string[]>([])

  // 🆕 Seedance 2.5 — first/last кадр (отдельно от галереи референсов)
  const [seedanceFirstFrame, setSeedanceFirstFrame] = useState('')
  const [seedanceLastFrame, setSeedanceLastFrame] = useState('')
  const [seedanceReturnLastFrame, setSeedanceReturnLastFrame] = useState(false)
  const [seedanceOutputFormat, setSeedanceOutputFormat] = useState<'mp4' | 'mov'>('mp4')

  // 🆕 Множественные референс-фото для Sora 2 / Sora 2 Pro (до 10)
  const [soraImages, setSoraImages] = useState<string[]>([])

  const [uploading, setUploading] = useState(false)
  // 🆕 добавлены target 'seedance' и 'sora'
  const uploadTarget = useRef<'single' | 'start' | 'end' | 'ref' | 'element' | 'seedance' | 'sora' | 'seedance-first' | 'seedance-last'>('single')

  const [syncedSlug, setSyncedSlug] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const initialAppliedRef = useRef(false)

  const model = videoModels.find((m: any) => m.slug === slug)
  const modelMinCost = model?.cost || 15

  const isVeo = isVeoSlug(slug)
  const supportsReference = isVeo && veoSupportsReference(slug)

  const isKling3 = slug === 'kling-3.0'
  const isKling25 = slug === 'kling-2.5-turbo'
  const isKling = isKling3
  const isMotion = slug === 'motion-control'
  const isTopaz = slug === 'topaz-video-upscale'
  // 🆕 Gemini Omni: принимает видео-референс (1 шт) — цена тогда фиксированная
  const isOmni = slug === 'gemini-omni-video'
  // Seedance 2/2-fast/2.5 принимают до 3 видео, Omni — ровно одно
  const maxRefVideos = isOmni ? 1 : 3
  const isSeedance15 = slug === 'seedance-1.5-pro'
  const isSeedance2 = slug === 'seedance-2' || slug === 'seedance-2-fast' || slug === 'seedance-2-5'
  const isSeedance25 = slug === 'seedance-2-5'   // 🆕 только для first/last frame UI
  const isSeedance = isSeedance15 || isSeedance2

  // 🆕 Sora 2 / Sora 2 Pro — поддерживают до 10 референс-изображений
  const isSora = slug === 'sora-2' || slug === 'sora-2-pro'

  // Topaz Video Upscale — исходное видео на апскейл
  const [topazVideoUrl, setTopazVideoUrl] = useState('')
  const [topazVideoDuration, setTopazVideoDuration] = useState<number | null>(null)
  const [uploadingTopazVideo, setUploadingTopazVideo] = useState(false)
  const topazVideoFileRef = useRef<HTMLInputElement>(null)

  /* ── UI config ── */

  const { config: uiConfig, isLoading: isLoadingConfig } = useModelUIConfig(slug)

  /* ── Caps ── */

  const caps = useMemo(() => {
    const fb = FALLBACK[slug] || DEFAULT_FALLBACK

    if (!uiConfig) {
      return {
        aspectRatios: fb.aspectRatios,
        durations: fb.durations,
        resolutions: fb.resolutions,
        modes: fb.modes,
        supportsImageInput: fb.supportsImageInput,
        maxInputImages: fb.maxInputImages,
        supportsSound: fb.supportsSound,
        supportsRemoveWatermark: fb.supportsRemoveWatermark,
        supportsResizeMode: fb.supportsResizeMode,
      }
    }

    const arBackend = getParamOptions(uiConfig, 'aspectRatio')
    const durBackend = getNumericOptions(uiConfig, 'duration')
    const rBackend = getParamOptions(uiConfig, 'resolution')
    const modeBackend = getParamOptions(uiConfig, 'mode')
    const inputCap = uiConfig.inputCapabilities || {}

    return {
      aspectRatios: arBackend.length ? arBackend : fb.aspectRatios,
      durations: durBackend.length ? durBackend : fb.durations,
      resolutions: rBackend.length ? rBackend : fb.resolutions,
      modes: modeBackend.length ? modeBackend : fb.modes,
      supportsImageInput: inputCap.acceptsImages === true || fb.supportsImageInput,
      maxInputImages: inputCap.maxInputImages ?? fb.maxInputImages,
      supportsSound: isVeoSlug(slug)
        ? false
        : (hasParam(uiConfig, 'sound') ||
          hasParam(uiConfig, 'generateAudio') ||
          fb.supportsSound),
      supportsRemoveWatermark:
        hasParam(uiConfig, 'removeWatermark') || fb.supportsRemoveWatermark,
      supportsResizeMode: hasParam(uiConfig, 'resizeMode'),
    }
  }, [uiConfig, slug])

  const veoMaxRefImages = (() => {
    const fbMax = FALLBACK[slug]?.maxInputImages
    return fbMax && fbMax > 1 ? fbMax : (caps.maxInputImages > 1 ? caps.maxInputImages : 3)
  })()

  // 🆕 Максимум фото для Seedance из caps (с защитным fallback)
  const seedanceMaxImages = isSeedance15
    ? 2
    : (caps.maxInputImages > 1 ? caps.maxInputImages : 10)

  // 🆕 Максимум фото для Sora из caps (с защитным fallback)
  const soraMaxImages = caps.maxInputImages > 0 ? caps.maxInputImages : 10

  const isI2V = !isVeo && caps.supportsImageInput && caps.maxInputImages > 0
  const requiresInputImage =
    !isVeo &&
    (slug.includes('img2vid') || slug.includes('img2video') || slug === 'kling-3.0-motion')

  const veoForcesDuration8 = isVeo && veoMode === 'reference'

  const comboCurrent = useMemo(
    () => ({
      duration: veoForcesDuration8 ? 8 : duration,
      resolution,
      mode,
      aspectRatio,
    }),
    [duration, resolution, mode, aspectRatio, veoForcesDuration8],
  )

  const isDurationDisabled = useCallback(
    (d: number) => !isComboAllowed(uiConfig, 'duration', d, comboCurrent),
    [uiConfig, comboCurrent],
  )
  const isResolutionDisabled = useCallback(
    (r: string) => !isComboAllowed(uiConfig, 'resolution', r, comboCurrent),
    [uiConfig, comboCurrent],
  )

  const motionMaxDur = characterOrientation === 'image' ? 10 : 30
  const motionEffectiveDuration = isMotion
    ? Math.min(motionMaxDur, Math.max(3, motionVideoDuration ? Math.round(motionVideoDuration) : 5))
    : undefined

  // 🆕 Суммарная длительность мультисцен Kling 3.0 (для корректной цены).
  // ВАЖНО: каждый шот на бэке/KIE клампится в 1–12 сек (Math.min(12,Math.max(1,...))),
  // поэтому суммируем уже заклампленные значения, затем общий clamp 3–15 (pricingMatrix).
  const klingMultiDuration = useMemo(() => {
    if (!isKling || !multiShots) return undefined
    const total = shots
      .filter((sh) => sh.prompt.trim())
      .reduce((sum, sh) => {
        const d = Math.min(12, Math.max(1, sh.duration || 3))
        return sum + d
      }, 0)
    if (total <= 0) return undefined
    return Math.min(15, Math.max(3, total))
  }, [isKling, multiShots, shots])


  // 🆕 Суммарная длительность видео-референсов для цены Seedance 2.
  // Каждое видео округляем вверх (ceil), сумму клампим в [0, 15].
  const refVideoSeconds = useMemo(() => {
    if (!isSeedance2 || refVideoDurations.length === 0) return 0
    const sum = refVideoDurations.reduce(
      (acc, d) => acc + Math.ceil(Math.max(0, d || 0)),
      0,
    )
    return Math.min(15, sum)
  }, [isSeedance2, refVideoDurations])

  // 🆕 Topaz: длительность исходного видео в секундах для цены и запроса.
  // Бэк валидирует duration в диапазоне 1..600, поэтому клампим здесь же —
  // это ровно те 10 минут, о которых предупреждает тост при загрузке.
  const topazDurationSec = useMemo(() => {
    if (!isTopaz || !topazVideoDuration) return 0
    return Math.min(600, Math.max(1, Math.ceil(topazVideoDuration)))
  }, [isTopaz, topazVideoDuration])

  // 🆕 Сырая сумма шотов (до clamp) — для подсказки если превышен максимум
  const rawShotsSum = useMemo(() => {
    if (!isKling || !multiShots) return 0
    return shots
      .filter((sh) => sh.prompt.trim())
      .reduce((sum, sh) => sum + Math.min(12, Math.max(1, sh.duration || 3)), 0)
  }, [isKling, multiShots, shots])

  useEffect(() => {
    if (isVeo && veoMode === 'reference' && !supportsReference) {
      setVeoMode('text')
    }
  }, [isVeo, veoMode, supportsReference])

  /* ── Price calculator ── */

  const priceParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (caps.modes.length > 0 && mode) p.mode = mode
    if (isMotion) {
      p.mode = mode || '720p'
      if (motionEffectiveDuration) p.duration = motionEffectiveDuration
      p.hasInputImage = true
    } else if (isKling && multiShots) {
      // 🆕 Мультисцены: цена по суммарной длительности шотов
      if (klingMultiDuration !== undefined) p.duration = klingMultiDuration
      p.sound = true // KIE форсит sound=true в мультисценах
    } else if (caps.durations.length > 0 && duration !== undefined) {
      p.duration = veoForcesDuration8 ? 8 : duration
    }
    if (caps.aspectRatios.length > 0 && aspectRatio && !isMotion) p.aspectRatio = aspectRatio
    if (caps.resolutions.length > 0 && resolution) p.resolution = resolution
    if (caps.supportsSound) p.sound = sound
    if (caps.supportsRemoveWatermark) p.removeWatermark = removeWatermark

    if (isVeo) {
      const hasImg =
        (veoMode === 'frames' && !!startFrame) ||
        (veoMode === 'reference' && refImages.length > 0)
      if (hasImg) p.hasInputImage = true
    } else if (isSeedance && (seedanceImages.length > 0 || imgUrl)) {
      // 🆕 для Seedance учитываем и галерею, и legacy imgUrl
      p.hasInputImage = true
    } else if (isSora && (soraImages.length > 0 || imgUrl)) {
      // 🆕 для Sora учитываем галерею
      p.hasInputImage = true
    } else if (imgUrl) {
      p.hasInputImage = true
    }

    if (isSeedance2) {
      p.videoRef = refVideos.length > 0
      // 🆕 суммарные секунды видео-референсов (для посекундной цены)
      if (refVideos.length > 0) p.refVideoSeconds = refVideoSeconds
    }

    // 🆕 Omni: с видео-референсом цена фиксированная за генерацию
    // (не зависит от длительности), поэтому refVideoSeconds не шлём.
    if (isOmni) {
      p.videoRef = refVideos.length > 0
    }

    if (isTopaz) {
      // 🔧 бэк принимает duration только 1..600 — длинное видео режем,
      //    иначе POST падает с 400 (валидация DTO)
      if (topazVideoDuration) p.duration = topazDurationSec
      p.videoRef = true // включает формулу rate×duration на бэке
      // p.resolution уже проставлен генерическим блоком выше (caps.resolutions)
    }

    return p
  }, [
    mode, duration, aspectRatio, resolution, sound, removeWatermark,
    imgUrl, caps, isVeo, veoMode, startFrame, refImages, veoForcesDuration8,
    isSeedance2, refVideos, refVideoSeconds, seedanceImages, isSeedance, isMotion, motionEffectiveDuration, isSora, soraImages, isOmni, // 🆕
    isKling, multiShots, klingMultiDuration, // 🆕
    isTopaz, topazVideoDuration, topazDurationSec
  ])

  const { price, isCalculating } = usePriceCalculator(slug, priceParams, {
    enabled: !!uiConfig && syncedSlug === slug,
    debounceMs: 300,
  })

  const freeAccessParams = useMemo(
    () => ({
      mode,
      resolution,
      aspectRatio,
      duration,
    }),
    [mode, resolution, aspectRatio, duration],
  )

  const freeAccess = useMemo(
    () => getFreeAccessInfo(model || {}, freeAccessParams),
    [model, freeAccessParams],
  )
  const isFreeForUser = freeAccess.isFree

  /* ── Cached price ── */

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

    const slugs = videoModels.map((m: any) => m.slug)
    if (!slugs.includes(slug)) {
      const next = getLastModel(slugs) || videoModels[0]?.slug
      if (next) {
        setSyncedSlug(null)
        setSlug(next)
      }
    }
    initialAppliedRef.current = true
  }, [initialModel, videoModels, slug, getLastModel])

  /* ── Batch reset when caps changed ── */

  useEffect(() => {
    const defAr = getDefault(uiConfig, 'aspectRatio') ?? caps.aspectRatios[0] ?? '16:9'
    const defDurStr = getDefault(uiConfig, 'duration')
    const defDur = defDurStr ? Number(defDurStr) : caps.durations[0]
    const defR = getDefault(uiConfig, 'resolution') ?? caps.resolutions[0] ?? ''
    const defMode = getDefault(uiConfig, 'mode') ?? caps.modes[0]

    // 🆕 Последние настройки этой модели поверх дефолтов.
    // Разрешение/длительность/формат/режим проверяются по актуальным
    // caps: бэкенд мог убрать 1080p или сузить список длительностей,
    // и старое значение сломало бы расчёт цены.
    const saved = getValidParams(slug, uiConfig, {
      aspectRatio: validators.oneOf(caps.aspectRatios),
      resolution: validators.oneOf(caps.resolutions),
      duration: validators.oneOf(caps.durations),
      mode: validators.oneOf(caps.modes || []),
      sound: validators.bool,
      removeWatermark: validators.bool,
      resizeMode: validators.oneOf(['crop', 'pad']),
      fixedLens: validators.bool,
      webSearch: validators.bool,
      nsfwChecker: validators.bool,
      cfgScale: validators.range(0, 1),
      seedanceOutputFormat: validators.oneOf(['mp4', 'mov']),
      seedanceReturnLastFrame: validators.bool,
      characterOrientation: validators.oneOf(['video', 'image']),
    })

    setAspectRatio(saved.aspectRatio ?? defAr)
    setDuration(saved.duration ?? defDur)
    setResolution(saved.resolution ?? defR)
    setMode(saved.mode ?? defMode)
    setSound(saved.sound ?? false)
    setRemoveWatermark(saved.removeWatermark ?? true)
    setResizeMode(saved.resizeMode ?? 'crop')
    setImgUrl('')

    setVeoMode('text')
    setStartFrame('')
    setEndFrame('')
    setRefImages([])

    setMultiShots(false)
    setShots([{ prompt: '', duration: 5 }])
    setElements([])

    setMotionVideoUrl('')
    setMotionVideoDuration(null)
    setCharacterOrientation(saved.characterOrientation ?? 'video')

    setTopazVideoUrl('')
    setTopazVideoDuration(null)

    setCfgScale(saved.cfgScale ?? 0.5)
    setNsfwChecker(saved.nsfwChecker ?? true)

    // Seedance reset
    setFixedLens(saved.fixedLens ?? false)
    setWebSearch(saved.webSearch ?? false)
    setRefVideos([])
    setRefVideoDurations([]) // 🆕
    setRefAudios([])
    setSeedanceImages([]) // 🆕

    setSeedanceFirstFrame('')
    setSeedanceLastFrame('')
    setSeedanceReturnLastFrame(saved.seedanceReturnLastFrame ?? false)
    setSeedanceOutputFormat(saved.seedanceOutputFormat ?? 'mp4')

    // 🆕 Sora reset
    setSoraImages([])

    setSyncedSlug(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiConfig, slug])

  /* ── 🆕 Автосохранение настроек ──
   * Одним эффектом вместо вызова в каждом onClick: контролов у видео
   * больше тридцати, и точечные вызовы легко забыть.
   *
   * syncedSlug === slug обязателен: пока батч-сброс выше не отработал,
   * в стейте ещё значения ПРЕДЫДУЩЕЙ модели, и они записались бы под
   * новый slug.
   */
  useEffect(() => {
    if (syncedSlug !== slug) return

    saveParams(slug, {
      aspectRatio,
      duration,
      resolution,
      mode,
      sound,
      removeWatermark,
      resizeMode,
      cfgScale,
      nsfwChecker,
      fixedLens,
      webSearch,
      characterOrientation,
      seedanceReturnLastFrame,
      seedanceOutputFormat,
    })
  }, [
    slug, syncedSlug, saveParams,
    aspectRatio, duration, resolution, mode, sound, removeWatermark,
    resizeMode, cfgScale, nsfwChecker, fixedLens, webSearch,
    characterOrientation, seedanceReturnLastFrame, seedanceOutputFormat,
  ])

  useEffect(() => {
    if (veoForcesDuration8) setDuration(8)
  }, [veoForcesDuration8])

  useEffect(() => {
    if (!uiConfig?.pricingMatrix?.length) return
    if (isMotion || (isKling && multiShots)) return

    const curDur = veoForcesDuration8 ? 8 : duration
    if (curDur !== undefined && resolution) {
      const pairOk = isComboAllowed(uiConfig, 'duration', curDur, { resolution })
      if (!pairOk) {
        const okDur = caps.durations.find((d) =>
          isComboAllowed(uiConfig, 'duration', d, { resolution }),
        )
        if (okDur !== undefined && okDur !== duration) {
          setDuration(okDur)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution, uiConfig])

  /* ── Misc ── */

  // Стор хранит генерации новыми вперёд (addGeneration кладёт в начало).
  // В ленте нужен обратный порядок — как в диалоге: свежее внизу.
  // Разворачиваем на рендере, а не в сторе: порядок стора завязан на
  // историю и другие экраны.
  const vidGens = useMemo(
    () => generations.filter((g: any) => g.type === 'video').slice().reverse(),
    [generations],
  )

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
  }, [input])

  // Скролл ленты вниз при первом появлении генераций (заход на страницу):
  // свежие результаты теперь внизу, как последние сообщения в диалоге.
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    if (didInitialScrollRef.current) return
    if (vidGens.length === 0) return

    const id = setTimeout(() => {
      const el = resultsContainerRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
      didInitialScrollRef.current = true
    }, 100)

    return () => clearTimeout(id)
  }, [vidGens.length])

  // Догоняем низ, когда добавилась новая генерация или доехала карточка
  // с результатом (высота ленты меняется после подгрузки медиа).
  useEffect(() => {
    if (!didInitialScrollRef.current) return
    const el = resultsContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [vidGens.length])

  /* ── Upload (image) ── */

  const upload = useCallback(
    // silent — режим пакетной загрузки: тосты за весь пакет показывает
    // uploadBatch одним сообщением, иначе на 5 фото прилетело бы 5 всплывашек.
    async (file: File, silent = false): Promise<boolean> => {
      if (!file.type.match(/image\/(jpeg|png|webp)/)) {
        if (!silent) toast.error('Только JPEG, PNG, WebP')
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        if (!silent) toast.error('Макс 10MB')
        return false
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

        const target = uploadTarget.current

        // Цели с накоплением молча отбрасывают файл при достижении лимита.
        // Ловим этот факт, чтобы пакетная загрузка не отрапортовала
        // "загружено 5", когда в набор реально попали только 3.
        let added = true
        const capped = () => { added = false }

        if (target === 'single') {
          setImgUrl(url)
        } else if (target === 'start') {
          setStartFrame(url)
        } else if (target === 'end') {
          setEndFrame(url)
        } else if (target === 'ref') {
          setRefImages((prev) => {
            const fbMax = FALLBACK[slug]?.maxInputImages
            const max = fbMax && fbMax > 1 ? fbMax : (caps.maxInputImages > 1 ? caps.maxInputImages : 3)
            if (prev.length >= max) { capped(); return prev }
            return [...prev, url]
          })
        } else if (target === 'element') {
          const idx = elementUploadIdxRef.current
          setElements((prev) => {
            if (!(prev[idx] && prev[idx].urls.length < 4)) { capped(); return prev }
            return prev.map((el, i) =>
              i === idx ? { ...el, urls: [...el.urls, url] } : el,
            )
          })
        } else if (target === 'seedance-first') {
          setSeedanceFirstFrame(url)
        } else if (target === 'seedance-last') {
          setSeedanceLastFrame(url)
        } else if (target === 'seedance') {
          // 🆕 множественные фото для Seedance
          setSeedanceImages((prev) => {
            if (prev.length >= seedanceMaxImages) { capped(); return prev }
            return [...prev, url]
          })
        } else if (target === 'sora') {
          // 🆕 множественные фото для Sora
          setSoraImages((prev) => {
            if (prev.length >= soraMaxImages) { capped(); return prev }
            return [...prev, url]
          })
        }

        if (!added) {
          if (!silent) toast.warning('Достигнут лимит фото')
          return false
        }

        haptic('light')
        if (!silent) toast.success('Изображение загружено')
        return true
      } catch (e: any) {
        if (!silent) toast.error(e.message || 'Ошибка загрузки')
        return false
      } finally {
        setUploading(false)
      }
    },
    [haptic, caps.maxInputImages, slug, seedanceMaxImages, soraMaxImages], // 🆕
  )

  const uploadVideo = useCallback(
    async (file: File) => {
      if (!file.type.match(/video\/(mp4|quicktime|mov)/) && !/\.(mp4|mov)$/i.test(file.name)) {
        toast.error('Только MP4 или MOV')
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Макс 100MB')
        return
      }

      const localUrl = URL.createObjectURL(file)
      const probeDuration = await new Promise<number | null>((resolve) => {
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.onloadedmetadata = () => {
          resolve(isFinite(v.duration) ? v.duration : null)
          URL.revokeObjectURL(localUrl)
        }
        v.onerror = () => { resolve(null); URL.revokeObjectURL(localUrl) }
        v.src = localUrl
      })

      if (probeDuration !== null) {
        if (probeDuration < 3) {
          toast.error('Видео должно быть не короче 3 секунд')
          return
        }
        if (probeDuration > 30) {
          toast.warning('Видео длиннее 30с — будет использовано первые 30с')
        }
      }

      setUploadingVideo(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const token = useAuthStore.getState().token
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/video`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!r.ok) throw new Error('Upload failed')
        const d = await r.json()
        const url = d.data?.url || d.url
        if (!url) throw new Error('No URL')

        setMotionVideoUrl(url)
        setMotionVideoDuration(probeDuration)
        haptic('light')
        toast.success('Видео загружено')
      } catch (e: any) {
        toast.error(e.message || 'Ошибка загрузки видео')
      } finally {
        setUploadingVideo(false)
      }
    },
    [haptic],
  )

  const uploadTopazVideo = useCallback(
    async (file: File) => {
      if (!file.type.match(/video\/(mp4|quicktime|mov)/) && !/\.(mp4|mov)$/i.test(file.name)) {
        toast.error('Только MP4 или MOV')
        return
      }
      if (file.size > 300 * 1024 * 1024) {
        toast.error('Макс 300MB')
        return
      }

      const localUrl = URL.createObjectURL(file)
      const probeDuration = await new Promise<number | null>((resolve) => {
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.onloadedmetadata = () => {
          resolve(isFinite(v.duration) ? v.duration : null)
          URL.revokeObjectURL(localUrl)
        }
        v.onerror = () => { resolve(null); URL.revokeObjectURL(localUrl) }
        v.src = localUrl
      })

      if (probeDuration !== null && probeDuration > 600) {
        toast.warning('Видео длиннее 10 минут — будет использовано первые 10 мин')
      }

      setUploadingTopazVideo(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const token = useAuthStore.getState().token
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/video`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!r.ok) throw new Error('Upload failed')
        const d = await r.json()
        const url = d.data?.url || d.url
        if (!url) throw new Error('No URL')

        setTopazVideoUrl(url)
        setTopazVideoDuration(probeDuration)
        haptic('light')
        toast.success('Видео загружено')
      } catch (e: any) {
        toast.error(e.message || 'Ошибка загрузки видео')
      } finally {
        setUploadingTopazVideo(false)
      }
    },
    [haptic],
  )

  const uploadRefVideo = useCallback(async (file: File) => {
    if (!/\.(mp4|mov)$/i.test(file.name) && !file.type.match(/video\/(mp4|quicktime)/)) {
      toast.error('Только MP4 или MOV'); return
    }
    if (file.size > 50 * 1024 * 1024) { toast.error('Макс 50MB'); return }

    // 🆕 Измеряем длительность локально (для посекундной цены Seedance 2)
    const localUrl = URL.createObjectURL(file)
    const probeDuration = await new Promise<number | null>((resolve) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        resolve(isFinite(v.duration) ? v.duration : null)
        URL.revokeObjectURL(localUrl)
      }
      v.onerror = () => { resolve(null); URL.revokeObjectURL(localUrl) }
      v.src = localUrl
    })

    setUploadingRefVideo(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const token = useAuthStore.getState().token
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/video`, {
        method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      })
      if (!r.ok) throw new Error('Upload failed')
      const d = await r.json(); const url = d.data?.url || d.url
      if (!url) throw new Error('No URL')
      // 🆕 добавляем url + длительность синхронно (одинаковые индексы)
      setRefVideos((prev) => {
        if (prev.length >= maxRefVideos) return prev
        setRefVideoDurations((durs) => [...durs, probeDuration ?? 0])
        return [...prev, url]
      })
      haptic('light'); toast.success('Видео добавлено')
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки видео')
    } finally {
      setUploadingRefVideo(false)
    }
  }, [haptic, maxRefVideos])

  const uploadRefAudio = useCallback(async (file: File) => {
    if (!/\.(mp3|wav|aac|ogg|m4a)$/i.test(file.name) &&
      !file.type.match(/audio\/(mpeg|wav|x-wav|aac|mp4|ogg)/)) {
      toast.error('Только MP3, WAV, AAC, OGG'); return
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('Макс 15MB'); return }
    setUploadingRefAudio(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const token = useAuthStore.getState().token
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/audio`, {
        method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      })
      if (!r.ok) throw new Error('Upload failed')
      const d = await r.json(); const url = d.data?.url || d.url
      if (!url) throw new Error('No URL')
      setRefAudios((prev) => (prev.length >= 3 ? prev : [...prev, url]))
      haptic('light'); toast.success('Аудио добавлено')
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки аудио')
    } finally {
      setUploadingRefAudio(false)
    }
  }, [haptic])

  const [allowMultiUpload, setAllowMultiUpload] = useState(false)

  // 🆕 Drag-n-drop с рабочего стола (см. одноимённый блок в ImageGenerationPage).
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepth = useRef(0)

  // 🆕 Выбор картинки из истории. Цель запоминаем ту же, что у кнопки:
  // «оживить кадр», референсы Veo, набор Seedance — разные наборы.
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMax, setPickerMax] = useState(1)

  const triggerUpload = useCallback(
    (target: 'single' | 'start' | 'end' | 'ref' | 'element' | 'seedance' | 'sora' | 'seedance-first' | 'seedance-last', elementIdx?: number) => {
      uploadTarget.current = target
      if (target === 'element' && elementIdx !== undefined) {
        elementUploadIdxRef.current = elementIdx
      }
      // Атрибут multiple читается диалогом в момент click(), поэтому
      // выставляем его прямо на input перед открытием — состояние React
      // до следующего рендера не успело бы примениться.
      const multi = MULTI_UPLOAD_TARGETS.includes(target)
      const input = fileRef.current
      if (input) input.multiple = multi
      setAllowMultiUpload(multi)
      input?.click()
    },
    [],
  )

  /**
   * 🆕 Последовательная загрузка пакета файлов.
   *
   * upload() пишет результат через функциональный setState и ограничивает
   * количество внутри самого сеттера, поэтому вызывать его по очереди
   * безопасно: лимиты (maxInputImages, seedanceMaxImages, soraMaxImages)
   * проверяются на актуальном значении, а лишние файлы просто игнорируются.
   */
  const uploadBatch = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)

      // Один файл — обычный путь со своими тостами.
      if (files.length === 1) {
        await upload(files[0])
        return
      }

      // Сколько ещё влезет в текущую цель. Считаем здесь, до отправки:
      // грузить на сервер файлы, которые всё равно не попадут в набор,
      // бессмысленно.
      const target = uploadTarget.current
      let freeSlots = files.length
      if (target === 'ref') {
        const fbMax = FALLBACK[slug]?.maxInputImages
        const max = fbMax && fbMax > 1 ? fbMax : (caps.maxInputImages > 1 ? caps.maxInputImages : 3)
        freeSlots = max - refImages.length
      } else if (target === 'seedance') {
        freeSlots = seedanceMaxImages - seedanceImages.length
      } else if (target === 'sora') {
        freeSlots = soraMaxImages - soraImages.length
      } else if (target === 'element') {
        const el = elements[elementUploadIdxRef.current]
        freeSlots = el ? 4 - el.urls.length : 0
      }

      if (freeSlots <= 0) {
        toast.error('Достигнут лимит фото')
        return
      }

      const toUpload = files.slice(0, freeSlots)
      if (files.length > freeSlots) {
        toast.warning(`Загружаем ${freeSlots} из ${files.length}: достигнут лимит`)
      }

      let ok = 0
      for (const file of toUpload) {
        if (await upload(file, true)) ok++
      }

      if (ok > 0) toast.success(`Загружено фото: ${ok}`)
      if (ok < toUpload.length) {
        toast.error(
          ok === 0
            ? 'Не удалось загрузить фото'
            : `Не загрузилось: ${toUpload.length - ok}`,
        )
      }
    },
    [
      upload, slug, caps.maxInputImages, refImages.length,
      seedanceMaxImages, seedanceImages.length,
      soraMaxImages, soraImages.length, elements,
    ],
  )

  /* ── Drag-n-drop ── */

  /**
   * Куда положить перетащенные файлы. Повторяет выбор цели у кнопки-скрепки:
   * у каждой модели свой набор картинок (кадры, референсы, элементы).
   */
  const dropTarget = useCallback(():
    | 'single' | 'start' | 'ref' | 'seedance' | 'sora' => {
    if (isVeo && veoMode === 'frames') return 'start'
    if (isVeo && veoMode === 'reference') return 'ref'
    if (isKling25) return 'single'
    if (isSeedance) return 'seedance'
    if (isSora) return 'sora'
    return 'single'
  }, [isVeo, veoMode, isKling25, isSeedance, isSora])

  // Topaz принимает видео, а не картинки — там перетаскивание фото ни к чему.
  const dropEnabled = !isTopaz

  /** Сколько картинок ещё влезет в конкретную цель. */
  const freeSlotsFor = useCallback(
    (target: string): number => {
      if (target === 'ref') {
        const fbMax = FALLBACK[slug]?.maxInputImages
        const max = fbMax && fbMax > 1 ? fbMax : (caps.maxInputImages > 1 ? caps.maxInputImages : 3)
        return Math.max(0, max - refImages.length)
      }
      if (target === 'seedance') return Math.max(0, seedanceMaxImages - seedanceImages.length)
      if (target === 'sora') return Math.max(0, soraMaxImages - soraImages.length)
      // single / start / end — ровно один кадр, замена допустима.
      return 1
    },
    [
      slug, caps.maxInputImages, refImages.length,
      seedanceMaxImages, seedanceImages.length,
      soraMaxImages, soraImages.length,
    ],
  )

  /**
   * Кладёт выбранные из истории ссылки в текущую цель.
   *
   * Загружать нечего — файлы уже в хранилище, поэтому в обход upload()
   * пишем URL прямо в нужный набор. Одиночные цели берут первую ссылку.
   */
  const addPickedUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return
      const target = uploadTarget.current

      if (target === 'ref') {
        setRefImages((prev) => {
          const free = freeSlotsFor('ref')
          const fresh = urls.filter((u) => !prev.includes(u)).slice(0, free)
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } else if (target === 'seedance') {
        setSeedanceImages((prev) => {
          const fresh = urls
            .filter((u) => !prev.includes(u))
            .slice(0, Math.max(0, seedanceMaxImages - prev.length))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } else if (target === 'sora') {
        setSoraImages((prev) => {
          const fresh = urls
            .filter((u) => !prev.includes(u))
            .slice(0, Math.max(0, soraMaxImages - prev.length))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } else if (target === 'start') {
        setStartFrame(urls[0])
      } else if (target === 'end') {
        setEndFrame(urls[0])
      } else if (target === 'seedance-first') {
        setSeedanceFirstFrame(urls[0])
      } else if (target === 'seedance-last') {
        setSeedanceLastFrame(urls[0])
      } else if (target === 'element') {
        const idx = elementUploadIdxRef.current
        setElements((prev) =>
          prev.map((el, i) => {
            if (i !== idx) return el
            const fresh = urls
              .filter((u) => !el.urls.includes(u))
              .slice(0, Math.max(0, 4 - el.urls.length))
            return fresh.length ? { ...el, urls: [...el.urls, ...fresh] } : el
          }),
        )
      } else {
        setImgUrl(urls[0])
      }

      haptic('light')
      toast.success(urls.length === 1 ? 'Фото добавлено' : `Добавлено фото: ${urls.length}`)
    },
    [freeSlotsFor, seedanceMaxImages, soraMaxImages, haptic],
  )

  /** Открывает выбор из истории для нужной цели (аналог triggerUpload). */
  const openPicker = useCallback(
    (target: Parameters<typeof triggerUpload>[0], elementIdx?: number) => {
      uploadTarget.current = target
      if (target === 'element' && elementIdx !== undefined) {
        elementUploadIdxRef.current = elementIdx
      }
      setPickerMax(target === 'element' ? 4 : freeSlotsFor(target))
      setShowPicker(true)
    },
    [freeSlotsFor, triggerUpload],
  )

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes('Files')

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!dropEnabled || !isFileDrag(e)) return
      e.preventDefault()
      dragDepth.current += 1
      setIsDragOver(true)
    },
    [dropEnabled],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dropEnabled || !isFileDrag(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [dropEnabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!dropEnabled || !isFileDrag(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setIsDragOver(false)

      const target = dropTarget()
      uploadTarget.current = target
      // Одиночные цели берут только первый файл: класть остальные некуда.
      const files = e.dataTransfer.files
      if (MULTI_UPLOAD_TARGETS.includes(target)) {
        uploadBatch(files)
      } else if (files.length > 0) {
        if (files.length > 1) toast.warning('Здесь нужна одна картинка — взяли первую')
        upload(files[0])
      }
    },
    [dropEnabled, dropTarget, uploadBatch, upload],
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
    if (!prompt && !isTopaz) return

    if (isSeedance25 && seedanceLastFrame && !seedanceFirstFrame) {
      toast.warning('Для конечного кадра нужен начальный')
      return
    }

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

    if (isKling25 && endFrame && !imgUrl) {
      toast.warning('Для конечного кадра нужен начальный')
      return
    }

    if (isKling && multiShots) {
      const validShots = shots.filter((sh) => sh.prompt.trim())
      if (validShots.length === 0) {
        toast.warning('Добавьте хотя бы один шот с описанием')
        return
      }
    }
    if (isKling) {
      const badEl = elements.find(
        (el) => el.name.trim() && el.urls.length > 0 && el.urls.length < 2,
      )
      if (badEl) {
        toast.warning(`Элемент "${badEl.name}" требует 2-4 изображения`)
        return
      }
    }

    if (isMotion) {
      if (!imgUrl) {
        toast.warning('Загрузите фото персонажа')
        return
      }
      if (!motionVideoUrl) {
        toast.warning('Загрузите видео с движениями')
        return
      }
    }

    if (isTopaz && !topazVideoUrl) {
      toast.warning('Загрузите видео для апскейла')
      return
    }

    if (!isFreeForUser && balance < displayedCost) {
      toast.warning(`Недостаточно спичек. Нужно ${displayedCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setGenerating(true)

    const s: Record<string, unknown> = {}

    if (caps.durations.length && duration !== undefined) {
      const dur = veoForcesDuration8 ? 8 : duration
      const isKieStr = slug.startsWith('kling') || slug.startsWith('wan')
      s.duration = isKieStr ? String(dur) : dur
    }

    if (caps.aspectRatios.length && aspectRatio && !isMotion) s.aspectRatio = aspectRatio
    if (caps.resolutions.length && resolution) s.resolution = resolution
    if (caps.modes.length && mode) s.mode = mode

    if (caps.supportsSound) {
      s.sound = sound
      if (isVeo) s.generateAudio = sound
    }

    if (caps.supportsRemoveWatermark) s.removeWatermark = removeWatermark

    if (isMotion) {
      s.imageUrls = [imgUrl]
      s.videoUrls = [motionVideoUrl]
      s.characterOrientation = characterOrientation
      s.mode = mode || '720p'
      s.duration = motionEffectiveDuration
    } else if (isVeo) {
      const safeMode: VeoMode =
        veoMode === 'reference' && !supportsReference ? 'text' : veoMode

      s.generationType = VEO_MODE_TO_GENERATION_TYPE[safeMode]

      if (safeMode === 'frames') {
        const frames = [startFrame, endFrame].filter(Boolean)
        if (frames.length) s.imageUrls = frames
      } else if (safeMode === 'reference') {
        if (refImages.length) s.referenceImages = refImages.slice(0, veoMaxRefImages)
      }
    } else if (isKling) {
      const frames = multiShots
        ? [startFrame].filter(Boolean)
        : [startFrame, endFrame].filter(Boolean)
      if (frames.length) s.imageUrls = frames

      if (imgUrl && frames.length === 0) s.imageUrls = [imgUrl]

      s.multiShots = multiShots

      if (multiShots) {
        s.multiPrompt = shots
          .filter((sh) => sh.prompt.trim())
          .slice(0, 5)
          .map((sh) => ({
            prompt: sh.prompt.trim().slice(0, 500),
            duration: Math.min(12, Math.max(1, sh.duration || 3)),
          }))
        s.sound = true
        // 🆕 суммарная длительность для корректной цены на бэке
        if (klingMultiDuration !== undefined) {
          s.duration = klingMultiDuration
        }
      }

      const validElements = elements
        .filter((el) => el.name.trim() && el.urls.length >= 2 && el.urls.length <= 4)
        .slice(0, 3)
        .map((el) => ({
          name: el.name.trim(),
          description: el.description.trim(),
          elementInputUrls: el.urls,
        }))
      if (validElements.length) s.klingElements = validElements
    } else if (isTopaz) {
      s.videoUrls = [topazVideoUrl]
      s.duration = topazDurationSec
      // s.resolution (upscale factor) уже проставлен generic-блоком выше
    } else if (isOmni) {
      // 🆕 Omni: видео-референс (1 шт) + опциональное фото.
      // Цена с видео фиксированная, refVideoSeconds не нужны.
      if (refVideos.length) s.videoUrls = [refVideos[0]]
      if (imgUrl) s.imageUrl = imgUrl
    } else if (isKling25) {
      s.cfgScale = cfgScale
      s.nsfwChecker = nsfwChecker
      const frames = imgUrl ? [imgUrl, endFrame].filter(Boolean) : []
      if (frames.length) s.imageUrls = frames
    } else if (isSeedance) {
      if (seedanceImages.length > 0) {
        s.imageUrls = seedanceImages.slice(0, seedanceMaxImages)
      } else if (imgUrl) {
        s.imageUrls = [imgUrl]
      }
      if (isSeedance15) {
        s.fixedLens = fixedLens
      } else {
        s.webSearch = webSearch
        if (refVideos.length) {
          s.videoUrls = refVideos
          s.refVideoSeconds = refVideoSeconds
        }
        if (refAudios.length) s.audioUrls = refAudios

        // 🆕 Seedance 2.5 — first/last кадр + доп. параметры
        if (isSeedance25) {
          if (seedanceFirstFrame) s.firstFrameUrl = seedanceFirstFrame
          if (seedanceLastFrame) s.lastFrameUrl = seedanceLastFrame
          if (seedanceReturnLastFrame) s.returnLastFrame = true
          s.outputFormat = seedanceOutputFormat
        }
      }
    } else if (isSora) {
      // 🆕 Sora 2 / Pro — массив референсов
      if (soraImages.length > 0) {
        s.imageUrls = soraImages.slice(0, soraMaxImages)
      } else if (imgUrl) {
        s.imageUrls = [imgUrl]
      }
      if (caps.supportsResizeMode && (soraImages.length > 0 || imgUrl)) {
        s.resizeMode = resizeMode
      }
    } else {
      if (caps.supportsImageInput && imgUrl) s.imageUrl = imgUrl
      if (caps.supportsResizeMode && imgUrl) s.resizeMode = resizeMode
    }

    const ok = await generate({ type: 'video', model: slug, prompt, settings: s })
    setGenerating(false)
    if (ok) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => {
        const el = resultsContainerRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 100)
    }
  }, [
    input, balance, displayedCost, slug, imgUrl, isOmni,
    duration, aspectRatio, resolution, mode, sound, removeWatermark, resizeMode,
    caps, requiresInputImage, isFreeForUser,
    haptic, hapticNotification, generate,
    isVeo, veoMode, startFrame, endFrame, refImages, veoForcesDuration8, supportsReference,
    veoMaxRefImages,
    isKling, multiShots, shots, elements,
    isKling25, cfgScale, nsfwChecker,
    isMotion, motionVideoUrl, motionEffectiveDuration, characterOrientation,
    isSeedance, isSeedance15, fixedLens, webSearch, refVideos, refVideoSeconds, refAudios,
    seedanceImages, seedanceMaxImages, // 🆕
    isSora, soraImages, soraMaxImages, // 🆕
    isTopaz, topazVideoUrl, topazVideoDuration, topazDurationSec,
    isSeedance25, seedanceFirstFrame, seedanceLastFrame, seedanceReturnLastFrame, seedanceOutputFormat
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
    rememberModel(newSlug)
  }

  const formatCost = (n: number) => (n % 1 === 0 ? n : n.toFixed(2))

  const hasResults = vidGens.length > 0

  const klingMultiInvalid =
    isKling && multiShots && shots.filter((sh) => sh.prompt.trim()).length === 0

  const genDisabled =
    // Topaz только апскейлит загруженное видео — промпт там не нужен,
    // достаточно самого файла (проверяется ниже, topazVideoUrl).
    (!isTopaz && !input.trim() && !klingMultiInvalid && !(isKling && multiShots)) ||
    (isKling && multiShots && klingMultiInvalid) ||
    generating ||
    (isVeo && veoMode === 'frames' && !startFrame) ||
    (isVeo && veoMode === 'reference' && refImages.length === 0) ||
    (!isVeo && !isKling && requiresInputImage && !imgUrl) ||
    (isTopaz && !topazVideoUrl)   // 🆕

  /* ── Badges ── */

  const activeBadges = useMemo(() => {
    const badges: { key: string; label: string; accent?: boolean }[] = []

    if (isVeo) {
      const m = VEO_MODE_META[veoMode]
      badges.push({ key: 'veomode', label: m.label, accent: veoMode !== 'text' })
    }
    if (caps.modes.length > 0 && mode) {
      badges.push({ key: 'mode', label: MODE_META[mode]?.label || mode, accent: true })
    }
    if (caps.durations.length > 0 && duration !== undefined && !(isKling && multiShots)) {
      badges.push({ key: 'dur', label: `${veoForcesDuration8 ? 8 : duration} сек` })
    }
    if (caps.aspectRatios.length > 0 && aspectRatio && !isMotion) {
      badges.push({ key: 'ar', label: AR_META[aspectRatio]?.label || aspectRatio })
    }
    if (caps.resolutions.length > 0 && resolution) {
      badges.push({ key: 'res', label: RES_META[resolution]?.label || resolution })
    }
    if (caps.supportsSound) {
      const sndOn = isKling && multiShots ? true : sound
      badges.push({ key: 'sound', label: sndOn ? '🔊' : '🔇', accent: sndOn })
    }
    if (isTopaz && topazVideoUrl) {
      badges.push({ key: 'topaz-vid', label: '🎬 Видео', accent: true })
    }
    // 🆕 Видео-референсы (Seedance 2/2-fast/2.5, Omni) — сами превью лежат
    // в панели настроек, поэтому снаружи показываем хотя бы счётчик.
    if (refVideos.length > 0) {
      badges.push({
        key: 'refvid',
        label: refVideos.length > 1 ? `🎬 ${refVideos.length} видео` : '🎬 Видео',
        accent: true,
      })
    }
    if (refAudios.length > 0) {
      badges.push({
        key: 'refaud',
        label: refAudios.length > 1 ? `🎵 ${refAudios.length} аудио` : '🎵 Аудио',
        accent: true,
      })
    }
    if (isI2V) {
      // 🆕 для Seedance и Sora показываем количество фото
      const cnt = isSeedance
        ? seedanceImages.length
        : isSora
          ? soraImages.length
          : (imgUrl ? 1 : 0)
      const isMulti = (isSeedance || isSora) && cnt > 1
      badges.push({
        key: 'img2vid',
        label: cnt > 0
          ? (isMulti ? `📸 ${cnt} фото` : '📸 Фото')
          : 'img2vid',
        accent: cnt > 0,
      })
    }
    if (isSeedance25 && (seedanceFirstFrame || seedanceLastFrame)) {
      badges.push({
        key: 'sd25-frames',
        label: seedanceFirstFrame && seedanceLastFrame ? '🖼 Старт→Конец' : '🖼 Кадр',
        accent: true,
      })
    }
    if (caps.supportsResizeMode && imgUrl) {
      badges.push({
        key: 'resize',
        label: resizeMode === 'crop' ? '✂️ Crop' : '🔲 Pad',
        accent: resizeMode === 'pad',
      })
    }
    if (isKling && multiShots) {
      const cnt = shots.filter((sh) => sh.prompt.trim()).length
      badges.push({ key: 'multishot', label: `🎬 ${cnt} шот${cnt === 1 ? '' : 'ов'}`, accent: true })
    }
    if (isKling && elements.filter((e) => e.name.trim()).length > 0) {
      badges.push({
        key: 'elements',
        label: `🧩 ${elements.filter((e) => e.name.trim()).length}`,
        accent: true,
      })
    }
    if (isKling && (startFrame || endFrame)) {
      badges.push({ key: 'kframes', label: '🖼 Кадры', accent: true })
    }
    if (isKling25) {
      if (imgUrl) {
        badges.push({ key: 'k25img', label: '📸 Фото', accent: true })
      }
      badges.push({ key: 'cfg', label: `✨ ${cfgScale.toFixed(1)}` })
      badges.push({ key: 'k25res', label: '1080p' })
    }

    if (isMotion) {
      if (imgUrl) badges.push({ key: 'mc-img', label: '📸 Фото', accent: true })
      if (motionVideoUrl) badges.push({ key: 'mc-vid', label: '🎬 Видео', accent: true })
      badges.push({ key: 'mc-co', label: characterOrientation === 'video' ? 'Ориент: видео' : 'Ориент: фото' })
    }

    return badges
  }, [
    caps, mode, duration, aspectRatio, resolution, sound, isI2V, imgUrl,
    isVeo, veoMode, veoForcesDuration8, resizeMode,
    isKling, multiShots, shots, elements, startFrame, endFrame,
    isKling25, cfgScale,
    isMotion, motionVideoUrl, characterOrientation,
    isSeedance, seedanceImages, // 🆕
    isSora, soraImages, // 🆕
    seedanceFirstFrame, seedanceLastFrame,
    refVideos, refAudios, // 🆕 счётчики референсов в бейджах
    isTopaz, topazVideoUrl,
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
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Оверлей перетаскивания ── */}
      {isDragOver && (
        <div
          className="
            absolute inset-0 z-[60]
            flex flex-col items-center justify-center gap-3
            bg-black/70 backdrop-blur-sm
            border-2 border-dashed border-[var(--accent-yellow)]
            rounded-[var(--radius-md)]
            pointer-events-none
          "
        >
          <Upload size={32} className="text-[var(--accent-yellow)]" />
          <div className="text-[15px] font-semibold text-white">
            Отпустите, чтобы загрузить
          </div>
        </div>
      )}

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

          {isFreeForUser ? (
            <span
              className="text-[11px] shrink-0 inline-flex items-center gap-1 text-emerald-400 font-semibold"
              title={
                freeAccess.limit === 'unlimited'
                  ? 'Безлимитно по подписке'
                  : `Лимит: ${freeAccess.hourlyLimit ?? '∞'}/час`
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
              {formatCost(displayedCost)} <Flame size={12} className="inline-block align-[-2px]" />
            </span>
          )}

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
                      ? (veoSupportsReference(m.slug) ? ' · txt/img/ref' : ' · txt/img')
                      : (m.slug.includes('img') || m.slug.includes('motion'))
                        ? ' · img2vid'
                        : ' · txt2vid'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                    return (
                      <span className="text-[11px] text-white/40">
                        от {formatCost(m.cost)} <Flame size={12} className="inline-block align-[-2px]" />
                      </span>
                    )
                  })()}
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
                      {formatCost(genCost)} <Flame size={12} className="inline-block align-[-2px]" /> затрачено
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {generating && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
              <div className="text-[13px] text-white/45 leading-[1.4] break-words">
                <span className="inline-block text-[10px] font-semibold py-0.5 px-2 mr-1.5 align-middle rounded bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] text-[var(--accent-yellow)]">
                  {model?.name ?? slug}
                </span>
                {input || 'Генерация...'}
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
                        {formatCost(displayedCost)} <Flame size={12} className="inline-block align-[-2px]" />
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

              {/* Veo mode */}
              {isVeo && (
                <Field label={<><Sparkles size={12} /> Режим Veo</>}>
                  <Grid cols={supportsReference ? 3 : 2}>
                    {(['text', 'frames', ...(supportsReference ? ['reference'] : [])] as VeoMode[]).map((vm) => {
                      const meta = VEO_MODE_META[vm]
                      const Icon = meta.icon
                      return (
                        <IconOptBtn
                          key={vm}
                          active={veoMode === vm}
                          icon={<Icon size={16} strokeWidth={2} />}
                          label={meta.label}
                          onClick={() => { setVeoMode(vm); haptic('light') }}
                        />
                      )
                    })}
                  </Grid>
                </Field>
              )}

              {/* Mode */}
              {caps.modes.length > 0 && !isMotion && (
                <Field label={<><Sparkles size={12} /> Режим</>} priceHint>
                  <Grid cols={caps.modes.length <= 3 ? caps.modes.length : 2}>
                    {caps.modes.map((m) => {
                      const meta = MODE_META[m]
                      const Icon = meta?.icon || Gauge
                      return (
                        <IconOptBtn
                          key={m}
                          active={mode === m}
                          icon={<Icon size={16} strokeWidth={2} />}
                          label={meta?.label || m}
                          onClick={() => { setMode(m); haptic('light') }}
                        />
                      )
                    })}
                  </Grid>
                </Field>
              )}

              {/* Duration */}
              {caps.durations.length > 0 && !(isKling && multiShots) && !isMotion && (
                <Field label={<><Clock size={12} /> Длительность</>} priceHint>
                  {veoForcesDuration8 ? (
                    <div className="text-[12px] text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-[var(--radius-xs)] px-3 py-2.5">
                      В режиме «Референс» длительность фиксирована — <b className="text-white/60">8 сек</b>
                    </div>
                  ) : (
                    <DurationSlider
                      values={caps.durations}
                      value={duration ?? caps.durations[0]}
                      onChange={(v) => { setDuration(v); haptic('light') }}
                      isDisabled={isDurationDisabled}
                    />
                  )}
                </Field>
              )}

              {/* Aspect Ratio */}
              {caps.aspectRatios.length > 0 && !(isKling25 && imgUrl) && !isMotion && (
                <Field label={<><Maximize2 size={12} /> Соотношение сторон</>}>
                  <Grid cols={caps.aspectRatios.length <= 3 ? caps.aspectRatios.length : 4}>
                    {caps.aspectRatios.map((a) => {
                      const meta = AR_META[a] || { label: a, orient: 'landscape' as AROrient }
                      return (
                        <AROptBtn
                          key={a}
                          active={aspectRatio === a}
                          orient={meta.orient}
                          label={meta.label}
                          onClick={() => { setAspectRatio(a); haptic('light') }}
                        />
                      )
                    })}
                  </Grid>
                </Field>
              )}

              {/* Resolution */}
              {caps.resolutions.length > 0 && (
                <Field label={<><Layers size={12} /> Разрешение</>} priceHint>
                  <Grid cols={caps.resolutions.length <= 3 ? caps.resolutions.length : 3}>
                    {caps.resolutions.map((r) => {
                      const meta = RES_META[r] || { label: r, tier: 1 }
                      return (
                        <ResOptBtn
                          key={r}
                          active={resolution === r}
                          label={meta.label}
                          sub={meta.sub}
                          tier={meta.tier}
                          disabled={isResolutionDisabled(r)}
                          onClick={() => { setResolution(r); haptic('light') }}
                        />
                      )
                    })}
                  </Grid>
                </Field>
              )}

              {/* Sound */}
              {caps.supportsSound && !(isKling && multiShots) && (
                <Field label={<><Volume2 size={12} /> Звук</>}>
                  <ToggleRow
                    active={sound}
                    onLabel={<><Volume2 size={14} /> Включён</>}
                    offLabel={<><VolumeX size={14} /> Выключен</>}
                    onChange={(v) => { setSound(v); haptic('light') }}
                  />
                </Field>
              )}

              {isKling && multiShots && caps.supportsSound && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-[var(--radius-xs)] px-3 py-2.5 text-[12px] text-white/50 flex items-center gap-2">
                  <Volume2 size={14} className="text-[var(--accent-yellow)]" />
                  В режиме мультисцен звук включается автоматически
                </div>
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

              {(slug === 'sora-2-pro' || slug === 'sora-2') && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-[12px] text-white/60 leading-relaxed">
                  ⚠️ Sora 2 имеет строгую модерацию. Реальные люди на изображениях не поддерживаются.
                </div>
              )}

              {/* ═══ MOTION CONTROL ═══ */}
              {isMotion && (
                <>
                  <Field label={<><ImageIcon size={12} /> Фото персонажа</>}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <FrameSlot
                        label="Референс (персонаж)"
                        url={imgUrl}
                        uploading={uploading && uploadTarget.current === 'single'}
                        onUpload={() => openPicker('single')}
                        onRemove={() => setImgUrl('')}
                      />
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      Внешность, фон и стиль персонажа возьмутся с этого фото.
                    </div>
                  </Field>

                  <Field label={<><Film size={12} /> Видео с движениями</>}>
                    {motionVideoUrl ? (
                      <div className="relative rounded-[10px] overflow-hidden border border-white/[0.08]">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          src={motionVideoUrl}
                          className="w-full max-h-[180px] object-contain bg-black block"
                          controls
                          playsInline
                        />
                        <button
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                          onClick={() => { setMotionVideoUrl(''); setMotionVideoDuration(null) }}
                        >
                          <X size={13} />
                        </button>
                        {motionVideoDuration !== null && (
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                            {Math.round(motionVideoDuration)}с
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        className="
                          w-full py-6 rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1.5 text-[12px]
                          cursor-pointer transition-all
                          active:bg-white/[0.07] active:border-white/[0.22]
                          disabled:opacity-50
                        "
                        onClick={() => videoFileRef.current?.click()}
                        disabled={uploadingVideo}
                      >
                        {uploadingVideo
                          ? <Loader2 size={22} className="animate-spin" />
                          : <Upload size={22} />}
                        <span>{uploadingVideo ? 'Загрузка...' : 'Загрузить видео'}</span>
                      </button>
                    )}
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      MP4 или MOV, 3–30 сек, до 100MB. В кадре должен быть один человек —
                      его движения перенесутся на персонажа с фото.
                    </div>
                  </Field>

                  <Field label={<><Type size={12} /> Источник ориентации</>}>
                    <Grid cols={2}>
                      <OptBtn
                        active={characterOrientation === 'video'}
                        onClick={() => { setCharacterOrientation('video'); haptic('light') }}
                      >
                        🎬 По видео (до 30с)
                      </OptBtn>
                      <OptBtn
                        active={characterOrientation === 'image'}
                        onClick={() => { setCharacterOrientation('image'); haptic('light') }}
                      >
                        📸 По фото (до 10с)
                      </OptBtn>
                    </Grid>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      «По видео» — персонаж повторяет повороты из видео (до 30с).
                      «По фото» — ориентация как на фото (макс 10с).
                    </div>
                  </Field>

                  {caps.modes.length > 0 && (
                    <Field label={<><Layers size={12} /> Качество</>} priceHint>
                      <Grid cols={caps.modes.length}>
                        {caps.modes.map((m) => (
                          <OptBtn
                            key={m}
                            active={mode === m}
                            onClick={() => { setMode(m); haptic('light') }}
                          >
                            {m === '720p' ? '720p HD · 9 спичек/сек'
                              : m === '1080p' ? '1080p FHD · 12.3 спички/сек'
                                : m}
                          </OptBtn>
                        ))}
                      </Grid>
                    </Field>
                  )}

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-[var(--radius-xs)] px-3 py-2.5 text-[12px] text-white/50 flex items-center gap-2">
                    <Clock size={14} className="text-[var(--accent-yellow)]" />
                    {motionVideoDuration !== null ? (
                      <>Длительность: <b className="text-white/70 mx-1">{motionEffectiveDuration}с</b>
                        × {(mode || '720p') === '1080p' ? '12.3' : '9'}<Flame size={12} className="inline-block align-[-2px]" />/сек
                        {characterOrientation === 'image' && motionVideoDuration > 10 && (
                          <span className="text-amber-400/70 ml-1">(обрезано до 10с)</span>
                        )}
                      </>
                    ) : (
                      <>Длительность определится из загруженного видео · {(mode || '720p') === '1080p' ? '12.3' : '9'}<Flame size={12} className="inline-block align-[-2px]" />/сек</>
                    )}
                  </div>
                </>
              )}

              {isTopaz && (
                <Field label={<><Film size={12} /> Видео для апскейла</>}>
                  {topazVideoUrl ? (
                    <div className="relative rounded-[10px] overflow-hidden border border-white/[0.08]">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        src={topazVideoUrl}
                        className="w-full max-h-[180px] object-contain bg-black block"
                        controls
                        playsInline
                      />
                      <button
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                        onClick={() => { setTopazVideoUrl(''); setTopazVideoDuration(null) }}
                      >
                        <X size={13} />
                      </button>
                      {topazVideoDuration !== null && (
                        <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {Math.ceil(topazVideoDuration)}с
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      className="
          w-full py-6 rounded-[10px]
          border-[1.5px] border-dashed border-white/[0.12]
          bg-white/[0.03] text-white/30
          flex flex-col items-center justify-center gap-1.5 text-[12px]
          cursor-pointer transition-all
          active:bg-white/[0.07] active:border-white/[0.22]
          disabled:opacity-50
        "
                      onClick={() => topazVideoFileRef.current?.click()}
                      disabled={uploadingTopazVideo}
                    >
                      {uploadingTopazVideo
                        ? <Loader2 size={22} className="animate-spin" />
                        : <Upload size={22} />}
                      <span>{uploadingTopazVideo ? 'Загрузка...' : 'Загрузить видео'}</span>
                    </button>
                  )}
                  <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                    MP4 или MOV, до 300MB. Цена = ставка × длительность видео.
                  </div>
                </Field>
              )}

              {/* ═══ KLING 3.0 ═══ */}
              {isKling && (
                <>
                  <Field label={<><Film size={12} /> Мультисцены</>}>
                    <Grid cols={2}>
                      <OptBtn
                        active={!multiShots}
                        onClick={() => { setMultiShots(false); haptic('light') }}
                      >
                        🎥 Одна сцена
                      </OptBtn>
                      <OptBtn
                        active={multiShots}
                        onClick={() => { setMultiShots(true); haptic('light') }}
                      >
                        🎬 Мультисцены
                      </OptBtn>
                    </Grid>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      Мультисцены — до 5 последовательных шотов с разными промптами и длительностью.
                    </div>
                  </Field>

                  {multiShots && (
                    <Field label={<><Layers size={12} /> Шоты ({shots.length}/5)</>} priceHint>
                      <div className="flex flex-col gap-2.5">
                        {shots.map((sh, idx) => (
                          <ShotEditor
                            key={idx}
                            index={idx}
                            prompt={sh.prompt}
                            duration={sh.duration}
                            canRemove={shots.length > 1}
                            onPrompt={(v) =>
                              setShots((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, prompt: v } : s)),
                              )
                            }
                            onDuration={(v) => {
                              setShots((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, duration: v } : s)),
                              )
                              haptic('light')
                            }}
                            onRemove={() => {
                              setShots((prev) => prev.filter((_, i) => i !== idx))
                              haptic('light')
                            }}
                          />
                        ))}
                        {shots.length < 5 && (
                          <button
                            className="
                              flex items-center justify-center gap-1.5
                              py-2.5 rounded-[var(--radius-xs)]
                              border-[1.5px] border-dashed border-white/[0.12]
                              bg-white/[0.02] text-white/40 text-[12px] font-medium
                              cursor-pointer transition-all active:scale-[0.98]
                              active:bg-white/[0.06]
                            "
                            onClick={() => {
                              setShots((prev) => [...prev, { prompt: '', duration: 5 }])
                              haptic('light')
                            }}
                          >
                            <Plus size={14} /> Добавить шот
                          </button>
                        )}
                      </div>
                      {/* 🆕 Сводка: суммарная длительность + цена мультисцен */}
                      {klingMultiDuration !== undefined && (
                        <div
                          className="
                              mt-1 flex items-center justify-between
                              px-3 py-2.5 rounded-[var(--radius-xs)]
                              bg-[rgba(250,204,21,0.06)]
                              border border-[rgba(250,204,21,0.18)]
                            "
                        >
                          <div className="flex items-center gap-1.5 text-[11px] text-white/55">
                            <Clock size={13} className="text-[var(--accent-yellow)]" />
                            <span>
                              Итого:{' '}
                              <b className="text-white/80">
                                {klingMultiDuration} сек
                              </b>
                              {rawShotsSum > 15 && (
                                <span className="text-amber-400/70 ml-1">
                                  (из {rawShotsSum}с, макс 15)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[12px] font-semibold">
                            {isFreeForUser ? (
                              <span className="text-emerald-400 inline-flex items-center gap-1">
                                <Gift size={12} />
                                {formatFreeLabel(freeAccess)}
                              </span>
                            ) : (
                              <span
                                className={
                                  !isFallbackPrice
                                    ? 'text-[var(--accent-yellow)]'
                                    : 'text-white/50'
                                }
                              >
                                {showPriceLoader && (
                                  <Loader2
                                    size={11}
                                    className="animate-spin inline mr-1"
                                  />
                                )}
                                {formatCost(displayedCost)} <Flame size={12} className="inline-block align-[-2px]" />
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Field>
                  )}

                  <Field label={<><Tag size={12} /> Элементы ({elements.length}/3)</>}>
                    <div className="flex flex-col gap-2.5">
                      {elements.map((el, idx) => (
                        <ElementEditor
                          key={idx}
                          index={idx}
                          name={el.name}
                          description={el.description}
                          urls={el.urls}
                          uploading={
                            uploading &&
                            uploadTarget.current === 'element' &&
                            elementUploadIdxRef.current === idx
                          }
                          onName={(v) =>
                            setElements((prev) =>
                              prev.map((e, i) => (i === idx ? { ...e, name: v } : e)),
                            )
                          }
                          onDescription={(v) =>
                            setElements((prev) =>
                              prev.map((e, i) => (i === idx ? { ...e, description: v } : e)),
                            )
                          }
                          onAddImage={() => openPicker('element', idx)}
                          onRemoveImage={(imgIdx) =>
                            setElements((prev) =>
                              prev.map((e, i) =>
                                i === idx
                                  ? { ...e, urls: e.urls.filter((_, j) => j !== imgIdx) }
                                  : e,
                              ),
                            )
                          }
                          onRemove={() => {
                            setElements((prev) => prev.filter((_, i) => i !== idx))
                            haptic('light')
                          }}
                        />
                      ))}
                      {elements.length < 3 && (
                        <button
                          className="
                            flex items-center justify-center gap-1.5
                            py-2.5 rounded-[var(--radius-xs)]
                            border-[1.5px] border-dashed border-white/[0.12]
                            bg-white/[0.02] text-white/40 text-[12px] font-medium
                            cursor-pointer transition-all active:scale-[0.98]
                            active:bg-white/[0.06]
                          "
                          onClick={() => {
                            setElements((prev) => [...prev, { name: '', description: '', urls: [] }])
                            haptic('light')
                          }}
                        >
                          <Plus size={14} /> Добавить элемент
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      Элемент = персонаж/объект с 2-4 фото. Ссылайтесь в промпте через{' '}
                      <b className="text-white/50">@имя</b>. Нужно 2-4 изображения.
                    </div>
                  </Field>

                  <Field
                    label={
                      <>
                        <Film size={12} /> Кадры {multiShots ? '(только старт)' : '(старт → конец)'}
                      </>
                    }
                  >
                    <div className={`grid gap-2.5 ${multiShots ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      <FrameSlot
                        label="Старт (опц.)"
                        url={startFrame}
                        uploading={uploading && uploadTarget.current === 'start'}
                        onUpload={() => triggerUpload('start')}
                        onRemove={() => setStartFrame('')}
                      />
                      {!multiShots && (
                        <FrameSlot
                          label="Конец (опц.)"
                          url={endFrame}
                          uploading={uploading && uploadTarget.current === 'end'}
                          onUpload={() => triggerUpload('end')}
                          onRemove={() => setEndFrame('')}
                        />
                      )}
                    </div>
                  </Field>
                </>
              )}

              {/* ═══ KLING 2.5 TURBO ═══ */}
              {isKling25 && (
                <>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-[var(--radius-xs)] px-3 py-2.5 text-[12px] text-white/50 flex items-center gap-2">
                    <Layers size={14} className="text-[var(--accent-yellow)]" />
                    Качество видео — <b className="text-white/70 mx-1">1080p</b> (единственный вариант)
                  </div>

                  <div
                    className={`
                      rounded-[var(--radius-xs)] px-3 py-2.5
                      text-[12px] flex items-center gap-2 border transition-colors
                      ${imgUrl
                        ? 'bg-[rgba(250,204,21,0.06)] border-[rgba(250,204,21,0.2)] text-[var(--accent-yellow)]'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/50'
                      }
                    `}
                  >
                    {imgUrl ? (
                      <>
                        <ImageIcon size={14} />
                        Режим: <b className="mx-0.5">Изображение → Видео</b>
                      </>
                    ) : (
                      <>
                        <Type size={14} />
                        Режим: <b className="mx-0.5 text-white/70">Текст → Видео</b>
                      </>
                    )}
                  </div>

                  <Field label={<><Film size={12} /> Оживить изображение (опц.)</>}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <FrameSlot
                        label="Начальный кадр"
                        url={imgUrl}
                        uploading={uploading && uploadTarget.current === 'single'}
                        onUpload={() => openPicker('single')}
                        onRemove={() => {
                          setImgUrl('')
                          setEndFrame('')
                        }}
                      />
                      <FrameSlot
                        label="Конечный кадр (опц.)"
                        url={endFrame}
                        uploading={uploading && uploadTarget.current === 'end'}
                        onUpload={() => {
                          if (!imgUrl) {
                            toast.warning('Сначала загрузите начальный кадр')
                            return
                          }
                          triggerUpload('end')
                        }}
                        onRemove={() => setEndFrame('')}
                      />
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      <b className="text-white/50">Без кадров</b> — видео по тексту.{' '}
                      <b className="text-white/50">С начальным кадром</b> — оживление изображения.
                      Конечный кадр задаёт финал перехода (нужен начальный).
                    </div>
                  </Field>

                  <Field label={<><Sparkles size={12} /> Креативность</>}>
                    <CfgSlider
                      value={cfgScale}
                      onChange={(v) => { setCfgScale(v); haptic('light') }}
                    />
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      Чем выше — тем строже следование промпту. Ниже — больше свободы у модели.
                    </div>
                  </Field>

                  <Field label={<><ShieldOff size={12} /> Фильтр 18+ контента</>}>
                    <ToggleRow
                      active={nsfwChecker}
                      onLabel={<>🛡️ Защита вкл</>}
                      offLabel={<>⚠️ Без фильтра</>}
                      onChange={(v) => { setNsfwChecker(v); haptic('light') }}
                    />
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      Защита блокирует непристойный (18+) контент. Рекомендуем оставить включённой.
                    </div>
                  </Field>
                </>
              )}

              {/* ─── Veo: FRAMES ─── */}
              {isVeo && veoMode === 'frames' && (
                <Field label={<><Film size={12} /> Кадры (старт → конец)</>}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FrameSlot
                      label="Старт"
                      url={startFrame}
                      uploading={uploading && uploadTarget.current === 'start'}
                      onUpload={() => triggerUpload('start')}
                      onRemove={() => setStartFrame('')}
                    />
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

              {/* ─── Veo: REFERENCE ─── */}
              {isVeo && veoMode === 'reference' && supportsReference && (
                <Field label={<><Images size={12} /> Референсы (1–{veoMaxRefImages})</>}>
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

                    {refImages.length < veoMaxRefImages && (
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
                        onClick={() => openPicker('ref')}
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

              {/* ═══ SEEDANCE ═══ */}
              {isSeedance && (
                <>
                  {/* 🆕 Множественные референс-фото */}
                  <Field
                    label={
                      <>
                        <ImageIcon size={12} />{' '}
                        {isSeedance15
                          ? `Изображения (${seedanceImages.length}/${seedanceMaxImages})`
                          : `Референс-изображения (${seedanceImages.length}/${seedanceMaxImages})`}
                      </>
                    }
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {seedanceImages.map((url, idx) => (
                        <div key={url + idx} className="relative aspect-square rounded-[10px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
                          />
                          {/* Бейдж @ImageN для Seedance 2 (референсы) */}
                          {isSeedance2 && (
                            <span className="absolute bottom-1 left-1 text-[9px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded">
                              @Image{idx + 1}
                            </span>
                          )}
                          <button
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                            onClick={() =>
                              setSeedanceImages((p) => p.filter((_, i) => i !== idx))
                            }
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {seedanceImages.length < seedanceMaxImages && (
                        <button
                          className="
                            aspect-square rounded-[10px]
                            border-[1.5px] border-dashed border-white/[0.12]
                            bg-white/[0.03] text-white/30
                            flex flex-col items-center justify-center gap-1 text-[10px]
                            cursor-pointer transition-all active:bg-white/[0.07]
                            disabled:opacity-50
                          "
                          onClick={() => openPicker('seedance')}
                          disabled={uploading}
                        >
                          {uploading && uploadTarget.current === 'seedance' ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Upload size={20} />
                          )}
                          <span>Добавить</span>
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                      {isSeedance15
                        ? 'Без фото — видео по тексту. С 1-2 фото — оживление кадра / переход.'
                        : `До ${seedanceMaxImages} фото. Ссылайтесь в промпте через @Image1, @Image2…`}
                    </div>
                  </Field>

                  {isSeedance25 && (
                    <>
                      <Field label={<><Film size={12} /> Начальный / конечный кадр (опц.)</>}>
                        <div className="grid grid-cols-2 gap-2.5">
                          <FrameSlot
                            label="Старт"
                            url={seedanceFirstFrame}
                            uploading={uploading && uploadTarget.current === 'seedance-first'}
                            onUpload={() => triggerUpload('seedance-first')}
                            onRemove={() => setSeedanceFirstFrame('')}
                          />
                          <FrameSlot
                            label="Конец"
                            url={seedanceLastFrame}
                            uploading={uploading && uploadTarget.current === 'seedance-last'}
                            onUpload={() => {
                              if (!seedanceFirstFrame) {
                                toast.warning('Сначала загрузите начальный кадр')
                                return
                              }
                              triggerUpload('seedance-last')
                            }}
                            onRemove={() => setSeedanceLastFrame('')}
                          />
                        </div>
                        <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                          Отдельно от референс-фото выше. Задаёт конкретный начальный и/или
                          конечный кадр видео (переход между ними). Необязательно.
                        </div>
                      </Field>

                      <Field label={<><ImageIcon size={12} /> Вернуть последний кадр</>}>
                        <ToggleRow
                          active={seedanceReturnLastFrame}
                          onLabel={<>✅ Да</>}
                          offLabel={<>— Нет</>}
                          onChange={(v) => { setSeedanceReturnLastFrame(v); haptic('light') }}
                        />
                        <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                          Дополнительно получить кадр окончания видео как изображение
                          (удобно для продолжения ролика).
                        </div>
                      </Field>

                      <Field label={<><FileText size={12} /> Формат файла</>}>
                        <Grid cols={2}>
                          <OptBtn
                            active={seedanceOutputFormat === 'mp4'}
                            onClick={() => { setSeedanceOutputFormat('mp4'); haptic('light') }}
                          >
                            MP4
                          </OptBtn>
                          <OptBtn
                            active={seedanceOutputFormat === 'mov'}
                            onClick={() => { setSeedanceOutputFormat('mov'); haptic('light') }}
                          >
                            MOV
                          </OptBtn>
                        </Grid>
                      </Field>
                    </>
                  )}

                  {/* 1.5 Pro: фиксированная камера */}
                  {isSeedance15 && (
                    <Field label={<><Video size={12} /> Камера</>}>
                      <ToggleRow
                        active={fixedLens}
                        onLabel={<>🔒 Фиксированная</>}
                        offLabel={<>🎥 Динамичная</>}
                        onChange={(v) => { setFixedLens(v); haptic('light') }}
                      />
                      <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                        Фиксированная — камера статична. Динамичная — движется по сцене.
                      </div>
                    </Field>
                  )}

                  {/* 2 / 2-fast: web search */}
                  {isSeedance2 && (
                    <Field label={<><Sparkles size={12} /> Онлайн-поиск</>}>
                      <ToggleRow
                        active={webSearch}
                        onLabel={<>🌐 Включён</>}
                        offLabel={<>📴 Выключен</>}
                        onChange={(v) => { setWebSearch(v); haptic('light') }}
                      />
                      <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                        Модель ищет актуальную информацию в интернете для генерации.
                      </div>
                    </Field>
                  )}

                  {/* 2 / 2-fast: видео-референсы */}
                  {isSeedance2 && (
                    <Field label={<><Film size={12} /> Видео-референсы ({refVideos.length}/3)</>}>
                      <div className="grid grid-cols-3 gap-2">
                        {refVideos.map((url, idx) => (
                          <div
                            key={url + idx}
                            className="relative aspect-video rounded-[10px] overflow-hidden border border-white/[0.08]"
                          >
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <video
                              src={url}
                              className="w-full h-full object-cover bg-black block"
                              muted
                              playsInline
                            />
                            <button
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                              onClick={() => {
                                setRefVideos((p) => p.filter((_, i) => i !== idx))
                                setRefVideoDurations((p) => p.filter((_, i) => i !== idx)) // 🆕
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {refVideos.length < 3 && (
                          <button
                            className="
                              aspect-video rounded-[10px]
                              border-[1.5px] border-dashed border-white/[0.12]
                              bg-white/[0.03] text-white/30
                              flex flex-col items-center justify-center gap-1 text-[10px]
                              cursor-pointer transition-all active:bg-white/[0.07]
                              disabled:opacity-50
                            "
                            onClick={() => refVideoFileRef.current?.click()}
                            disabled={uploadingRefVideo}
                          >
                            {uploadingRefVideo ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Upload size={18} />
                            )}
                            <span>Видео</span>
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                        MP4/MOV, до 50MB. Суммарно ≤ 15 секунд.
                        {refVideos.length > 0 && refVideoSeconds > 0 && (
                          <span className="text-[var(--accent-yellow)]/70">
                            {' '}Учтено: {refVideoSeconds}с → тарифицируются вместе с видео.
                          </span>
                        )}
                      </div>
                    </Field>
                  )}

                  {/* 2 / 2-fast: аудио-референсы */}
                  {isSeedance2 && (
                    <Field label={<><Volume2 size={12} /> Аудио-референсы ({refAudios.length}/3)</>}>
                      <div className="flex flex-col gap-1.5">
                        {refAudios.map((url, idx) => (
                          <div
                            key={url + idx}
                            className="flex items-center gap-2 py-1.5 px-2 rounded-[8px] border border-white/[0.08] bg-white/[0.03]"
                          >
                            <Volume2 size={14} className="text-white/40 shrink-0" />
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <audio src={url} className="flex-1 min-w-0 h-7" controls />
                            <button
                              className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"
                              onClick={() => setRefAudios((p) => p.filter((_, i) => i !== idx))}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        {refAudios.length < 3 && (
                          <button
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] border-[1.5px] border-dashed border-white/[0.12] bg-white/[0.02] text-white/40 text-[12px] cursor-pointer transition-all active:bg-white/[0.06] disabled:opacity-50"
                            onClick={() => refAudioFileRef.current?.click()}
                            disabled={uploadingRefAudio}
                          >
                            {uploadingRefAudio ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Plus size={16} />
                            )}
                            Добавить аудио
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                        MP3/WAV/AAC/OGG, до 10MB. Суммарно ≤ 15 секунд.
                      </div>
                    </Field>
                  )}
                </>
              )}

              {/* 🆕 Omni: видео-референс (1 шт) — включает фикс. цену */}
              {isOmni && (
                <Field label={<><Film size={12} /> Видео-референс ({refVideos.length}/1)</>}>
                  <div className="grid grid-cols-3 gap-2">
                    {refVideos.map((url, idx) => (
                      <div
                        key={url + idx}
                        className="relative aspect-video rounded-[10px] overflow-hidden border border-white/[0.08]"
                      >
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          src={url}
                          className="w-full h-full object-cover bg-black block"
                          muted
                          playsInline
                        />
                        <button
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                          onClick={() => {
                            setRefVideos((p) => p.filter((_, i) => i !== idx))
                            setRefVideoDurations((p) => p.filter((_, i) => i !== idx))
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {refVideos.length < 1 && (
                      <button
                        className="
                          aspect-video rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1 text-[10px]
                          cursor-pointer transition-all active:bg-white/[0.07]
                          disabled:opacity-50
                        "
                        onClick={() => refVideoFileRef.current?.click()}
                        disabled={uploadingRefVideo}
                      >
                        {uploadingRefVideo ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Upload size={18} />
                        )}
                        <span>Видео</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                    MP4/MOV, до 50MB. С видео цена фиксированная и не зависит
                    от длительности.
                  </div>
                </Field>
              )}

              {/* ═══ SORA 2 / SORA 2 PRO ═══ */}
              {isSora && (
                <Field
                  label={
                    <>
                      <ImageIcon size={12} /> Референс-изображения ({soraImages.length}/{soraMaxImages})
                    </>
                  }
                >
                  <div className="grid grid-cols-4 gap-2">
                    {soraImages.map((url, idx) => (
                      <div key={url + idx} className="relative aspect-square rounded-[10px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
                        />
                        <span className="absolute bottom-1 left-1 text-[9px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <button
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
                          onClick={() =>
                            setSoraImages((p) => p.filter((_, i) => i !== idx))
                          }
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {soraImages.length < soraMaxImages && (
                      <button
                        className="
                          aspect-square rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1 text-[10px]
                          cursor-pointer transition-all active:bg-white/[0.07]
                          disabled:opacity-50
                        "
                        onClick={() => openPicker('sora')}
                        disabled={uploading}
                      >
                        {uploading && uploadTarget.current === 'sora' ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Upload size={20} />
                        )}
                        <span>Добавить</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                    До {soraMaxImages} референсов. Без фото — генерация по тексту.
                  </div>
                </Field>
              )}

              {/* ─── Обычные модели: одиночное изображение ─── */}
              {!isVeo && !isKling && !isKling25 && !isMotion && !isSeedance && !isSora && caps.supportsImageInput && (
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

              {/* ─── Resize Mode ─── */}
              {caps.supportsResizeMode && (imgUrl || soraImages.length > 0) && (
                <Field label={<><Scissors size={12} /> Вписывание фото</>}>
                  <Grid cols={2}>
                    <OptBtn
                      active={resizeMode === 'crop'}
                      onClick={() => { setResizeMode('crop'); haptic('light') }}
                    >
                      ✂️ Обрезать
                    </OptBtn>
                    <OptBtn
                      active={resizeMode === 'pad'}
                      onClick={() => { setResizeMode('pad'); haptic('light') }}
                    >
                      🔲 С полями
                    </OptBtn>
                  </Grid>
                  <div className="text-[10px] text-white/30 mt-1 leading-relaxed">
                    Crop — обрезает края под формат. Pad — добавляет поля по бокам.
                  </div>
                </Field>
              )}

              {/* 🆕 Кнопка ОК — завершает настройки */}
              <button
                className="
                  mt-1 w-full py-3 rounded-[var(--radius-xs)]
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

      {/* Скрытый image input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        // Переключается в triggerUpload под конкретную цель: референсы
        // и наборы фото принимают несколько файлов, одиночные слоты — нет.
        multiple={allowMultiUpload}
        className="hidden"
        onChange={(e) => {
          uploadBatch(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Выбор из истории; цель уже записана в uploadTarget через openPicker */}
      <MediaPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        maxSelect={pickerMax}
        onPick={addPickedUrls}
        onUploadInstead={() => triggerUpload(uploadTarget.current)}
      />

      {/* Скрытый video input (Motion Control) */}
      <input
        ref={videoFileRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadVideo(f)
          e.target.value = ''
        }}
      />

      {/* Seedance: video reference input */}
      <input
        ref={refVideoFileRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadRefVideo(f)
          e.target.value = ''
        }}
      />

      {/* Seedance: audio reference input */}
      <input
        ref={refAudioFileRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/aac,audio/ogg,.mp3,.wav,.aac,.ogg,.m4a"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadRefAudio(f)
          e.target.value = ''
        }}
      />

      <input
        ref={topazVideoFileRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadTopazVideo(f)
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
          const chips: { url: string; label: string; onRemove: () => void }[] = []
          if (isVeo) {
            if (veoMode === 'frames') {
              if (startFrame) chips.push({ url: startFrame, label: 'Старт', onRemove: () => setStartFrame('') })
              if (endFrame) chips.push({ url: endFrame, label: 'Конец', onRemove: () => setEndFrame('') })
            } else if (veoMode === 'reference' && supportsReference) {
              refImages.forEach((url, idx) =>
                chips.push({
                  url,
                  label: `Реф ${idx + 1}`,
                  onRemove: () => setRefImages((p) => p.filter((_, i) => i !== idx)),
                }),
              )
            }
          } else if (isKling) {
            if (startFrame)
              chips.push({ url: startFrame, label: 'Старт', onRemove: () => setStartFrame('') })
            if (!multiShots && endFrame)
              chips.push({ url: endFrame, label: 'Конец', onRemove: () => setEndFrame('') })
            elements.forEach((el, idx) => {
              if (el.urls[0]) {
                chips.push({
                  url: el.urls[0],
                  label: el.name ? `@${el.name}` : `Элемент ${idx + 1}`,
                  onRemove: () => setElements((p) => p.filter((_, i) => i !== idx)),
                })
              }
            })
          } else if (isKling25) {
            if (imgUrl) chips.push({ url: imgUrl, label: 'Старт', onRemove: () => setImgUrl('') })
            if (endFrame) chips.push({ url: endFrame, label: 'Конец', onRemove: () => setEndFrame('') })
          } else if (isMotion) {
            if (imgUrl) chips.push({ url: imgUrl, label: 'Фото', onRemove: () => setImgUrl('') })
          } else if (isSeedance) {
            seedanceImages.forEach((url, idx) =>
              chips.push({
                url,
                label: isSeedance2 ? `@Image${idx + 1}` : `Фото ${idx + 1}`,
                onRemove: () => setSeedanceImages((p) => p.filter((_, i) => i !== idx)),
              }),
            )
            // 🆕 first/last кадр Seedance 2.5
            if (isSeedance25 && seedanceFirstFrame) {
              chips.push({ url: seedanceFirstFrame, label: 'Старт', onRemove: () => setSeedanceFirstFrame('') })
            }
            if (isSeedance25 && seedanceLastFrame) {
              chips.push({ url: seedanceLastFrame, label: 'Конец', onRemove: () => setSeedanceLastFrame('') })
            }
          } else if (isSora) {
            // 🆕 чипы из множественной галереи Sora
            soraImages.forEach((url, idx) =>
              chips.push({
                url,
                label: `Реф ${idx + 1}`,
                onRemove: () => setSoraImages((p) => p.filter((_, i) => i !== idx)),
              }),
            )
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
          {/* Кнопка загрузки */}
          {((isVeo && veoMode !== 'text') ||
            (!isVeo && !isKling && !isMotion && !isSeedance && !isSora && caps.supportsImageInput) ||
            (isKling25) ||
            (isSeedance) ||
            (isSora)) && (
              <button
                className="
                w-9 h-9 rounded-full
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)]
                flex items-center justify-center
                cursor-pointer shrink-0 transition-all duration-150
                [-webkit-tap-highlight-color:transparent]
                active:bg-[rgba(250,204,21,0.1)]
                active:border-[rgba(250,204,21,0.3)]
                active:text-[var(--accent-yellow)]
                active:scale-90
                disabled:opacity-50 disabled:cursor-not-allowed
              "
                // Цель выбирается так же, как при перетаскивании файла.
                onClick={() => openPicker(dropTarget())}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
            )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={
              isTopaz
                ? 'Промпт не нужен — загрузите видео и нажмите отправить'
                : isKling && multiShots
                ? 'Общий стиль / контекст (опционально)…'
                : isMotion
                  ? 'Опишите сцену (опц., улучшает результат)…'
                  : isSeedance2 && seedanceImages.length > 0
                    ? 'Описание со ссылками на @Image1, @Image2…'
                    : 'Опишите видео...'
            }
            rows={1}
            className="
              flex-1 min-h-9 max-h-[120px]
              py-2 px-3 rounded-[18px]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass)]
              text-white text-[14px] font-[inherit]
              outline-none resize-none
              transition-all duration-200
              placeholder:text-[var(--gray-600)]
              focus:border-[var(--accent-yellow)]
              focus:bg-[rgba(250,204,21,0.05)]
              focus:shadow-[0_0_0_3px_rgba(250,204,21,0.1)]
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            "
          />

          <button
            className={`
              w-9 h-9 rounded-full border-none shrink-0
              flex items-center justify-center
              transition-all duration-200 ease-out
              [-webkit-tap-highlight-color:transparent]
              ${genDisabled
                ? 'bg-white/[0.08] text-[var(--gray-600)] cursor-not-allowed'
                : 'bg-[var(--accent-yellow)] text-black cursor-pointer active:scale-95 active:bg-[var(--accent-yellow-bright)]'
              }
            `}
            onClick={doGen}
            disabled={genDisabled}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Helper components ─── */

function Field({
  label,
  children,
  priceHint,
}: {
  label: React.ReactNode
  children: React.ReactNode
  priceHint?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white/45">
        {label}
        {priceHint && (
          <span className="ml-auto text-[9px] text-white/30 normal-case tracking-normal">
            влияет на цену
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  const cls =
    cols === 1 ? 'grid-cols-1'
      : cols === 2 ? 'grid-cols-2'
        : cols === 3 ? 'grid-cols-3'
          : 'grid-cols-4'
  return <div className={`grid ${cls} gap-1.5`}>{children}</div>
}

function OptBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        py-2.5 px-2.5 rounded-[var(--radius-xs)] text-[12px] font-medium
        border transition-all duration-150 [-webkit-tap-highlight-color:transparent]
        ${disabled
          ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-white/30'
          : active
            ? 'bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.35)] text-[var(--accent-yellow)] active:scale-[0.97]'
            : 'bg-white/[0.03] border-white/[0.06] text-white/55 active:scale-[0.97] active:bg-white/[0.06]'
        }
      `}
    >
      {children}
    </button>
  )
}

function IconOptBtn({
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
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1
        py-2.5 px-2 rounded-[var(--radius-xs)] text-[11px] font-medium
        border transition-all duration-150 [-webkit-tap-highlight-color:transparent]
        ${active
          ? 'bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.35)] text-[var(--accent-yellow)]'
          : 'bg-white/[0.03] border-white/[0.06] text-white/55 active:bg-white/[0.06] active:scale-[0.97]'
        }
      `}
    >
      {icon}
      <span className="leading-none">{label}</span>
    </button>
  )
}

function AROptBtn({
  active,
  orient,
  label,
  onClick,
}: {
  active: boolean
  orient: AROrient
  label: string
  onClick: () => void
}) {
  const box =
    orient === 'landscape' ? 'w-5 h-3.5'
      : orient === 'portrait' ? 'w-3.5 h-5'
        : 'w-4 h-4'
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1
        py-2.5 px-2 rounded-[var(--radius-xs)] text-[11px] font-medium
        border transition-all duration-150 [-webkit-tap-highlight-color:transparent]
        ${active
          ? 'bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.35)] text-[var(--accent-yellow)]'
          : 'bg-white/[0.03] border-white/[0.06] text-white/55 active:bg-white/[0.06] active:scale-[0.97]'
        }
      `}
    >
      <div className={`${box} rounded-[2px] border-[1.5px] border-current opacity-70`} />
      <span className="leading-none">{label}</span>
    </button>
  )
}

function ResOptBtn({
  active,
  label,
  sub,
  tier,
  disabled,
  onClick,
}: {
  active: boolean
  label: string
  sub?: string
  tier: number
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center gap-0.5
        py-2.5 px-2 rounded-[var(--radius-xs)]
        border transition-all duration-150 [-webkit-tap-highlight-color:transparent]
        ${disabled
          ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-white/30'
          : active
            ? 'bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.35)] text-[var(--accent-yellow)] active:scale-[0.97]'
            : 'bg-white/[0.03] border-white/[0.06] text-white/55 active:bg-white/[0.06] active:scale-[0.97]'
        }
      `}
    >
      <span className="text-[12px] font-semibold leading-none">{label}</span>
      {sub && <span className="text-[9px] opacity-60 leading-none">{sub}</span>}
      <div className="flex gap-0.5 mt-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`w-1 h-1 rounded-full ${i < tier ? 'bg-current' : 'bg-current opacity-20'}`}
          />
        ))}
      </div>
    </button>
  )
}

function ToggleRow({
  active,
  onLabel,
  offLabel,
  onChange,
}: {
  active: boolean
  onLabel: React.ReactNode
  offLabel: React.ReactNode
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`
        relative w-full h-11 rounded-[var(--radius-xs)]
        border transition-all duration-300
        [-webkit-tap-highlight-color:transparent]
        overflow-hidden
        ${active
          ? 'bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.25)]'
          : 'bg-white/[0.03] border-white/[0.06]'
        }
      `}
    >
      {/* Скользящий индикатор */}
      <div
        className={`
          absolute top-1 bottom-1 w-[calc(50%-4px)]
          rounded-[8px]
          transition-all duration-300 ease-out
          ${active
            ? 'left-[calc(50%+0px)] bg-[rgba(250,204,21,0.18)] shadow-[0_2px_8px_rgba(250,204,21,0.15)]'
            : 'left-1 bg-white/[0.06]'
          }
        `}
      />

      {/* Лейблы */}
      <div className="relative grid grid-cols-2 h-full items-center">
        <span
          className={`
            flex items-center justify-center gap-1.5
            text-[12px] font-medium leading-none
            transition-colors duration-200
            ${!active ? 'text-white/85' : 'text-white/35'}
          `}
        >
          {offLabel}
        </span>
        <span
          className={`
            flex items-center justify-center gap-1.5
            text-[12px] font-medium leading-none
            transition-colors duration-200
            ${active ? 'text-[var(--accent-yellow)]' : 'text-white/35'}
          `}
        >
          {onLabel}
        </span>
      </div>
    </button>
  )
}

function DurationSlider({
  values,
  value,
  onChange,
  isDisabled,
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
  isDisabled?: (d: number) => boolean
}) {
  // Сортируем значения по возрастанию для корректной работы слайдера
  const sortedValues = useMemo(() => [...values].sort((a, b) => a - b), [values])

  // Текущий индекс выбранного значения
  const currentIdx = Math.max(0, sortedValues.indexOf(value))

  const min = 0
  const max = sortedValues.length - 1

  const handleChange = (idx: number) => {
    const next = sortedValues[idx]
    if (next === undefined) return
    // Если этот шаг недоступен — ищем ближайший доступный
    if (isDisabled?.(next)) {
      // Пытаемся вправо
      for (let i = idx + 1; i < sortedValues.length; i++) {
        if (!isDisabled(sortedValues[i])) {
          onChange(sortedValues[i])
          return
        }
      }
      // Потом влево
      for (let i = idx - 1; i >= 0; i--) {
        if (!isDisabled(sortedValues[i])) {
          onChange(sortedValues[i])
          return
        }
      }
      return
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Текущее значение */}
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>{sortedValues[0]}с</span>
        <span className="text-[14px] text-[var(--accent-yellow)] font-bold tabular-nums">
          {value}с
        </span>
        <span>{sortedValues[sortedValues.length - 1]}с</span>
      </div>

      {/* Ползунок */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={currentIdx}
        onChange={(e) => handleChange(parseInt(e.target.value, 10))}
        className="w-full accent-[var(--accent-yellow)] cursor-pointer"
      />

      {/* Метки шагов под ползунком */}
      <div className="flex justify-between px-1 -mt-1">
        {sortedValues.map((v) => {
          const disabled = isDisabled?.(v) ?? false
          const active = v === value
          return (
            <button
              key={v}
              onClick={() => !disabled && onChange(v)}
              disabled={disabled}
              className={`
                text-[10px] font-medium tabular-nums leading-none
                transition-colors duration-150
                [-webkit-tap-highlight-color:transparent]
                ${disabled
                  ? 'text-white/15 cursor-not-allowed'
                  : active
                    ? 'text-[var(--accent-yellow)]'
                    : 'text-white/35 active:text-white/60'
                }
              `}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CfgSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>Свобода</span>
        <span className="text-[var(--accent-yellow)] font-semibold tabular-nums">
          {value.toFixed(1)}
        </span>
        <span>Точность</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent-yellow)]"
      />
    </div>
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
  if (url) {
    return (
      <div className="relative aspect-square rounded-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
        />
        <button
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
          onClick={onRemove}
        >
          <X size={12} />
        </button>
        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
          {label}
        </span>
      </div>
    )
  }
  return (
    <button
      onClick={onUpload}
      disabled={uploading}
      className="
        aspect-square rounded-[10px]
        border-[1.5px] border-dashed border-white/[0.12]
        bg-white/[0.03] text-white/30
        flex flex-col items-center justify-center gap-1 text-[10px]
        cursor-pointer transition-all
        active:bg-white/[0.07] active:border-white/[0.22]
        disabled:opacity-50
      "
    >
      {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
      <span>{label}</span>
    </button>
  )
}

function ShotEditor({
  index,
  prompt,
  duration,
  canRemove,
  onPrompt,
  onDuration,
  onRemove,
}: {
  index: number
  prompt: string
  duration: number
  canRemove: boolean
  onPrompt: (v: string) => void
  onDuration: (v: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/60">Шот #{index + 1}</span>
        {canRemove && (
          <button
            className="w-5 h-5 rounded-full bg-white/[0.06] text-white/40 flex items-center justify-center active:bg-red-500/30 active:text-red-300"
            onClick={onRemove}
          >
            <X size={11} />
          </button>
        )}
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onPrompt(e.target.value)}
        rows={2}
        placeholder="Опишите этот шот..."
        maxLength={500}
        className="
          w-full px-2.5 py-2 rounded-[8px] resize-none
          border border-white/[0.08] bg-white/[0.03]
          text-[12px] text-white placeholder:text-white/30
          outline-none focus:border-[var(--accent-yellow)]
        "
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/40">Длительность</span>
        <div className="flex gap-1">
          {[3, 5, 8, 10].map((d) => (
            <button
              key={d}
              onClick={() => onDuration(d)}
              className={`
                py-1 px-2 rounded-[6px] text-[10px] font-semibold border transition-all
                ${duration === d
                  ? 'bg-[rgba(250,204,21,0.15)] border-[rgba(250,204,21,0.35)] text-[var(--accent-yellow)]'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/50'
                }
              `}
            >
              {d}с
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ElementEditor({
  index,
  name,
  description,
  urls,
  uploading,
  onName,
  onDescription,
  onAddImage,
  onRemoveImage,
  onRemove,
}: {
  index: number
  name: string
  description: string
  urls: string[]
  uploading: boolean
  onName: (v: string) => void
  onDescription: (v: string) => void
  onAddImage: () => void
  onRemoveImage: (idx: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/60">Элемент #{index + 1}</span>
        <button
          className="w-5 h-5 rounded-full bg-white/[0.06] text-white/40 flex items-center justify-center active:bg-red-500/30 active:text-red-300"
          onClick={onRemove}
        >
          <X size={11} />
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Имя (напр. CatHero)"
        maxLength={50}
        className="
          w-full px-2.5 py-2 rounded-[8px]
          border border-white/[0.08] bg-white/[0.03]
          text-[12px] text-white placeholder:text-white/30
          outline-none focus:border-[var(--accent-yellow)]
        "
      />
      <input
        value={description}
        onChange={(e) => onDescription(e.target.value)}
        placeholder="Описание (опц.)"
        maxLength={150}
        className="
          w-full px-2.5 py-2 rounded-[8px]
          border border-white/[0.08] bg-white/[0.03]
          text-[12px] text-white placeholder:text-white/30
          outline-none focus:border-[var(--accent-yellow)]
        "
      />
      <div className="grid grid-cols-4 gap-1.5">
        {urls.map((u, i) => (
          <div key={u + i} className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover rounded-[6px] border border-white/[0.08] block" />
            <button
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center z-[2]"
              onClick={() => onRemoveImage(i)}
            >
              <X size={9} />
            </button>
          </div>
        ))}
        {urls.length < 4 && (
          <button
            onClick={onAddImage}
            disabled={uploading}
            className="
              aspect-square rounded-[6px]
              border-[1.5px] border-dashed border-white/[0.12]
              bg-white/[0.03] text-white/30
              flex items-center justify-center cursor-pointer
              active:bg-white/[0.07] disabled:opacity-50
            "
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        )}
      </div>
      <div className="text-[9px] text-white/30">
        Нужно 2-4 фото. {urls.length}/4
      </div>
    </div>
  )
}