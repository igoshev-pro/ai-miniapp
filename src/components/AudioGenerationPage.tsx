'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Wand2,
  Clock, Loader2, Upload, Mic, Volume2, Zap,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

// ═══════════ Capabilities per audio model slug ═══════════
interface AudioModelCaps {
  type: 'suno' | 'elevenlabs-tts' | 'elevenlabs-sfx' | 'elevenlabs-isolation' | 'elevenlabs-stt' | 'elevenlabs-dialogue' | 'generic'
  supportsCustomMode: boolean
  supportsInstrumental: boolean
  supportsStyle: boolean
  supportsDuration: boolean
  durationRange: [number, number]    // [min, max] in seconds
  durationStep: number
  supportsVoice: boolean
  voices: string[]
  supportsLanguage: boolean
  supportsStability: boolean
  supportsSimilarity: boolean
  supportsAudioInput: boolean        // requires audio file upload
  supportsLoop: boolean
  supportsPromptInfluence: boolean
  supportsSpeed: boolean
}

const ELEVENLABS_VOICES = ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam']
const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'pl', label: 'Polski' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

const MODEL_CAPS: Record<string, AudioModelCaps> = {
  // ── Suno models ──
  'suno-v3': {
    type: 'suno', supportsCustomMode: true, supportsInstrumental: true,
    supportsStyle: true, supportsDuration: true, durationRange: [5, 300], durationStep: 5,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },
  'suno-v4': {
    type: 'suno', supportsCustomMode: true, supportsInstrumental: true,
    supportsStyle: true, supportsDuration: true, durationRange: [5, 300], durationStep: 5,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },
  'suno-v4.5': {
    type: 'suno', supportsCustomMode: true, supportsInstrumental: true,
    supportsStyle: true, supportsDuration: true, durationRange: [5, 300], durationStep: 5,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },
  'suno-v5': {
    type: 'suno', supportsCustomMode: true, supportsInstrumental: true,
    supportsStyle: true, supportsDuration: true, durationRange: [5, 300], durationStep: 5,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },

  // ── ElevenLabs TTS ──
  'elevenlabs-tts': {
    type: 'elevenlabs-tts', supportsCustomMode: false, supportsInstrumental: false,
    supportsStyle: true, supportsDuration: false, durationRange: [0, 0], durationStep: 0,
    supportsVoice: true, voices: ELEVENLABS_VOICES, supportsLanguage: true,
    supportsStability: true, supportsSimilarity: true,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: true,
  },
  'elevenlabs-tts-turbo': {
    type: 'elevenlabs-tts', supportsCustomMode: false, supportsInstrumental: false,
    supportsStyle: true, supportsDuration: false, durationRange: [0, 0], durationStep: 0,
    supportsVoice: true, voices: ELEVENLABS_VOICES, supportsLanguage: true,
    supportsStability: true, supportsSimilarity: true,
    supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: true,
  },

  // ── ElevenLabs Sound Effects ──
  'elevenlabs-sfx': {
    type: 'elevenlabs-sfx', supportsCustomMode: false, supportsInstrumental: false,
    supportsStyle: false, supportsDuration: true, durationRange: [1, 30], durationStep: 1,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: false, supportsLoop: true, supportsPromptInfluence: true, supportsSpeed: false,
  },

  // ── ElevenLabs Audio Isolation ──
  'elevenlabs-isolation': {
    type: 'elevenlabs-isolation', supportsCustomMode: false, supportsInstrumental: false,
    supportsStyle: false, supportsDuration: false, durationRange: [0, 0], durationStep: 0,
    supportsVoice: false, voices: [], supportsLanguage: false,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: true, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },

  // ── ElevenLabs Speech-to-Text ──
  'elevenlabs-stt': {
    type: 'elevenlabs-stt', supportsCustomMode: false, supportsInstrumental: false,
    supportsStyle: false, supportsDuration: false, durationRange: [0, 0], durationStep: 0,
    supportsVoice: false, voices: [], supportsLanguage: true,
    supportsStability: false, supportsSimilarity: false,
    supportsAudioInput: true, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
  },
}

const DEFAULT_CAPS: AudioModelCaps = {
  type: 'generic', supportsCustomMode: false, supportsInstrumental: false,
  supportsStyle: false, supportsDuration: false, durationRange: [0, 0], durationStep: 0,
  supportsVoice: false, voices: [], supportsLanguage: false,
  supportsStability: false, supportsSimilarity: false,
  supportsAudioInput: false, supportsLoop: false, supportsPromptInfluence: false, supportsSpeed: false,
}

const examplePrompts: Record<string, string[]> = {
  suno: [
    'Энергичный поп-трек о летних приключениях, яркий и позитивный',
    'Грустная фортепианная мелодия, дождь за окном, минор',
    'Электронный бит в стиле synthwave, ретро 80-х',
    'Джаз в стиле smooth jazz, саксофон, расслабляющий вечер',
    'Рок-баллада о дороге, гитарное соло, мощный голос',
  ],
  'elevenlabs-tts': [
    'Добро пожаловать в наш подкаст! Сегодня мы обсудим последние новости технологий.',
    'Привет! Как дела? Я так рад тебя видеть!',
    'В далёкой-далёкой галактике, где звёзды сияли ярче обычного...',
  ],
  'elevenlabs-sfx': [
    'Раскат грома во время сильной грозы',
    'Звук шагов по деревянному полу в пустой комнате',
    'Космический корабль взлетает с ракетной площадки',
    'Мяуканье котёнка, мягкое и тихое',
  ],
  default: [
    'Опишите что хотите сгенерировать...',
  ],
}

// Resolve caps for a model slug — tries exact match, then prefix match
function getCaps(slug: string): AudioModelCaps {
  if (MODEL_CAPS[slug]) return MODEL_CAPS[slug]
  // prefix matching: suno-*, elevenlabs-tts*, elevenlabs-sfx*, etc.
  if (slug.includes('suno')) return MODEL_CAPS['suno-v4'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('tts')) return MODEL_CAPS['elevenlabs-tts'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('turbo')) return MODEL_CAPS['elevenlabs-tts-turbo'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('sfx')) return MODEL_CAPS['elevenlabs-sfx'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('sound')) return MODEL_CAPS['elevenlabs-sfx'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('isolation')) return MODEL_CAPS['elevenlabs-isolation'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('stt')) return MODEL_CAPS['elevenlabs-stt'] || DEFAULT_CAPS
  if (slug.includes('elevenlabs') && slug.includes('speech-to-text')) return MODEL_CAPS['elevenlabs-stt'] || DEFAULT_CAPS
  return DEFAULT_CAPS
}

function getExamples(caps: AudioModelCaps): string[] {
  return examplePrompts[caps.type] || examplePrompts.default
}

export function AudioGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const audioModels = allModels.filter((m) => m.category === 'audio')

  const [input, setInput] = useState('')
  const [selectedModelSlug, setSelectedModelSlug] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Suno settings
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)

  // ElevenLabs TTS settings
  const [voiceId, setVoiceId] = useState('Rachel')
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)
  const [speed, setSpeed] = useState(100)

  // ElevenLabs SFX settings
  const [loop, setLoop] = useState(false)
  const [promptInfluence, setPromptInfluence] = useState(30)

  // Audio file (for isolation / STT)
  const [audioUrl, setAudioUrl] = useState('')
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Init default model
  useEffect(() => {
    if (!selectedModelSlug && audioModels.length > 0) {
      setSelectedModelSlug(audioModels[0].slug)
    }
  }, [audioModels, selectedModelSlug])

  const currentModel = audioModels.find((m) => m.slug === selectedModelSlug)
  const modelCost = currentModel?.cost || 5
  const caps = getCaps(selectedModelSlug)

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

  // Reset settings on model change
  useEffect(() => {
    const c = getCaps(selectedModelSlug)
    setInput('')
    setAudioUrl('')
    setCustomMode(false)
    setInstrumental(false)
    setStyle('')
    setDuration(c.supportsDuration ? Math.min(30, c.durationRange[1]) : 30)
    setVoiceId('Rachel')
    setLanguage('ru')
    setStability(50)
    setSimilarity(75)
    setSpeed(100)
    setLoop(false)
    setPromptInfluence(30)
  }, [selectedModelSlug])

  const audioGenerations = generations.filter((g) => g.type === 'audio')

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }, [input])

  // Upload audio file
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
      const formData = new FormData()
      formData.append('file', file)
      const token = sessionStorage.getItem('jwt')
      const API = process.env.NEXT_PUBLIC_API_URL || ''
      const resp = await fetch(`${API}/upload/audio`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!resp.ok) throw new Error('Upload failed')
      const data = await resp.json()
      const url = data.data?.url || data.url
      if (!url) throw new Error('No URL')
      setAudioUrl(url)
      haptic('light')
      toast.success('Аудио загружено')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки')
    } finally {
      setUploadingAudio(false)
    }
  }, [haptic])

  // Generate
  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()

    // Validate
    if (caps.supportsAudioInput && !audioUrl) {
      toast.warning('Загрузите аудиофайл')
      return
    }
    if (!caps.supportsAudioInput && !prompt) {
      toast.warning('Введите текст')
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

    // Suno settings
    if (caps.type === 'suno') {
      settings.customMode = customMode
      settings.instrumental = instrumental
      if (style.trim()) settings.style = style.trim()
      if (caps.supportsDuration) settings.duration = duration
    }

    // ElevenLabs TTS settings
    if (caps.type === 'elevenlabs-tts') {
      settings.voiceId = voiceId
      settings.language = language
      settings.stability = stability / 100
      settings.similarity = similarity / 100
      settings.speed = speed / 100
      if (style.trim()) settings.style = style.trim()
    }

    // ElevenLabs SFX settings
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) settings.duration = duration
      settings.loop = loop
      settings.promptInfluence = promptInfluence / 100
    }

    // ElevenLabs isolation / STT
    if (caps.supportsAudioInput && audioUrl) {
      settings.audioUrl = audioUrl
    }
    if (caps.type === 'elevenlabs-stt' && caps.supportsLanguage) {
      settings.language = language
    }

    const result = await generate({
      type: 'audio',
      model: selectedModelSlug,
      prompt: prompt || 'audio processing',
      settings,
    })

    setIsGenerating(false)

    if (result) {
      setInput('')
      setAudioUrl('')
      hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [
    input, audioUrl, balance, modelCost, selectedModelSlug, caps,
    customMode, instrumental, style, duration,
    voiceId, language, stability, similarity, speed,
    loop, promptInfluence,
    haptic, hapticNotification, generate,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
  }

  const insertExample = () => {
    const examples = getExamples(caps)
    setInput(examples[Math.floor(Math.random() * examples.length)])
    haptic('light')
  }

  // Determine if prompt input is needed
  const needsPrompt = !caps.supportsAudioInput
  const canSend = !isGenerating && (
    caps.supportsAudioInput ? !!audioUrl : !!input.trim()
  )

  // Placeholder text
  const getPlaceholder = () => {
    switch (caps.type) {
      case 'suno': return 'Опишите музыку...'
      case 'elevenlabs-tts': return 'Введите текст для озвучки...'
      case 'elevenlabs-sfx': return 'Опишите звуковой эффект...'
      case 'elevenlabs-isolation': return 'Загрузите аудио для обработки'
      case 'elevenlabs-stt': return 'Загрузите аудио для распознавания'
      default: return 'Введите текст...'
    }
  }

  // Quick params
  const getQuickParams = (): string[] => {
    const params: string[] = []
    if (caps.type === 'suno') {
      if (caps.supportsDuration) params.push(`${duration} сек`)
      if (customMode) params.push('Custom')
      if (instrumental) params.push('Инструментал')
      if (style.trim()) params.push(style.trim())
    }
    if (caps.type === 'elevenlabs-tts') {
      params.push(voiceId)
      const lang = LANGUAGES.find(l => l.code === language)
      params.push(lang?.label || language)
    }
    if (caps.type === 'elevenlabs-sfx') {
      if (caps.supportsDuration) params.push(`${duration} сек`)
      if (loop) params.push('Зацикл.')
    }
    if (caps.supportsAudioInput) {
      params.push(audioUrl ? '🎵 Аудио' : 'Нужен файл')
    }
    return params
  }

  if (audioModels.length === 0) {
    return (
      <div className="gen-page">
        <div className="gen-page__empty fade-in">
          <div className="gen-page__empty-icon"><Music size={36} strokeWidth={1.5} /></div>
          <div className="gen-page__empty-title">Загрузка...</div>
          <div className="gen-page__empty-text">Аудио модели загружаются</div>
        </div>
      </div>
    )
  }

  return (
    <div className="gen-page">
      {/* ── Header ── */}
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button
            className="gen-page__model-select"
            onClick={() => { setShowModelPicker(!showModelPicker); haptic('light') }}
          >
            <Music size={16} />
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

        {/* Quick params */}
        <div className="gen-page__params-row">
          {getQuickParams().map((p, i) => (
            <span
              key={i}
              className={`gen-page__param-badge ${
                caps.supportsAudioInput && audioUrl && p.includes('Аудио')
                  ? 'gen-page__param-badge--active' : ''
              }`}
              onClick={() => { setShowSettings(true); haptic('light') }}
            >
              {p}
            </span>
          ))}
        </div>

        {/* Model picker */}
        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {audioModels.map((m) => (
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
                    {getCaps(m.slug).type === 'suno' ? ' · Музыка' : ''}
                    {getCaps(m.slug).type === 'elevenlabs-tts' ? ' · TTS' : ''}
                    {getCaps(m.slug).type === 'elevenlabs-sfx' ? ' · SFX' : ''}
                    {getCaps(m.slug).type === 'elevenlabs-isolation' ? ' · Isolation' : ''}
                    {getCaps(m.slug).type === 'elevenlabs-stt' ? ' · STT' : ''}
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
        {audioGenerations.length === 0 && (
          <div className="gen-page__empty fade-in fade-in--2">
            <div className="gen-page__empty-icon">
              <Music size={36} strokeWidth={1.5} />
            </div>
            <div className="gen-page__empty-title">
              {caps.type === 'suno' ? 'Генерация музыки' : 
               caps.type === 'elevenlabs-tts' ? 'Озвучка текста' :
               caps.type === 'elevenlabs-sfx' ? 'Звуковые эффекты' :
               caps.type === 'elevenlabs-isolation' ? 'Изоляция голоса' :
               caps.type === 'elevenlabs-stt' ? 'Распознавание речи' :
               'Генерация аудио'}
            </div>
            <div className="gen-page__empty-text">
              {caps.type === 'suno' ? 'Опишите музыку, которую хотите создать. Генерация занимает до 2 минут.' :
               caps.type === 'elevenlabs-tts' ? 'Введите текст для озвучки. Выберите голос и язык в настройках.' :
               caps.type === 'elevenlabs-sfx' ? 'Опишите звуковой эффект, который нужно сгенерировать.' :
               caps.supportsAudioInput ? 'Загрузите аудиофайл для обработки.' :
               'Опишите что хотите сгенерировать.'}
            </div>
            {needsPrompt && (
              <button className="gen-page__example-btn" onClick={insertExample}>
                <Wand2 size={14} /> Пример промпта
              </button>
            )}
          </div>
        )}

        {audioGenerations.map((gen) => (
          <div key={gen.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{gen.model}</span>
              {gen.prompt}
            </div>
            <MediaResult
              generation={gen}
              onRetry={() => generate({
                type: 'audio',
                model: gen.modelSlug,
                prompt: gen.prompt,
                settings: gen.settings,
              })}
            />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      {/* ── Input ── */}
      <div className="gen-page__input-area">
        {/* Audio file preview */}
        {audioUrl && (
          <div className="gen-page__audio-file-preview">
            <div className="gen-page__audio-file-chip">
              <Mic size={14} />
              <span>Аудио загружено</span>
              <button
                className="gen-page__audio-file-remove"
                onClick={() => setAudioUrl('')}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="chat-input__row">
          {/* Audio upload button */}
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
                className={`chat-input__attach ${audioUrl ? 'chat-input__attach--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAudio}
              >
                {uploadingAudio ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
              </button>
            </>
          )}

          <div className="chat-input__field-wrap">
            <textarea
              ref={inputRef}
              className="chat-input__field"
              placeholder={getPlaceholder()}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isGenerating || (caps.supportsAudioInput && !needsPrompt)}
            />
          </div>

          <button
            className="chat-input__send"
            onClick={handleGenerate}
            disabled={!canSend}
          >
            {isGenerating ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="gen-settings-modal" onClick={() => setShowSettings(false)}>
          <div className="gen-settings-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="gen-settings-modal__header">
              <h2 className="gen-settings-modal__title">
                <Music size={16} /> Настройки · {currentModel?.name}
              </h2>
              <button className="gen-settings-modal__close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="gen-settings-modal__body">

              {/* ═══ SUNO SETTINGS ═══ */}
              {caps.type === 'suno' && (
                <>
                                    {/* Custom Mode */}
                  {caps.supportsCustomMode && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        <Zap size={13} /> Режим
                      </label>
                      <div className="gen-field__chips">
                        <button
                          className={`gen-chip ${!customMode ? 'gen-chip--active' : ''}`}
                          onClick={() => { setCustomMode(false); haptic('light') }}
                        >
                          Авто
                        </button>
                        <button
                          className={`gen-chip ${customMode ? 'gen-chip--active' : ''}`}
                          onClick={() => { setCustomMode(true); haptic('light') }}
                        >
                          Custom Mode
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Instrumental */}
                  {caps.supportsInstrumental && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        <Volume2 size={13} /> Вокал
                      </label>
                      <div className="gen-field__chips">
                        <button
                          className={`gen-chip ${!instrumental ? 'gen-chip--active' : ''}`}
                          onClick={() => { setInstrumental(false); haptic('light') }}
                        >
                          С вокалом
                        </button>
                        <button
                          className={`gen-chip ${instrumental ? 'gen-chip--active' : ''}`}
                          onClick={() => { setInstrumental(true); haptic('light') }}
                        >
                          Инструментал
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Style */}
                  {caps.supportsStyle && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        🎨 Стиль
                        <span className="gen-field__hint">pop, rock, jazz, electronic...</span>
                      </label>
                      <input
                        type="text"
                        className="gen-field__text-input"
                        placeholder="Например: pop, energetic, upbeat"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Duration */}
                  {caps.supportsDuration && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        <Clock size={13} /> Длительность: {duration} сек
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={caps.durationRange[0]}
                        max={caps.durationRange[1]}
                        step={caps.durationStep}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>{caps.durationRange[0]} сек</span>
                        <span>{caps.durationRange[1]} сек</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ═══ ELEVENLABS TTS SETTINGS ═══ */}
              {caps.type === 'elevenlabs-tts' && (
                <>
                  {/* Voice */}
                  {caps.supportsVoice && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        <Mic size={13} /> Голос
                      </label>
                      <div className="gen-field__chips gen-field__chips--wrap">
                        {caps.voices.map((v) => (
                          <button
                            key={v}
                            className={`gen-chip ${voiceId === v ? 'gen-chip--active' : ''}`}
                            onClick={() => { setVoiceId(v); haptic('light') }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Language */}
                  {caps.supportsLanguage && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        🌐 Язык
                      </label>
                      <div className="gen-field__chips gen-field__chips--wrap">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            className={`gen-chip ${language === l.code ? 'gen-chip--active' : ''}`}
                            onClick={() => { setLanguage(l.code); haptic('light') }}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stability */}
                  {caps.supportsStability && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        Стабильность: {stability}%
                        <span className="gen-field__hint">Низкая = эмоциональнее</span>
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={0}
                        max={100}
                        step={5}
                        value={stability}
                        onChange={(e) => setStability(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>Эмоции</span>
                        <span>Стабильность</span>
                      </div>
                    </div>
                  )}

                  {/* Similarity */}
                  {caps.supportsSimilarity && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        Схожесть: {similarity}%
                        <span className="gen-field__hint">Насколько близко к оригиналу</span>
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={0}
                        max={100}
                        step={5}
                        value={similarity}
                        onChange={(e) => setSimilarity(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>Свободнее</span>
                        <span>Точнее</span>
                      </div>
                    </div>
                  )}

                  {/* Speed */}
                  {caps.supportsSpeed && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        Скорость: {speed}%
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={50}
                        max={200}
                        step={5}
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>0.5x</span>
                        <span>2x</span>
                      </div>
                    </div>
                  )}

                  {/* Style (expression) */}
                  {caps.supportsStyle && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        🎭 Экспрессия
                        <span className="gen-field__hint">Стиль подачи</span>
                      </label>
                      <input
                        type="text"
                        className="gen-field__text-input"
                        placeholder="Например: cheerful, serious, calm"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* ═══ ELEVENLABS SFX SETTINGS ═══ */}
              {caps.type === 'elevenlabs-sfx' && (
                <>
                  {/* Duration */}
                  {caps.supportsDuration && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        <Clock size={13} /> Длительность: {duration} сек
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={caps.durationRange[0]}
                        max={caps.durationRange[1]}
                        step={caps.durationStep}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>{caps.durationRange[0]} сек</span>
                        <span>{caps.durationRange[1]} сек</span>
                      </div>
                    </div>
                  )}

                  {/* Loop */}
                  {caps.supportsLoop && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        🔁 Зацикливание
                      </label>
                      <div className="gen-field__chips">
                        <button
                          className={`gen-chip ${!loop ? 'gen-chip--active' : ''}`}
                          onClick={() => { setLoop(false); haptic('light') }}
                        >
                          Выключено
                        </button>
                        <button
                          className={`gen-chip ${loop ? 'gen-chip--active' : ''}`}
                          onClick={() => { setLoop(true); haptic('light') }}
                        >
                          Включено
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Prompt Influence */}
                  {caps.supportsPromptInfluence && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        Влияние промпта: {promptInfluence}%
                        <span className="gen-field__hint">Насколько точно следовать описанию</span>
                      </label>
                      <input
                        type="range"
                        className="gen-range"
                        min={0}
                        max={100}
                        step={5}
                        value={promptInfluence}
                        onChange={(e) => setPromptInfluence(Number(e.target.value))}
                      />
                      <div className="gen-field__range-labels">
                        <span>Свободнее</span>
                        <span>Точнее</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ═══ ELEVENLABS ISOLATION SETTINGS ═══ */}
              {caps.type === 'elevenlabs-isolation' && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    <Upload size={13} /> Аудиофайл для обработки
                    <span className="gen-field__hint">WAV, MP3, OGG · макс 10MB</span>
                  </label>

                  {audioUrl ? (
                    <div className="gen-field__audio-preview">
                      <div className="gen-field__audio-chip">
                        <Mic size={14} />
                        <span>Файл загружен</span>
                        <button
                          className="gen-field__audio-remove"
                          onClick={() => setAudioUrl('')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="gen-field__image-upload"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAudio}
                    >
                      {uploadingAudio
                        ? <Loader2 size={20} className="spin" />
                        : <Upload size={20} />
                      }
                      <span>{uploadingAudio ? 'Загрузка...' : 'Загрузить аудио'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* ═══ ELEVENLABS STT SETTINGS ═══ */}
              {caps.type === 'elevenlabs-stt' && (
                <>
                  <div className="gen-field">
                    <label className="gen-field__label">
                      <Upload size={13} /> Аудиофайл для распознавания
                      <span className="gen-field__hint">WAV, MP3, OGG · макс 10MB</span>
                    </label>

                    {audioUrl ? (
                      <div className="gen-field__audio-preview">
                        <div className="gen-field__audio-chip">
                          <Mic size={14} />
                          <span>Файл загружен</span>
                          <button
                            className="gen-field__audio-remove"
                            onClick={() => setAudioUrl('')}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="gen-field__image-upload"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAudio}
                      >
                        {uploadingAudio
                          ? <Loader2 size={20} className="spin" />
                          : <Upload size={20} />
                        }
                        <span>{uploadingAudio ? 'Загрузка...' : 'Загрузить аудио'}</span>
                      </button>
                    )}
                  </div>

                  {/* Language for STT */}
                  {caps.supportsLanguage && (
                    <div className="gen-field">
                      <label className="gen-field__label">
                        🌐 Язык аудио
                      </label>
                      <div className="gen-field__chips gen-field__chips--wrap">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            className={`gen-chip ${language === l.code ? 'gen-chip--active' : ''}`}
                            onClick={() => { setLanguage(l.code); haptic('light') }}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
                      