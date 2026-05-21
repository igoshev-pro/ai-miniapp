'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Wand2,
  Clock, Loader2, Upload, Mic, Volume2, Zap, MessageSquare,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { useModelUIConfig, type ModelUIConfig } from '@/hooks/useModelUIConfig'
import { usePriceCalculator } from '@/hooks/usePriceCalculator'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'
import { apiClient } from '@/lib/api'

/* ─── Props ─── */

interface Props {
  initialModel?: string
  onBack?: () => void
}

/* ─── Audio model types ─── */

type AudioType =
  | 'suno' | 'elevenlabs-tts' | 'elevenlabs-sfx'
  | 'elevenlabs-isolation' | 'elevenlabs-stt'
  | 'elevenlabs-dialogue' | 'generic'

interface AudioCaps {
  type: AudioType
  supportsCustomMode: boolean
  supportsInstrumental: boolean
  supportsStyle: boolean
  supportsDuration: boolean
  durationRange: [number, number]
  durationStep: number
  supportsVoice: boolean
  voices: string[]
  supportsLanguage: boolean
  languages: { code: string; label: string }[]
  supportsStability: boolean
  supportsSimilarity: boolean
  supportsAudioInput: boolean
  supportsLoop: boolean
  supportsPromptInfluence: boolean
  supportsSpeed: boolean
}

/* ─── Constants ─── */

const ELEVENLABS_VOICES = [
  'Aria','Roger','Sarah','Laura','Charlie','George','Callum','River',
  'Lily','Alice','Jessica','Daniel','Charlotte','Chris','Brian',
  'Matilda','Will','Liam','Bill',
]

const DEFAULT_VOICE = 'Aria'

const LANGUAGES = [
  { code:'ru', label:'Русский' }, { code:'en', label:'English' },
  { code:'es', label:'Español' }, { code:'fr', label:'Français' },
  { code:'de', label:'Deutsch' }, { code:'it', label:'Italiano' },
  { code:'pt', label:'Português' }, { code:'pl', label:'Polski' },
  { code:'hi', label:'हिन्दी' }, { code:'ja', label:'日本語' },
  { code:'ko', label:'한국어' }, { code:'zh', label:'中文' },
]

const EXAMPLES: Record<string, string[]> = {
  suno: [
    'Энергичный поп-трек о летних приключениях, яркий и позитивный',
    'Грустная фортепианная мелодия, дождь за окном, минор',
    'Электронный бит в стиле synthwave, ретро 80-х',
    'Джаз в стиле smooth jazz, саксофон, расслабляющий вечер',
  ],
  'elevenlabs-tts': [
    'Добро пожаловать в наш подкаст! Сегодня мы обсудим последние новости технологий.',
    'Привет! Как дела? Я так рад тебя видеть!',
    'В далёкой-далёкой галактике, где звёзды сияли ярче обычного...',
  ],
  'elevenlabs-dialogue': [
    'Aria: Привет! Как прошёл твой день?\nRoger: Отлично! Я сегодня закончил проект.\nAria: Здорово! Расскажи подробнее.',
    'Sarah: Ты слышал новости?\nCharlie: Нет, что случилось?\nSarah: Наша команда выиграла чемпионат!',
  ],
  'elevenlabs-sfx': [
    'Раскат грома во время сильной грозы',
    'Звук шагов по деревянному полу в пустой комнате',
    'Космический корабль взлетает с ракетной площадки',
  ],
  default: ['Опишите что хотите сгенерировать...'],
}

/* ─── Fallback caps по типу ─── */

const FALLBACK_BY_TYPE: Record<AudioType, AudioCaps> = {
  suno: {
    type:'suno', supportsCustomMode:true, supportsInstrumental:true, supportsStyle:true,
    supportsDuration:true, durationRange:[5,300], durationStep:5,
    supportsVoice:false, voices:[], supportsLanguage:false, languages:[],
    supportsStability:false, supportsSimilarity:false,
    supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
  },
  'elevenlabs-tts': {
    type:'elevenlabs-tts', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:false, durationRange:[0,0], durationStep:0,
    supportsVoice:true, voices:ELEVENLABS_VOICES,
    supportsLanguage:true, languages:LANGUAGES,
    supportsStability:true, supportsSimilarity:true,
    supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:true,
  },
  'elevenlabs-dialogue': {
    type:'elevenlabs-dialogue', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:false, durationRange:[0,0], durationStep:0,
    supportsVoice:false, voices:[],
    supportsLanguage:true, languages:LANGUAGES,
    supportsStability:true, supportsSimilarity:false,
    supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
  },
  'elevenlabs-sfx': {
    type:'elevenlabs-sfx', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:true, durationRange:[1,30], durationStep:1,
    supportsVoice:false, voices:[], supportsLanguage:false, languages:[],
    supportsStability:false, supportsSimilarity:false,
    supportsAudioInput:false, supportsLoop:true, supportsPromptInfluence:true, supportsSpeed:false,
  },
  'elevenlabs-isolation': {
    type:'elevenlabs-isolation', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:false, durationRange:[0,0], durationStep:0,
    supportsVoice:false, voices:[], supportsLanguage:false, languages:[],
    supportsStability:false, supportsSimilarity:false,
    supportsAudioInput:true, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
  },
  'elevenlabs-stt': {
    type:'elevenlabs-stt', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:false, durationRange:[0,0], durationStep:0,
    supportsVoice:false, voices:[],
    supportsLanguage:true, languages:LANGUAGES,
    supportsStability:false, supportsSimilarity:false,
    supportsAudioInput:true, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
  },
  generic: {
    type:'generic', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
    supportsDuration:false, durationRange:[0,0], durationStep:0,
    supportsVoice:false, voices:[], supportsLanguage:false, languages:[],
    supportsStability:false, supportsSimilarity:false,
    supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
  },
}

/* ─── Helpers ─── */

function detectType(slug: string): AudioType {
  if (slug.includes('suno')) return 'suno'
  if (slug.includes('dialogue')) return 'elevenlabs-dialogue'
  if (slug.includes('isolation')) return 'elevenlabs-isolation'
  if (slug.includes('stt') || slug.includes('speech-to-text')) return 'elevenlabs-stt'
  if (slug.includes('sfx') || slug.includes('sound')) return 'elevenlabs-sfx'
  if (slug.includes('elevenlabs') || slug.includes('tts')) return 'elevenlabs-tts'
  return 'generic'
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

export function AudioGenerationPage({ initialModel, onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const audioModels = useMemo(
    () => allModels.filter((m: any) => m.category === 'audio'),
    [allModels],
  )

  /* ── State ── */

  const [input, setInput] = useState('')

  const resolveInitialSlug = useCallback((): string => {
    if (initialModel) {
      const norm = initialModel.toLowerCase().trim()
      const byExact = audioModels.find(
        (m: any) => m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
      )
      if (byExact) return byExact.slug
    }
    return audioModels[0]?.slug ?? ''
  }, [initialModel, audioModels])

  const [slug, setSlug] = useState<string>(() => resolveInitialSlug())
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Suno
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)

  // TTS
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE)
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)
  const [speed, setSpeed] = useState(100)

  // SFX
  const [loop, setLoop] = useState(false)
  const [promptInfluence, setPromptInfluence] = useState(30)

  // Audio input
  const [audioUrl, setAudioUrl] = useState('')
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const [syncedSlug, setSyncedSlug] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)
  const initialAppliedRef = useRef(false)

  const currentModel = audioModels.find((m: any) => m.slug === slug)
  const modelMinCost = currentModel?.cost || 5

  /* ── UI config from backend ── */

  const { config: uiConfig, isLoading: isLoadingConfig } = useModelUIConfig(slug)

  /* ── Caps (тип по slug + параметры из бэка / fallback) ── */

  const caps = useMemo<AudioCaps>(() => {
    const type = detectType(slug)
    const fb = FALLBACK_BY_TYPE[type]

    if (!uiConfig) return fb

    // параметры из бэка
    const voicesBackend = getParamOptions(uiConfig, 'voiceId')
    const languagesBackend = getParamOptions(uiConfig, 'language')
    const durationBackend = getNumericOptions(uiConfig, 'duration')
    const inputCap = (uiConfig.inputCapabilities || {}) as any

    const languagesMerged = languagesBackend.length
      ? languagesBackend.map((code) => ({
          code,
          label: LANGUAGES.find((l) => l.code === code)?.label || code,
        }))
      : fb.languages

    // durationRange из бэка, если задан
    let durationRange = fb.durationRange
    let durationStep = fb.durationStep
    if (durationBackend.length >= 2) {
      durationRange = [Math.min(...durationBackend), Math.max(...durationBackend)]
      durationStep = durationBackend.length > 1
        ? Math.max(1, Math.abs(durationBackend[1] - durationBackend[0]))
        : fb.durationStep
    }

    return {
      ...fb,
      voices: voicesBackend.length ? voicesBackend : fb.voices,
      languages: languagesMerged,
      supportsLanguage: fb.supportsLanguage || languagesBackend.length > 0,
      supportsVoice: fb.supportsVoice || voicesBackend.length > 0,
      supportsDuration: fb.supportsDuration || durationBackend.length > 0,
      durationRange,
      durationStep,
      supportsStability: fb.supportsStability || hasParam(uiConfig, 'stability'),
      supportsSimilarity: fb.supportsSimilarity || hasParam(uiConfig, 'similarity'),
      supportsSpeed: fb.supportsSpeed || hasParam(uiConfig, 'speed'),
      supportsLoop: fb.supportsLoop || hasParam(uiConfig, 'loop'),
      supportsPromptInfluence: fb.supportsPromptInfluence || hasParam(uiConfig, 'promptInfluence'),
      supportsInstrumental: fb.supportsInstrumental || hasParam(uiConfig, 'instrumental'),
      supportsStyle: fb.supportsStyle || hasParam(uiConfig, 'style'),
      supportsCustomMode: fb.supportsCustomMode || hasParam(uiConfig, 'customMode'),
      supportsAudioInput: fb.supportsAudioInput || inputCap?.acceptsAudio === true,
    }
  }, [uiConfig, slug])

  /* ── Price calculator ── */

  const priceParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (caps.type === 'suno') {
      if (caps.supportsDuration) p.duration = duration
      if (caps.supportsCustomMode) p.customMode = customMode
      if (caps.supportsInstrumental) p.instrumental = instrumental
    }
    if (caps.type === 'elevenlabs-tts') {
      if (caps.supportsVoice && voiceId) p.voiceId = voiceId
      if (caps.supportsLanguage && language) p.language = language
    }
    if (caps.type === 'elevenlabs-dialogue') {
      if (caps.supportsLanguage && language) p.language = language
      // ориентир по числу реплик
      const lines = input.split('\n').filter((l) => l.trim() && l.includes(':')).length
      if (lines > 0) p.lines = lines
    }
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) p.duration = duration
      if (caps.supportsLoop) p.loop = loop
    }
    if (caps.supportsAudioInput && audioUrl) p.hasInputAudio = true
    // приблизительная длина текста для TTS (по символам)
    if (caps.type === 'elevenlabs-tts' && input) p.chars = input.length
    return p
  }, [
    caps, duration, customMode, instrumental,
    voiceId, language, loop, audioUrl, input,
  ])

  const { price, isCalculating } = usePriceCalculator(slug, priceParams, {
    enabled: !!uiConfig && syncedSlug === slug && !!slug,
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
    if (!initialModel || audioModels.length === 0) return

    const norm = initialModel.toLowerCase().trim()
    const match = audioModels.find(
      (m: any) => m.slug?.toLowerCase() === norm || m.name?.toLowerCase() === norm,
    )
    if (match) {
      if (match.slug !== slug) {
        setSyncedSlug(null)
        setSlug(match.slug)
      }
      initialAppliedRef.current = true
    }
  }, [initialModel, audioModels, slug])

  // Если slug пуст — взять первый доступный
  useEffect(() => {
    if (!slug && audioModels.length > 0) {
      setSyncedSlug(null)
      setSlug(audioModels[0].slug)
    }
  }, [audioModels, slug])

  /* ── Telegram BackButton ── */

  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const h = () => {
      if (showSettings) { setShowSettings(false); return }
      if (showModelPicker) { setShowModelPicker(false); return }
      onBack?.()
    }
    webApp.BackButton.onClick(h)
    return () => {
      webApp.BackButton.offClick(h)
      webApp.BackButton.hide()
    }
  }, [webApp, onBack, showSettings, showModelPicker])

  /* ── Batch reset при смене модели/caps ── */

  useEffect(() => {
    if (!slug) return

    // defaults из бэка
    const defVoice = getDefault(uiConfig, 'voiceId') ?? caps.voices[0] ?? DEFAULT_VOICE
    const defLangCode =
      getDefault(uiConfig, 'language') ??
      caps.languages[0]?.code ??
      'ru'
    const defDurStr = getDefault(uiConfig, 'duration')
    const defDur = defDurStr
      ? Number(defDurStr)
      : caps.supportsDuration
        ? Math.min(30, caps.durationRange[1] || 30)
        : 30

    setInput('')
    setAudioUrl('')

    // Suno
    setCustomMode(false)
    setInstrumental(false)
    setStyle('')

    // common duration
    setDuration(defDur)

    // TTS / dialogue
    setVoiceId(defVoice)
    setLanguage(defLangCode)
    setStability(50)
    setSimilarity(75)
    setSpeed(100)

    // SFX
    setLoop(false)
    setPromptInfluence(30)

    setSyncedSlug(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, uiConfig])

  /* ── Misc ── */

  const audioGens = useMemo(
    () => generations.filter((g: any) => g.type === 'audio'),
    [generations],
  )

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    const max = caps.type === 'elevenlabs-dialogue' ? 200 : 120
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, max) + 'px'
  }, [input, caps.type])

  // Auto-scroll
  useEffect(() => {
    const el = resultsContainerRef.current
    if (!el) return
    if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
  }, [audioGens.length])

  /* ── Upload audio ── */

  const handleAudioUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Только аудиофайлы')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Макс 10MB')
      return
    }
    setUploadingAudio(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const resp = await apiClient.post('/upload/audio', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      const url = resp.data?.data?.url
      if (!url) throw new Error('Сервер не вернул URL')
      setAudioUrl(url)
      haptic('light')
      toast.success('Аудио загружено')
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка загрузки')
    } finally {
      setUploadingAudio(false)
    }
  }, [haptic])

  /* ── Insert voice name (dialogue) ── */

  const insertVoiceName = useCallback((voice: string) => {
    const ta = inputRef.current
    if (!ta) {
      setInput((prev) => {
        const t = prev.trimEnd()
        return t === '' ? `${voice}: ` : `${t}\n${voice}: `
      })
      haptic('light')
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = input.substring(0, start)
    const after = input.substring(end)
    const nl = before.length > 0 && !before.endsWith('\n')
    const ins = `${nl ? '\n' : ''}${voice}: `
    setInput(before + ins + after)
    setTimeout(() => {
      const pos = start + ins.length
      ta.selectionStart = pos
      ta.selectionEnd = pos
      ta.focus()
    }, 0)
    haptic('light')
  }, [input, haptic])

  /* ── Generate ── */

  const doGen = useCallback(async () => {
    const prompt = input.trim()
    if (caps.supportsAudioInput && !audioUrl) {
      toast.warning('Загрузите аудиофайл')
      return
    }
    if (!caps.supportsAudioInput && !prompt) {
      toast.warning('Введите текст')
      return
    }
    if (balance < displayedCost) {
      toast.warning(`Недостаточно спичек. Нужно ${displayedCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setIsGenerating(true)

    const settings: Record<string, unknown> = {}

    if (caps.type === 'suno') {
      if (caps.supportsCustomMode) settings.customMode = customMode
      if (caps.supportsInstrumental) settings.instrumental = instrumental
      if (caps.supportsStyle && style.trim()) settings.style = style.trim()
      if (caps.supportsDuration) settings.duration = duration
    }
    if (caps.type === 'elevenlabs-tts') {
      if (caps.supportsVoice) settings.voiceId = voiceId
      if (caps.supportsLanguage) settings.language = language
      if (caps.supportsStability) settings.stability = stability / 100
      if (caps.supportsSimilarity) settings.similarity = similarity / 100
      if (caps.supportsSpeed) settings.speed = speed / 100
    }
    if (caps.type === 'elevenlabs-dialogue') {
      if (caps.supportsStability) settings.stability = stability / 100
      if (caps.supportsLanguage && language) settings.language = language
    }
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) settings.duration = duration
      if (caps.supportsLoop) settings.loop = loop
      if (caps.supportsPromptInfluence) settings.promptInfluence = promptInfluence / 100
    }
    if (caps.supportsAudioInput && audioUrl) settings.audioUrl = audioUrl
    if (caps.type === 'elevenlabs-stt' && caps.supportsLanguage) settings.language = language

    let finalPrompt = prompt
    if (caps.supportsAudioInput && !finalPrompt) {
      finalPrompt = caps.type === 'elevenlabs-isolation' ? 'Audio isolation' : 'Speech to text'
    }

    const ok = await generate({ type:'audio', model:slug, prompt:finalPrompt, settings })

    setIsGenerating(false)
    if (ok) {
      setInput('')
      setAudioUrl('')
      hapticNotification('success')
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior:'smooth' }), 200)
    }
  }, [
    input, audioUrl, balance, displayedCost, slug, caps,
    customMode, instrumental, style, duration,
    voiceId, language, stability, similarity, speed,
    loop, promptInfluence,
    haptic, hapticNotification, generate,
  ])

  const onKey = (e: React.KeyboardEvent) => {
    if (caps.type === 'elevenlabs-dialogue') return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doGen()
    }
  }

  const insertExample = () => {
    const ex = EXAMPLES[caps.type] || EXAMPLES.default
    setInput(ex[Math.floor(Math.random() * ex.length)])
    haptic('light')
  }

  const canSend = !isGenerating && (
    caps.supportsAudioInput ? !!audioUrl : !!input.trim()
  )

  const placeholder = (() => {
    switch (caps.type) {
      case 'suno': return 'Опишите музыку...'
      case 'elevenlabs-tts': return 'Введите текст для озвучки...'
      case 'elevenlabs-dialogue': return 'Aria: Привет!\nRoger: Здравствуй...'
      case 'elevenlabs-sfx': return 'Опишите звуковой эффект...'
      case 'elevenlabs-isolation': return 'Загрузите аудио для обработки'
      case 'elevenlabs-stt': return 'Загрузите аудио для распознавания'
      default: return 'Введите текст...'
    }
  })()

  const typeLabel = (s: string): string => {
    const t = detectType(s)
    switch (t) {
      case 'suno': return '· Музыка'
      case 'elevenlabs-tts': return '· Озвучка'
      case 'elevenlabs-dialogue': return '· Диалог'
      case 'elevenlabs-sfx': return '· Звуки'
      case 'elevenlabs-isolation': return '· Изоляция'
      case 'elevenlabs-stt': return '· Распознавание'
      default: return ''
    }
  }

  const emptyTitle = (() => {
    switch (caps.type) {
      case 'suno': return 'Генерация музыки'
      case 'elevenlabs-tts': return 'Озвучка текста'
      case 'elevenlabs-dialogue': return 'Генерация диалога'
      case 'elevenlabs-sfx': return 'Звуковые эффекты'
      case 'elevenlabs-isolation': return 'Изоляция голоса'
      case 'elevenlabs-stt': return 'Распознавание речи'
      default: return 'Генерация аудио'
    }
  })()

  const emptyText = (() => {
    switch (caps.type) {
      case 'suno': return 'Опишите музыку, которую хотите создать. Генерация занимает до 2 минут.'
      case 'elevenlabs-tts': return 'Введите текст для озвучки. Выберите голос и язык в настройках.'
      case 'elevenlabs-dialogue': return 'Напишите диалог «Имя: текст». Нажмите на имя ниже для быстрой вставки.'
      case 'elevenlabs-sfx': return 'Опишите звуковой эффект, который нужно сгенерировать.'
      case 'elevenlabs-isolation': return 'Загрузите аудиофайл для удаления шума.'
      case 'elevenlabs-stt': return 'Загрузите аудиофайл для распознавания речи.'
      default: return 'Опишите что хотите сгенерировать.'
    }
  })()

  /* ── Quick params chips ── */
  const quickParams: { label: string; active?: boolean }[] = (() => {
    const out: { label: string; active?: boolean }[] = []
    if (caps.type === 'suno') {
      if (caps.supportsDuration) out.push({ label:`${duration} сек` })
      if (customMode) out.push({ label:'Custom', active:true })
      if (instrumental) out.push({ label:'Инструментал', active:true })
      if (style.trim()) out.push({ label:style.trim(), active:true })
    }
    if (caps.type === 'elevenlabs-tts') {
      out.push({ label:voiceId })
      out.push({ label: caps.languages.find((l) => l.code === language)?.label || language })
    }
    if (caps.type === 'elevenlabs-dialogue') {
      const lines = input.split('\n').filter((l) => l.trim() && l.includes(':')).length
      out.push({ label:`${lines} реплик` })
      out.push({ label: caps.languages.find((l) => l.code === language)?.label || language })
    }
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) out.push({ label:`${duration} сек` })
      if (loop) out.push({ label:'Зацикл.', active:true })
    }
    if (caps.supportsAudioInput) {
      out.push({ label: audioUrl ? '🎵 Аудио' : 'Нужен файл', active: !!audioUrl })
    }
    return out
  })()

  /* ── Helpers ── */

  const formatCost = (n: number) => (n % 1 === 0 ? n : n.toFixed(2))

  const switchModel = (newSlug: string) => {
    if (newSlug === slug) return
    setSyncedSlug(null)
    setSlug(newSlug)
  }

  /* ─── Loading state ─── */

  if (audioModels.length === 0) {
    return (
      <div
        className="
          fs-page
          fixed inset-0 z-[5] flex flex-col items-center justify-center
          bg-[var(--bg-primary,#08080a)]
          pt-[calc(var(--header-height)+var(--safe-area-top,0px))]
        "
      >
        <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in">
          <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
            <Music size={36} strokeWidth={1.5} />
          </div>
          <div className="text-[17px] font-semibold text-white/60">Загрузка...</div>
          <div className="text-[13px] text-white/30">Аудио модели загружаются</div>
        </div>
      </div>
    )
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
          px-4 pt-2.5 pb-1.5
          bg-[rgba(8,8,10,0.95)]
          backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]
          border-b border-white/[0.04]
        "
      >
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
          <Music size={14} className="text-[var(--gray-500)] shrink-0" />
          <span className="truncate">{currentModel?.name ?? slug}</span>

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
            {audioModels.map((m: any) => (
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
                    {m.provider} {typeLabel(m.slug)}
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

      {/* ── Quick params chips ── */}
      {(quickParams.length > 0 || (matchedLabel && !isFallbackPrice)) && (
        <div className="shrink-0 px-4 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickParams.map((p, i) => (
            <button
              key={i}
              onClick={() => { setShowSettings(true); haptic('light') }}
              className={`
                shrink-0 inline-flex items-center
                px-2.5 py-[3px] rounded-md
                border text-[11px] font-medium whitespace-nowrap
                cursor-pointer transition-all active:scale-[0.96]
                ${p.active
                  ? 'border-amber-400/30 bg-amber-400/[.08] text-amber-400'
                  : 'border-white/[0.07] bg-white/[0.04] text-white/35'
                }
              `}
            >
              {p.label}
            </button>
          ))}

          {matchedLabel && !isFallbackPrice && (
            <span
              className="
                shrink-0 py-1 px-2.5
                rounded-md
                bg-[rgba(250,204,21,0.06)]
                text-[var(--accent-yellow)]/70 text-[10px] font-medium
                ml-auto
              "
            >
              {matchedLabel}
            </span>
          )}
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
          {audioGens.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in fade-in--2">
              <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
                <Music size={36} strokeWidth={1.5} />
              </div>
              <div className="text-[17px] font-semibold text-white/60">{emptyTitle}</div>
              <div className="text-[13px] text-white/30 max-w-[280px] leading-[1.5]">{emptyText}</div>
              {!caps.supportsAudioInput && (
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
              )}
            </div>
          )}

                    {audioGens.map((gen: any) => (
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
                    type: 'audio',
                    model: gen.modelSlug,
                    prompt: gen.prompt,
                    settings: gen.settings,
                  })
                }
              />
            </div>
          ))}

          {isGenerating && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold py-1 px-2 rounded-[6px] bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] text-[var(--accent-yellow)]">
                  {currentModel?.name ?? slug}
                </span>
                <span className="text-[12px] text-[var(--gray-400)] flex-1 min-w-0 truncate">
                  {input || (audioUrl ? 'Обработка аудио...' : 'Генерация...')}
                </span>
              </div>
              <div
                className="
                  w-full max-w-[500px] mx-auto py-8
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
                  {caps.type === 'suno' ? 'Создаём музыку...' :
                   caps.type === 'elevenlabs-stt' ? 'Распознаём речь...' :
                   caps.type === 'elevenlabs-isolation' ? 'Очищаем аудио...' :
                   'Генерируем аудио...'}
                </div>
                <div className="text-[11px] text-white/40 relative z-10">
                  {caps.type === 'suno' ? 'Обычно 30–120 секунд' : 'Обычно до 30 секунд'}
                </div>
              </div>
            </div>
          )}

          <div ref={resultsEndRef} />
        </div>
      </div>

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
        {audioUrl && (
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
              <Mic size={12} />
              <span>Аудио загружено</span>
              <button
                className="
                  w-4 h-4 rounded-[4px] border-none
                  bg-white/[0.06] text-[var(--gray-500)]
                  flex items-center justify-center
                  cursor-pointer ml-0.5
                  active:bg-[rgba(239,68,68,0.2)] active:text-[var(--accent-red)]
                "
                onClick={() => { setAudioUrl(''); haptic('light') }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Voice quick-insert chips (dialogue) */}
        {caps.type === 'elevenlabs-dialogue' && caps.voices.length === 0 && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] pb-0.5">
            <span className="shrink-0 self-center text-[11px] text-white/40 mr-0.5">Голоса:</span>
            {ELEVENLABS_VOICES.map((v) => (
              <button
                key={v}
                onClick={() => insertVoiceName(v)}
                className="
                  shrink-0
                  text-[11px] py-[3px] px-2 rounded-lg
                  border border-white/[0.08] bg-white/[0.04]
                  text-white/55 cursor-pointer whitespace-nowrap
                  transition-all duration-150
                  active:scale-[0.96] active:bg-white/[0.08]
                "
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {caps.supportsAudioInput && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleAudioUpload(f)
                  e.target.value = ''
                }}
              />
              <button
                className={`
                  w-[38px] h-[38px] rounded-[10px] border-none
                  flex items-center justify-center
                  cursor-pointer transition-all duration-150
                  shrink-0 self-center
                  ${audioUrl
                    ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                    : 'bg-white/[0.04] text-[var(--gray-500)]'
                  }
                  active:scale-[0.92]
                  disabled:opacity-50 disabled:cursor-default
                `}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAudio}
              >
                {uploadingAudio ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
              </button>
            </>
          )}

          <textarea
            ref={inputRef}
            className={`
              flex-1 min-w-0 block align-middle
              py-[9px] px-3.5
              rounded-[var(--radius-sm)]
              border border-[var(--border-glass)]
              bg-white/[0.03]
              text-white text-[14px] font-[inherit]
              outline-none resize-none leading-[1.4]
              transition-[border-color] duration-200
              placeholder:text-[var(--gray-600)]
              focus:border-[rgba(250,204,21,0.2)]
              disabled:opacity-50
              ${caps.type === 'elevenlabs-dialogue'
                ? 'max-h-[200px] font-mono !text-[13px]'
                : 'max-h-[120px]'
              }
            `}
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={caps.type === 'elevenlabs-dialogue' ? 3 : 1}
            disabled={isGenerating || (caps.supportsAudioInput && caps.type !== 'elevenlabs-stt')}
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
            disabled={!canSend}
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="-ml-0.5" />
            )}
          </button>
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
                <div className="text-[15px] font-semibold text-white flex items-center gap-1.5">
                  <Music size={14} /> Настройки · {currentModel?.name}
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
              {/* ═══ SUNO ═══ */}
              {caps.type === 'suno' && (
                <>
                  {caps.supportsCustomMode && (
                    <Field label={<><Zap size={13} /> Режим</>}>
                      <Chips>
                        <Chip active={!customMode} onClick={() => { setCustomMode(false); haptic('light') }}>Авто</Chip>
                        <Chip active={customMode} onClick={() => { setCustomMode(true); haptic('light') }}>Custom Mode</Chip>
                      </Chips>
                    </Field>
                  )}

                  {caps.supportsInstrumental && (
                    <Field label={<><Volume2 size={13} /> Вокал</>}>
                      <Chips>
                        <Chip active={!instrumental} onClick={() => { setInstrumental(false); haptic('light') }}>С вокалом</Chip>
                        <Chip active={instrumental} onClick={() => { setInstrumental(true); haptic('light') }}>Инструментал</Chip>
                      </Chips>
                    </Field>
                  )}

                  {caps.supportsStyle && (
                    <Field label="🎨 Стиль" hint="pop, rock, jazz, electronic...">
                      <input
                        type="text"
                        className="
                          w-full py-[10px] px-3.5
                          rounded-[10px] border border-white/[0.08]
                          bg-white/[0.03] text-white text-[13px]
                          outline-none transition-[border-color] duration-200
                          placeholder:text-white/25
                          focus:border-amber-400/30
                          font-[inherit]
                        "
                        placeholder="Например: pop, energetic, upbeat"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                      />
                    </Field>
                  )}

                  {caps.supportsDuration && (
                    <Slider
                      label={<><Clock size={13} /> Длительность</>}
                      value={duration}
                      onChange={setDuration}
                      min={caps.durationRange[0]}
                      max={caps.durationRange[1]}
                      step={caps.durationStep}
                      unit="сек"
                      minLabel={`${caps.durationRange[0]} сек`}
                      maxLabel={`${caps.durationRange[1]} сек`}
                      priceHint
                    />
                  )}
                </>
              )}

              {/* ═══ TTS ═══ */}
              {caps.type === 'elevenlabs-tts' && (
                <>
                  {caps.supportsVoice && (
                    <Field label={<><Mic size={13} /> Голос</>}>
                      <ChipsWrap>
                        {caps.voices.map((v) => (
                          <Chip key={v} active={voiceId === v} onClick={() => { setVoiceId(v); haptic('light') }}>
                            {v}
                          </Chip>
                        ))}
                      </ChipsWrap>
                    </Field>
                  )}

                  {caps.supportsLanguage && (
                    <Field label="🌐 Язык">
                      <ChipsWrap>
                        {caps.languages.map((l) => (
                          <Chip key={l.code} active={language === l.code} onClick={() => { setLanguage(l.code); haptic('light') }}>
                            {l.label}
                          </Chip>
                        ))}
                      </ChipsWrap>
                    </Field>
                  )}

                  {caps.supportsStability && (
                    <Slider
                      label="Стабильность"
                      hint="Низкая = эмоциональнее"
                      value={stability}
                      onChange={setStability}
                      min={0} max={100} step={5} unit="%"
                      minLabel="Эмоции" maxLabel="Стабильность"
                    />
                  )}

                  {caps.supportsSimilarity && (
                    <Slider
                      label="Схожесть"
                      hint="Насколько близко к оригиналу"
                      value={similarity}
                      onChange={setSimilarity}
                      min={0} max={100} step={5} unit="%"
                      minLabel="Свободнее" maxLabel="Точнее"
                    />
                  )}

                  {caps.supportsSpeed && (
                    <Slider
                      label="Скорость"
                      value={speed}
                      onChange={setSpeed}
                      min={50} max={200} step={5} unit="%"
                      minLabel="0.5x" maxLabel="2x"
                    />
                  )}
                </>
              )}

              {/* ═══ DIALOGUE ═══ */}
              {caps.type === 'elevenlabs-dialogue' && (
                <>
                  <Field label={<><MessageSquare size={13} /> Формат диалога</>}>
                    <div className="text-[12px] text-white/55 leading-relaxed p-3 bg-white/[0.04] rounded-[10px] font-mono border border-white/[0.06]">
                      Aria: Привет! Как дела?<br />
                      Roger: Отлично, спасибо!<br />
                      Aria: Рада слышать!
                    </div>
                    <div className="text-[11px] text-white/40 mt-1.5">
                      Нажмите на имя голоса ниже — оно вставится автоматически
                    </div>
                  </Field>

                  <Field label={<><Mic size={13} /> Доступные голоса</>}>
                    <ChipsWrap>
                      {(caps.voices.length > 0 ? caps.voices : ELEVENLABS_VOICES).map((v) => (
                        <Chip key={v} active={false} onClick={() => { insertVoiceName(v); haptic('light') }}>
                          {v}
                        </Chip>
                      ))}
                    </ChipsWrap>
                  </Field>

                  {caps.supportsLanguage && (
                    <Field label="🌐 Язык">
                      <ChipsWrap>
                        {caps.languages.map((l) => (
                          <Chip key={l.code} active={language === l.code} onClick={() => { setLanguage(l.code); haptic('light') }}>
                            {l.label}
                          </Chip>
                        ))}
                      </ChipsWrap>
                    </Field>
                  )}

                  {caps.supportsStability && (
                    <Slider
                      label="Стабильность"
                      hint="Низкая = эмоциональнее"
                      value={stability}
                      onChange={setStability}
                      min={0} max={100} step={5} unit="%"
                      minLabel="Эмоции" maxLabel="Стабильность"
                    />
                  )}
                </>
              )}

              {/* ═══ SFX ═══ */}
              {caps.type === 'elevenlabs-sfx' && (
                <>
                  {caps.supportsDuration && (
                    <Slider
                      label={<><Clock size={13} /> Длительность</>}
                      value={duration}
                      onChange={setDuration}
                      min={caps.durationRange[0]}
                      max={caps.durationRange[1]}
                      step={caps.durationStep}
                      unit="сек"
                      minLabel={`${caps.durationRange[0]} сек`}
                      maxLabel={`${caps.durationRange[1]} сек`}
                      priceHint
                    />
                  )}

                  {caps.supportsLoop && (
                    <Field label="🔁 Зацикливание">
                      <Chips>
                        <Chip active={!loop} onClick={() => { setLoop(false); haptic('light') }}>Выключено</Chip>
                        <Chip active={loop} onClick={() => { setLoop(true); haptic('light') }}>Включено</Chip>
                      </Chips>
                    </Field>
                  )}

                  {caps.supportsPromptInfluence && (
                    <Slider
                      label="Влияние промпта"
                      hint="Насколько точно следовать описанию"
                      value={promptInfluence}
                      onChange={setPromptInfluence}
                      min={0} max={100} step={5} unit="%"
                      minLabel="Свободнее" maxLabel="Точнее"
                    />
                  )}
                </>
              )}

              {/* ═══ ISOLATION ═══ */}
              {caps.type === 'elevenlabs-isolation' && (
                <Field
                  label={<><Upload size={13} /> Аудиофайл для обработки</>}
                  hint="WAV, MP3, OGG · макс 10MB"
                >
                  <AudioUploadField
                    audioUrl={audioUrl}
                    uploading={uploadingAudio}
                    onPick={() => fileInputRef.current?.click()}
                    onClear={() => setAudioUrl('')}
                  />
                </Field>
              )}

              {/* ═══ STT ═══ */}
              {caps.type === 'elevenlabs-stt' && (
                <>
                  <Field
                    label={<><Upload size={13} /> Аудиофайл для распознавания</>}
                    hint="WAV, MP3, OGG · макс 10MB"
                  >
                    <AudioUploadField
                      audioUrl={audioUrl}
                      uploading={uploadingAudio}
                      onPick={() => fileInputRef.current?.click()}
                      onClear={() => setAudioUrl('')}
                    />
                  </Field>

                  {caps.supportsLanguage && (
                    <Field label="🌐 Язык аудио">
                      <ChipsWrap>
                        {caps.languages.map((l) => (
                          <Chip
                            key={l.code}
                            active={language === l.code}
                            onClick={() => { setLanguage(l.code); haptic('light') }}
                          >
                            {l.label}
                          </Chip>
                        ))}
                      </ChipsWrap>
                    </Field>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Helper components ─── */

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-1.5 text-[13px] font-medium text-white/65">
        {label}
        {hint && <span className="ml-auto text-[11px] font-normal text-white/25">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Chips({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  )
}

function ChipsWrap({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function Chip({
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
        shrink-0 rounded-[10px] px-3.5 py-2
        text-[12.5px] whitespace-nowrap
        cursor-pointer transition-all active:scale-[.96]
        border font-[inherit]
        ${active
          ? 'bg-amber-400/[.12] border-amber-400/35 text-amber-400'
          : 'bg-white/[.04] border-white/[.08] text-white/50'
        }
      `}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Slider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  minLabel,
  maxLabel,
  priceHint,
}: {
  label: React.ReactNode
  hint?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit?: string
  minLabel?: string
  maxLabel?: string
  priceHint?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-1.5 text-[13px] font-medium text-white/65">
        <span className="flex items-center gap-1.5">{label}</span>
        {priceHint && (
          <span className="text-[10px] text-[var(--accent-yellow)]/70 font-medium">
            влияет на цену
          </span>
        )}
        <span className="ml-auto text-[12px] font-semibold text-amber-400">
          {value}{unit && ` ${unit}`}
        </span>
      </label>
           {hint && <span className="text-[11px] text-white/35 -mt-1">{hint}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-1.5 rounded-full appearance-none
          bg-white/[0.06] cursor-pointer outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:border-0
          [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(250,204,21,0.15)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-amber-400
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-[11px] text-white/30">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}

function AudioUploadField({
  audioUrl,
  uploading,
  onPick,
  onClear,
}: {
  audioUrl: string
  uploading: boolean
  onPick: () => void
  onClear: () => void
}) {
  if (audioUrl) {
    return (
      <div
        className="
          flex items-center gap-2.5
          py-3 px-3.5
          rounded-[10px]
          border border-amber-400/25
          bg-amber-400/[0.06]
        "
      >
        <div className="w-9 h-9 rounded-[8px] bg-amber-400/15 flex items-center justify-center text-amber-400 shrink-0">
          <Mic size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-white">Файл загружен</div>
          <div className="text-[11px] text-white/40">Готов к обработке</div>
        </div>
        <button
          className="
            w-7 h-7 rounded-[8px] border-none shrink-0
            bg-white/[0.06] text-white/50
            flex items-center justify-center
            cursor-pointer transition-all duration-150
            active:scale-[0.92] active:bg-red-500/20 active:text-red-400
          "
          onClick={onClear}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      className="
        w-full py-6 px-4
        rounded-[12px]
        border-[1.5px] border-dashed border-white/[0.12]
        bg-white/[0.03]
        text-white/45
        flex flex-col items-center justify-center gap-1.5
        cursor-pointer transition-all duration-150
        font-[inherit]
        active:bg-white/[0.06] active:border-white/[0.2] active:scale-[0.99]
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      onClick={onPick}
      disabled={uploading}
    >
      {uploading ? (
        <Loader2 size={22} className="animate-spin" />
      ) : (
        <Upload size={22} />
      )}
      <span className="text-[13px] font-medium">
        {uploading ? 'Загрузка...' : 'Загрузить аудиофайл'}
      </span>
      <span className="text-[11px] text-white/30">
        WAV, MP3, OGG · до 10MB
      </span>
    </button>
  )
}