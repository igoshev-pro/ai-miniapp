// src/components/ImageGenerationPage.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown,
  Send,
  Check,
  X,
  Image as ImageIcon,
  Settings,
  Wand2,
  Maximize2,
  Palette,
  Layers,
  Loader2,
  Shuffle,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { allModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

const imageModels = allModels.filter((m) => m.category === 'image')

const modelCapabilities: Record<string, {
  sizes: string[]
  qualities: string[]
  styles: string[]
  maxCount: number
  supportsNegativePrompt: boolean
  supportsAspectRatio: boolean
}> = {
  'midjourney': {
    sizes: ['1024x1024', '1024x1536', '1536x1024', '1024x1792', '1792x1024'],
    qualities: ['standard', 'hd'],
    styles: ['raw', 'cute', 'scenic', 'expressive', 'creative'],
    maxCount: 4, supportsNegativePrompt: false, supportsAspectRatio: true,
  },
  'dall-e-3': {
    sizes: ['1024x1024', '1024x1792', '1792x1024'],
    qualities: ['standard', 'hd'],
    styles: ['vivid', 'natural'],
    maxCount: 1, supportsNegativePrompt: false, supportsAspectRatio: false,
  },
  'chatgpt-images': {
    sizes: ['1024x1024', '1536x1024', '1024x1536'],
    qualities: ['auto'], styles: [],
    maxCount: 1, supportsNegativePrompt: false, supportsAspectRatio: false,
  },
  'flux-pro': {
    sizes: ['512x512', '768x768', '1024x1024', '768x1344', '1344x768'],
    qualities: ['standard', 'hd'], styles: [],
    maxCount: 4, supportsNegativePrompt: true, supportsAspectRatio: true,
  },
  'stable-diffusion-xl': {
    sizes: ['512x512', '768x768', '1024x1024', '768x1344', '1344x768', '896x1152', '1152x896'],
    qualities: ['standard'],
    styles: ['photographic', 'digital-art', 'anime', 'comic-book', '3d-model', 'pixel-art', 'fantasy-art', 'neon-punk'],
    maxCount: 4, supportsNegativePrompt: true, supportsAspectRatio: false,
  },
  'seedream': {
    sizes: ['1024x1024', '1024x1536', '1536x1024'],
    qualities: ['standard', 'hd'], styles: [],
    maxCount: 4, supportsNegativePrompt: true, supportsAspectRatio: true,
  },
  'imagen-3': {
    sizes: ['1024x1024', '1024x1536', '1536x1024'],
    qualities: ['standard'], styles: [],
    maxCount: 4, supportsNegativePrompt: false, supportsAspectRatio: true,
  },
  'nano-banana': {
    sizes: ['512x512', '768x768', '1024x1024'],
    qualities: ['standard'], styles: [],
    maxCount: 4, supportsNegativePrompt: true, supportsAspectRatio: false,
  },
}

const sizeLabels: Record<string, string> = {
  '512x512': '512²', '768x768': '768²', '1024x1024': '1:1',
  '1024x1536': '2:3', '1536x1024': '3:2', '1024x1792': '9:16',
  '1792x1024': '16:9', '768x1344': '9:16', '1344x768': '16:9',
  '896x1152': '3:4', '1152x896': '4:3',
}

const styleLabels: Record<string, string> = {
  'raw': 'Raw', 'cute': 'Cute', 'scenic': 'Scenic',
  'expressive': 'Экспрессия', 'creative': 'Креатив',
  'vivid': 'Яркий', 'natural': 'Натуральный',
  'photographic': 'Фото', 'digital-art': 'Диджитал',
  'anime': 'Аниме', 'comic-book': 'Комикс', '3d-model': '3D',
  'pixel-art': 'Пиксельарт', 'fantasy-art': 'Фэнтези', 'neon-punk': 'Неон-панк',
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

  const [input, setInput] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState(imageModels[0]?.name ?? '')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [style, setStyle] = useState('')
  const [count, setCount] = useState(1)
  const [seed, setSeed] = useState<number | undefined>(undefined)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentModel = imageModels.find((m) => m.name === selectedModel)
  const modelSlug = currentModel?.slug || 'midjourney'
  const modelCost = currentModel?.cost || 5
  const caps = modelCapabilities[modelSlug] || modelCapabilities['midjourney']

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

  // Сбрасываем настройки при смене модели
  useEffect(() => {
    setSize(caps.sizes[0] || '1024x1024')
    setQuality(caps.qualities[0] || 'standard')
    setStyle(caps.styles[0] || '')
    setCount(1)
    setNegativePrompt('')
    setSeed(undefined)
  }, [modelSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const imageGenerations = generations.filter((g: any) => g.type === 'image')

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }, [input])

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return

    const totalCost = modelCost * count
    if (balance < totalCost) {
      toast.warning(`Недостаточно спичек. Нужно ${totalCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')
    setIsGenerating(true)

    const settings: Record<string, unknown> = { size, count }
    if (quality !== 'auto') settings.quality = quality
    if (style) settings.style = style
    if (negativePrompt.trim() && caps.supportsNegativePrompt) {
      settings.negativePrompt = negativePrompt.trim()
    }
    if (seed !== undefined) settings.seed = seed

    const result = await generate({
      type: 'image', model: modelSlug, prompt, settings,
    })

    setIsGenerating(false)

    if (result) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [input, negativePrompt, balance, modelCost, modelSlug, size, quality, style, count, seed, caps, haptic, hapticNotification, generate])

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

  return (
    <div className="gen-page">
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button
            className="gen-page__model-select"
            onClick={() => { setShowModelPicker(!showModelPicker); haptic('light') }}
          >
            <ImageIcon size={16} />
            <span>{selectedModel}</span>
            <span className="gen-page__model-cost">{modelCost * count} 🔥</span>
            <ChevronDown size={14} className={showModelPicker ? 'rotate-180' : ''} />
          </button>
          <button className="gen-page__settings-button" onClick={() => { setShowSettings(true); haptic('light') }}>
            <Settings size={18} />
          </button>
        </div>

        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {imageModels.map((m) => (
              <button
                key={m.id}
                className={`gen-page__model-list-item ${selectedModel === m.name ? 'selected' : ''}`}
                onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); haptic('light') }}
              >
                <div className="gen-page__model-list-info">
                  <span className="gen-page__model-name">{m.name}</span>
                  <span className="gen-page__model-provider">{m.provider} · {m.description}</span>
                </div>
                <div className="gen-page__model-right">
                  <span className="gen-page__model-cost-sm">{m.cost} 🔥</span>
                  {selectedModel === m.name && <Check size={14} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
              onRetry={() => {
                generate({ type: 'image', model: gen.modelSlug, prompt: gen.prompt, settings: gen.settings })
              }}
            />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      <div className="gen-page__input-area">
        <div className="chat-input__row">
          <button className="gen-page__dice-btn" onClick={insertExample}>
            <Shuffle size={16} />
          </button>
          <div className="chat-input__field-wrap">
            <textarea
              ref={inputRef}
              className="chat-input__field"
              placeholder="Опишите изображение..."
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
            {isGenerating ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="gen-settings-modal" onClick={() => setShowSettings(false)}>
          <div className="gen-settings-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="gen-settings-modal__header">
              <h2 className="gen-settings-modal__title">
                <Settings size={16} />
                Настройки · {selectedModel}
              </h2>
              <button className="gen-settings-modal__close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="gen-settings-modal__body">
              <div className="gen-field">
                <label className="gen-field__label"><Maximize2 size={13} /> Размер</label>
                <div className="gen-field__chips">
                  {caps.sizes.map((s) => (
                    <button key={s} className={`gen-chip ${size === s ? 'gen-chip--active' : ''}`}
                      onClick={() => { setSize(s); haptic('light') }}>
                      {sizeLabels[s] || s}
                    </button>
                  ))}
                </div>
              </div>

              {caps.qualities.length > 1 && (
                <div className="gen-field">
                  <label className="gen-field__label"><Layers size={13} /> Качество</label>
                  <div className="gen-field__chips">
                    {caps.qualities.map((q) => (
                      <button key={q} className={`gen-chip ${quality === q ? 'gen-chip--active' : ''}`}
                        onClick={() => { setQuality(q); haptic('light') }}>
                        {q === 'standard' ? 'Стандарт' : q === 'hd' ? 'HD' : q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {caps.styles.length > 0 && (
                <div className="gen-field">
                  <label className="gen-field__label"><Palette size={13} /> Стиль</label>
                  <div className="gen-field__chips gen-field__chips--wrap">
                    <button className={`gen-chip ${!style ? 'gen-chip--active' : ''}`}
                      onClick={() => { setStyle(''); haptic('light') }}>Авто</button>
                    {caps.styles.map((s) => (
                      <button key={s} className={`gen-chip ${style === s ? 'gen-chip--active' : ''}`}
                        onClick={() => { setStyle(s); haptic('light') }}>
                        {styleLabels[s] || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {caps.maxCount > 1 && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    Количество: {count}
                    <span className="gen-field__hint">× {modelCost} = {modelCost * count} 🔥</span>
                  </label>
                  <input type="range" min={1} max={caps.maxCount} value={count}
                    onChange={(e) => setCount(Number(e.target.value))} className="gen-range" />
                </div>
              )}

              {caps.supportsNegativePrompt && (
                <div className="gen-field">
                  <label className="gen-field__label">
                    Исключить из генерации
                    <span className="gen-field__hint">Negative prompt</span>
                  </label>
                  <textarea className="gen-field__textarea"
                    placeholder="ugly, blurry, bad anatomy, watermark..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)} rows={2} />
                </div>
              )}

              <div className="gen-field">
                <label className="gen-field__label">
                  Seed <span className="gen-field__hint">Для воспроизводимости</span>
                </label>
                <div className="gen-field__seed-row">
                  <input type="number" className="gen-field__seed-input" placeholder="Случайный"
                    value={seed ?? ''}
                    onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)} />
                  <button className="gen-field__seed-random" onClick={randomSeed}>
                    <Shuffle size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}