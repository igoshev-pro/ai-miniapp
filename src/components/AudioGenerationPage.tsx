'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Wand2,
  Clock, Loader2, Upload, Mic, Volume2, Zap, MessageSquare,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'
import { apiClient } from '@/lib/api'

/* ─── Types ─── */

interface Props {
  onBack?: () => void
}

interface AudioModelCaps {
  type:
    | 'suno' | 'elevenlabs-tts' | 'elevenlabs-sfx'
    | 'elevenlabs-isolation' | 'elevenlabs-stt'
    | 'elevenlabs-dialogue' | 'generic'
  supportsCustomMode: boolean
  supportsInstrumental: boolean
  supportsStyle: boolean
  supportsDuration: boolean
  durationRange: [number, number]
  durationStep: number
  supportsVoice: boolean
  voices: string[]
  supportsLanguage: boolean
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

const SUNO_CAPS: AudioModelCaps = {
  type:'suno', supportsCustomMode:true, supportsInstrumental:true, supportsStyle:true,
  supportsDuration:true, durationRange:[5,300], durationStep:5,
  supportsVoice:false, voices:[], supportsLanguage:false,
  supportsStability:false, supportsSimilarity:false,
  supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
}
const TTS_CAPS: AudioModelCaps = {
  type:'elevenlabs-tts', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:false, durationRange:[0,0], durationStep:0,
  supportsVoice:true, voices:ELEVENLABS_VOICES, supportsLanguage:true,
  supportsStability:true, supportsSimilarity:true,
  supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:true,
}
const DIALOGUE_CAPS: AudioModelCaps = {
  type:'elevenlabs-dialogue', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:false, durationRange:[0,0], durationStep:0,
  supportsVoice:false, voices:[], supportsLanguage:true,
  supportsStability:true, supportsSimilarity:false,
  supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
}
const SFX_CAPS: AudioModelCaps = {
  type:'elevenlabs-sfx', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:true, durationRange:[1,30], durationStep:1,
  supportsVoice:false, voices:[], supportsLanguage:false,
  supportsStability:false, supportsSimilarity:false,
  supportsAudioInput:false, supportsLoop:true, supportsPromptInfluence:true, supportsSpeed:false,
}
const ISOLATION_CAPS: AudioModelCaps = {
  type:'elevenlabs-isolation', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:false, durationRange:[0,0], durationStep:0,
  supportsVoice:false, voices:[], supportsLanguage:false,
  supportsStability:false, supportsSimilarity:false,
  supportsAudioInput:true, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
}
const STT_CAPS: AudioModelCaps = {
  type:'elevenlabs-stt', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:false, durationRange:[0,0], durationStep:0,
  supportsVoice:false, voices:[], supportsLanguage:true,
  supportsStability:false, supportsSimilarity:false,
  supportsAudioInput:true, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
}
const DEFAULT_CAPS: AudioModelCaps = {
  type:'generic', supportsCustomMode:false, supportsInstrumental:false, supportsStyle:false,
  supportsDuration:false, durationRange:[0,0], durationStep:0,
  supportsVoice:false, voices:[], supportsLanguage:false,
  supportsStability:false, supportsSimilarity:false,
  supportsAudioInput:false, supportsLoop:false, supportsPromptInfluence:false, supportsSpeed:false,
}

const MODEL_CAPS: Record<string, AudioModelCaps> = {
  'suno-v3': SUNO_CAPS, 'suno-v4': SUNO_CAPS, 'suno-v4.5': SUNO_CAPS, 'suno-v5': SUNO_CAPS,
  'elevenlabs-tts-turbo': TTS_CAPS, 'elevenlabs-tts-multilingual': TTS_CAPS,
  'elevenlabs-dialogue': DIALOGUE_CAPS, 'elevenlabs-sfx': SFX_CAPS,
  'elevenlabs-isolation': ISOLATION_CAPS, 'elevenlabs-stt': STT_CAPS,
}

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

/* ─── Helpers ─── */

function getCaps(slug: string): AudioModelCaps {
  if (MODEL_CAPS[slug]) return MODEL_CAPS[slug]
  if (slug.includes('suno')) return SUNO_CAPS
  if (slug.includes('dialogue')) return DIALOGUE_CAPS
  if (slug.includes('isolation')) return ISOLATION_CAPS
  if (slug.includes('stt') || slug.includes('speech-to-text')) return STT_CAPS
  if (slug.includes('sfx') || slug.includes('sound')) return SFX_CAPS
  if (slug.includes('elevenlabs')) return TTS_CAPS
  return DEFAULT_CAPS
}

/* ─── Component ─── */

export function AudioGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const audioModels = useMemo(
    () => allModels.filter((m) => m.category === 'audio'),
    [allModels],
  )

  const [input, setInput] = useState('')
  const [slug, setSlug] = useState('')
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

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug && audioModels.length > 0) setSlug(audioModels[0].slug)
  }, [audioModels, slug])

  const currentModel = audioModels.find((m) => m.slug === slug)
  const modelCost = currentModel?.cost || 5
  const caps = getCaps(slug)

  // BackButton
  useEffect(() => {
    if (!webApp?.BackButton || !onBack) return
    webApp.BackButton.show()
    const h = () => onBack()
    webApp.BackButton.onClick(h)
    return () => {
      webApp.BackButton.offClick(h)
      webApp.BackButton.hide()
    }
  }, [webApp, onBack])

  // Reset on model change
  useEffect(() => {
    if (!slug) return
    const c = getCaps(slug)
    setInput('')
    setAudioUrl('')
    setCustomMode(false); setInstrumental(false); setStyle('')
    setDuration(c.supportsDuration ? Math.min(30, c.durationRange[1]) : 30)
    setVoiceId(DEFAULT_VOICE); setLanguage('ru')
    setStability(50); setSimilarity(75); setSpeed(100)
    setLoop(false); setPromptInfluence(30)
  }, [slug])

  const audioGens = useMemo(
    () => generations.filter((g) => g.type === 'audio'),
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

  // Upload audio
  const handleAudioUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) { toast.error('Только аудиофайлы'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Макс 10MB'); return }
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

  // Insert voice name (dialogue)
  const insertVoiceName = useCallback((voice: string) => {
    const ta = inputRef.current
    if (!ta) {
      setInput((prev) => {
        const t = prev.trimEnd()
        return t === '' ? `${voice}: ` : `${t}\n${voice}: `
      })
      haptic('light'); return
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
      ta.selectionStart = pos; ta.selectionEnd = pos; ta.focus()
    }, 0)
    haptic('light')
  }, [input, haptic])

  // Generate
  const doGen = useCallback(async () => {
    const prompt = input.trim()
    if (caps.supportsAudioInput && !audioUrl) { toast.warning('Загрузите аудиофайл'); return }
    if (!caps.supportsAudioInput && !prompt) { toast.warning('Введите текст'); return }
    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error'); return
    }
    haptic('medium')
    setIsGenerating(true)

    const settings: Record<string, unknown> = {}
    if (caps.type === 'suno') {
      settings.customMode = customMode
      settings.instrumental = instrumental
      if (style.trim()) settings.style = style.trim()
      if (caps.supportsDuration) settings.duration = duration
    }
    if (caps.type === 'elevenlabs-tts') {
      settings.voiceId = voiceId
      settings.language = language
      settings.stability = stability / 100
      settings.similarity = similarity / 100
      settings.speed = speed / 100
    }
    if (caps.type === 'elevenlabs-dialogue') {
      settings.stability = stability / 100
      if (language) settings.language = language
    }
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) settings.duration = duration
      settings.loop = loop
      settings.promptInfluence = promptInfluence / 100
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
      setInput(''); setAudioUrl('')
      hapticNotification('success')
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior:'smooth' }), 200)
    }
  }, [
    input, audioUrl, balance, modelCost, slug, caps,
    customMode, instrumental, style, duration,
    voiceId, language, stability, similarity, speed,
    loop, promptInfluence,
    haptic, hapticNotification, generate,
  ])

  const onKey = (e: React.KeyboardEvent) => {
    if (caps.type === 'elevenlabs-dialogue') return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doGen() }
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
    const c = getCaps(s)
    switch (c.type) {
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

  // Quick params
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
      out.push({ label: LANGUAGES.find(l => l.code === language)?.label || language })
    }
    if (caps.type === 'elevenlabs-dialogue') {
      const lines = input.split('\n').filter(l => l.trim() && l.includes(':')).length
      out.push({ label:`${lines} реплик` })
      out.push({ label: LANGUAGES.find(l => l.code === language)?.label || language })
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

    // Loading state
  if (audioModels.length === 0) {
    return (
      <div
        className="
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
            active:scale-[0.9]
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
            {audioModels.map((m) => (
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
                  setSlug(m.slug)
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
                    {m.cost % 1 === 0 ? m.cost : m.cost.toFixed(2)} 🔥
                  </span>
                  {slug === m.slug && <Check size={14} className="text-[var(--accent-yellow)]" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick params chips ── */}
      {quickParams.length > 0 && (
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
        </div>
      )}

      {/* ── Results ── */}
      <div
        ref={resultsContainerRef}
        className="
          flex-1 min-h-0 overflow-y-auto
          overscroll-contain [-webkit-overflow-scrolling:touch]
        "
      >
        <div className="flex flex-col gap-3.5 px-4 py-3">
          {/* Empty state */}
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

          {/* Generations list */}
          {audioGens.map((gen) => (
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

          <div ref={resultsEndRef} />
        </div>
      </div>

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
        {/* Audio file preview */}
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
                onClick={() => {
                  setAudioUrl('')
                  haptic('light')
                }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Voice quick-insert chips (dialogue) */}
        {caps.type === 'elevenlabs-dialogue' && (
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

        {/* Input row */}
        <div className="flex items-center gap-2">
          {/* Upload audio button */}
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
            disabled={isGenerating || caps.supportsAudioInput}
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

      {/* ── Settings Modal ── */}
{showSettings && (
  <div
    className="
      fixed inset-0 z-[200]
      bg-black/60 backdrop-blur-[8px]
      flex items-end justify-center
      animate-[fadeIn_0.2s_ease-out]
    "
    onClick={() => setShowSettings(false)}
  >
    <div
      className="
        w-full max-w-[600px]
        h-[90dvh] max-h-[90dvh]
        rounded-t-[20px]
        bg-[#141418] border-t border-x border-white/[0.06]
        flex flex-col overflow-hidden
        animate-[slideUp_0.25s_ease-out]
      "
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal header */}
      <div
        className="
          shrink-0
          flex items-center justify-between
          px-5 pt-[18px] pb-3.5
          border-b border-white/[0.06]
          bg-[#141418]
        "
      >
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-white m-0">
          <Music size={16} /> Настройки · {currentModel?.name}
        </h2>
        <button
          className="
            bg-white/[0.06] border-none rounded-[10px]
            p-1.5 text-white/50 cursor-pointer
            active:scale-[0.92]
          "
          onClick={() => setShowSettings(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal body */}
      <div
        className="
          flex-1 min-h-0 overflow-y-auto
          px-5 pt-4
          pb-[calc(32px+var(--safe-bottom,0px))]
          flex flex-col gap-5
          [-webkit-overflow-scrolling:touch] overscroll-contain
        "
      >
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
                    <Chip key={v} active={voiceId === v} onClick={() => { setVoiceId(v); haptic('light') }}>{v}</Chip>
                  ))}
                </ChipsWrap>
              </Field>
            )}

            {caps.supportsLanguage && (
              <Field label="🌐 Язык">
                <ChipsWrap>
                  {LANGUAGES.map((l) => (
                    <Chip key={l.code} active={language === l.code} onClick={() => { setLanguage(l.code); haptic('light') }}>{l.label}</Chip>
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
                Нажмите на имя голоса под полем ввода — оно вставится автоматически
              </div>
            </Field>

            <Field label={<><Mic size={13} /> Доступные голоса</>}>
              <ChipsWrap>
                {ELEVENLABS_VOICES.map((v) => (
                  <Chip key={v} active={false} onClick={() => { insertVoiceName(v); haptic('light') }}>{v}</Chip>
                ))}
              </ChipsWrap>
            </Field>

            {caps.supportsLanguage && (
              <Field label="🌐 Язык">
                <ChipsWrap>
                  {LANGUAGES.map((l) => (
                    <Chip key={l.code} active={language === l.code} onClick={() => { setLanguage(l.code); haptic('light') }}>{l.label}</Chip>
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
                  {LANGUAGES.map((l) => (
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
  </div>
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
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-1.5 text-[13px] font-medium text-white/65">
        <span className="flex items-center gap-1.5">{label}</span>
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