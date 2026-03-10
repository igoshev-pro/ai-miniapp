// src/components/VideoGenerationPage.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Video, Settings, Wand2,
  Clock, Maximize2, Zap, Loader2, Shuffle,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { allModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

const videoModels = allModels.filter((m) => m.category === 'video')

const modelCapabilities: Record<string, {
  maxDuration: number; minDuration: number; durationStep: number
  aspectRatios: string[]; qualities: string[]
  supportsImageInput: boolean; supportsMotionBrush: boolean
  supportsCameraControl: boolean; fps: number[]
}> = {
  'sora': {
    maxDuration: 60, minDuration: 5, durationStep: 5,
    aspectRatios: ['16:9', '1:1', '9:16'],
    qualities: ['standard', '720p', '1080p'],
    supportsImageInput: true, supportsMotionBrush: false, supportsCameraControl: true, fps: [24, 30],
  },
  'kling-1.6': {
    maxDuration: 10, minDuration: 3, durationStep: 1,
    aspectRatios: ['16:9', '1:1', '9:16'],
    qualities: ['standard', 'high'],
    supportsImageInput: true, supportsMotionBrush: true, supportsCameraControl: false, fps: [24],
  },
  'runway-gen3': {
    maxDuration: 18, minDuration: 4, durationStep: 2,
    aspectRatios: ['16:9', '1:1', '9:16', '4:3', '3:4'],
    qualities: ['standard', 'high'],
    supportsImageInput: true, supportsMotionBrush: true, supportsCameraControl: true, fps: [24],
  },
  'veo-2': {
    maxDuration: 8, minDuration: 4, durationStep: 4,
    aspectRatios: ['16:9', '9:16'],
    qualities: ['standard'],
    supportsImageInput: false, supportsMotionBrush: false, supportsCameraControl: false, fps: [24],
  },
  'hailuo': {
    maxDuration: 6, minDuration: 3, durationStep: 3,
    aspectRatios: ['16:9', '1:1', '9:16'],
    qualities: ['standard'],
    supportsImageInput: true, supportsMotionBrush: false, supportsCameraControl: false, fps: [24],
  },
  'luma-ray2': {
    maxDuration: 5, minDuration: 3, durationStep: 1,
    aspectRatios: ['16:9', '1:1', '9:16'],
    qualities: ['standard', 'high'],
    supportsImageInput: true, supportsMotionBrush: false, supportsCameraControl: true, fps: [24],
  },
  'pika-2.0': {
    maxDuration: 10, minDuration: 3, durationStep: 1,
    aspectRatios: ['16:9', '1:1', '9:16', '4:5'],
    qualities: ['standard'],
    supportsImageInput: true, supportsMotionBrush: true, supportsCameraControl: false, fps: [24],
  },
}

const cameraMovements = [
  { id: 'none', label: 'Нет' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'pan-left', label: 'Pan ←' },
  { id: 'pan-right', label: 'Pan →' },
  { id: 'tilt-up', label: 'Tilt ↑' },
  { id: 'tilt-down', label: 'Tilt ↓' },
  { id: 'orbit', label: 'Orbit' },
]

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

  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(videoModels[0]?.name ?? '')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [duration, setDuration] = useState(5)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [quality, setQuality] = useState('standard')
  const [camera, setCamera] = useState('none')
  const [fps, setFps] = useState(24)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentModel = videoModels.find((m) => m.name === selectedModel)
  const modelSlug = currentModel?.slug || 'sora'
  const modelCost = currentModel?.cost || 15
  const caps = modelCapabilities[modelSlug] || modelCapabilities['sora']

  // ─── Telegram BackButton ───────────────────────────
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

  useEffect(() => {
    setDuration(caps.minDuration)
    setAspectRatio(caps.aspectRatios[0] || '16:9')
    setQuality(caps.qualities[0] || 'standard')
    setCamera('none')
    setFps(caps.fps[0] || 24)
  }, [modelSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const videoGenerations = generations.filter((g: any) => g.type === 'video')
  const durationMultiplier = Math.ceil(duration / 5)
  const totalCost = modelCost * durationMultiplier

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }, [input])

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return
    if (balance < totalCost) {
      toast.warning(`Недостаточно спичек. Нужно ${totalCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }
    haptic('medium')
    setIsGenerating(true)
    const settings: Record<string, unknown> = { duration, aspectRatio, fps }
    if (quality !== 'standard') settings.quality = quality
    if (camera !== 'none' && caps.supportsCameraControl) settings.camera = camera
    const result = await generate({ type: 'video', model: modelSlug, prompt, settings })
    setIsGenerating(false)
    if (result) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [input, balance, totalCost, modelSlug, duration, aspectRatio, quality, camera, fps, caps, haptic, hapticNotification, generate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
  }

  const insertExample = () => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }

  return (
    <div className="gen-page">
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button className="gen-page__model-select"
            onClick={() => { setShowModelPicker(!showModelPicker); haptic('light') }}>
            <Video size={16} />
            <span>{selectedModel}</span>
            <span className="gen-page__model-cost">{totalCost} 🔥</span>
            <ChevronDown size={14} className={showModelPicker ? 'rotate-180' : ''} />
          </button>
          <button className="gen-page__settings-button"
            onClick={() => { setShowSettings(true); haptic('light') }}>
            <Settings size={18} />
          </button>
        </div>

        <div className="gen-page__quick-info">
          <span>{duration} сек</span><span>·</span>
          <span>{aspectRatio}</span><span>·</span>
          <span>{quality === 'standard' ? 'SD' : quality}</span>
          {camera !== 'none' && <><span>·</span><span>📹 {camera}</span></>}
        </div>

        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {videoModels.map((m) => {
              const mCaps = modelCapabilities[m.slug]
              return (
                <button key={m.id}
                  className={`gen-page__model-list-item ${selectedModel === m.name ? 'selected' : ''}`}
                  onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); haptic('light') }}>
                  <div className="gen-page__model-list-info">
                    <span className="gen-page__model-name">{m.name}</span>
                    <span className="gen-page__model-provider">
                      {m.provider} · до {mCaps?.maxDuration ?? '?'}с
                      {mCaps?.supportsImageInput && ' · img2vid'}
                    </span>
                  </div>
                  <div className="gen-page__model-right">
                    <span className="gen-page__model-cost-sm">{m.cost} 🔥</span>
                    {selectedModel === m.name && <Check size={14} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="gen-page__results">
        {videoGenerations.length === 0 && (
          <div className="gen-page__empty fade-in fade-in--2">
            <div className="gen-page__empty-icon"><Video size={36} strokeWidth={1.5} /></div>
            <div className="gen-page__empty-title">Генерация видео</div>
            <div className="gen-page__empty-text">
              Опишите сцену. Укажите камеру, освещение, стиль. Видео может генерироваться до 5 минут.
            </div>
            <button className="gen-page__example-btn" onClick={insertExample}>
              <Wand2 size={14} /> Пример промпта
            </button>
          </div>
        )}
        {videoGenerations.map((gen: any) => (
          <div key={gen.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{gen.model}</span>
              {gen.prompt}
            </div>
            <MediaResult generation={gen}
              onRetry={() => { generate({ type: 'video', model: gen.modelSlug, prompt: gen.prompt, settings: gen.settings }) }} />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      <div className="gen-page__input-area">
        <div className="chat-input__row">
          <button className="gen-page__dice-btn" onClick={insertExample}><Shuffle size={16} /></button>
          <div className="chat-input__field-wrap">
            <textarea ref={inputRef} className="chat-input__field" placeholder="Опишите видео..."
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} rows={1} disabled={isGenerating} />
          </div>
          <button className="chat-input__send" onClick={handleGenerate}
            disabled={!input.trim() || isGenerating}>
            {isGenerating ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="gen-settings-modal" onClick={() => setShowSettings(false)}>
          <div className="gen-settings-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="gen-settings-modal__header">
              <h2 className="gen-settings-modal__title"><Video size={16} /> Настройки · {selectedModel}</h2>
              <button className="gen-settings-modal__close" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="gen-settings-modal__body">
              <div className="gen-field">
                <label className="gen-field__label">
                  <Clock size={13} /> Длительность: {duration} сек
                  <span className="gen-field__hint">× {durationMultiplier} = {totalCost} 🔥</span>
                </label>
                <input type="range" className="gen-range" min={caps.minDuration} max={caps.maxDuration}
                  step={caps.durationStep} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                <div className="gen-field__range-labels"><span>{caps.minDuration}с</span><span>{caps.maxDuration}с</span></div>
              </div>

              <div className="gen-field">
                <label className="gen-field__label"><Maximize2 size={13} /> Соотношение сторон</label>
                <div className="gen-field__chips">
                  {caps.aspectRatios.map((r) => (
                    <button key={r} className={`gen-chip ${aspectRatio === r ? 'gen-chip--active' : ''}`}
                      onClick={() => { setAspectRatio(r); haptic('light') }}>{r}</button>
                  ))}
                </div>
              </div>

              {caps.qualities.length > 1 && (
                <div className="gen-field">
                  <label className="gen-field__label"><Zap size={13} /> Качество</label>
                  <div className="gen-field__chips">
                    {caps.qualities.map((q) => (
                      <button key={q} className={`gen-chip ${quality === q ? 'gen-chip--active' : ''}`}
                        onClick={() => { setQuality(q); haptic('light') }}>
                        {q === 'standard' ? 'Стандарт' : q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {caps.supportsCameraControl && (
                <div className="gen-field">
                  <label className="gen-field__label">📹 Движение камеры</label>
                  <div className="gen-field__chips gen-field__chips--wrap">
                    {cameraMovements.map((c) => (
                      <button key={c.id} className={`gen-chip ${camera === c.id ? 'gen-chip--active' : ''}`}
                        onClick={() => { setCamera(c.id); haptic('light') }}>{c.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {caps.fps.length > 1 && (
                <div className="gen-field">
                  <label className="gen-field__label">FPS</label>
                  <div className="gen-field__chips">
                    {caps.fps.map((f) => (
                      <button key={f} className={`gen-chip ${fps === f ? 'gen-chip--active' : ''}`}
                        onClick={() => { setFps(f); haptic('light') }}>{f}</button>
                    ))}
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