'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Paperclip, Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

// Поддерживаемые модели
const elevenLabsModels = new Set([
  'elevenlabs/audio-isolation',
  'elevenlabs/sound-effect-v2',
  'elevenlabs/speech-to-text',
  'elevenlabs/text-to-dialogue-v3',
  'elevenlabs/text-to-speech-multilingual-v2',
  'elevenlabs/text-to-speech-turbo-2-5',
])

const sunoModels = new Set([
  'suno-v3',
  'suno-v4',
  'suno-v4_5',
  'suno-v4_5plus',
  'suno-v4_5all',
  'suno-v5',
])

const elevenLabsVoices = ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam']
const languages = ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'ko', 'zh']

export function AudioGenerationPage() {
  const { haptic, hapticNotification } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()

  const [selectedModel, setSelectedModel] = useState('suno-v4')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Suno-specific settings
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)

  // ElevenLabs-specific settings
  const [voiceId, setVoiceId] = useState('Rachel')
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)

  // Uploadable audio file for speech-to-text or audio-isolation
  const [audioFile, setAudioFile] = useState<File | null>(null)

  // Check model type
  const isElevenLabs = elevenLabsModels.has(selectedModel)
  const isSuno = sunoModels.has(selectedModel)

  // Reset params on model change
  useEffect(() => {
    setPrompt('')
    setAudioFile(null)
    setDuration(30)
    setCustomMode(false)
    setInstrumental(false)
    setStyle('')
    setLanguage('ru')
    setVoiceId(elevenLabsVoices[0] || 'Rachel')
    setStability(50)
    setSimilarity(75)
  }, [selectedModel])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      toast.error('Только аудиофайлы')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Максимальный размер файла 10МБ')
      return
    }
    setAudioFile(file)
  }

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !audioFile) {
      toast.warning('Введите текст или загрузите аудио файл (для распознавания или шума)')
      return
    }
    if (balance < 5) {
      toast.warning('Недостаточно спичек для генерации')
      hapticNotification('error')
      return
    }
    setIsGenerating(true)
    haptic('medium')

    const settings: Record<string, any> = {}

    if (isSuno) {
      settings.customMode = customMode
      settings.instrumental = instrumental
      if (style.trim()) settings.style = style.trim()
      settings.duration = duration
    }
    if (isElevenLabs) {
      settings.voiceId = voiceId
      settings.language = language
      settings.stability = stability / 100
      settings.similarity = similarity / 100
      if (style.trim()) settings.style = style.trim()
    }

    // Upload audio file if needed
    if (audioFile && (selectedModel === 'elevenlabs/audio-isolation' || selectedModel === 'elevenlabs/speech-to-text')) {
      try {
        const formData = new FormData()
        formData.append('file', audioFile)
        const resp = await fetch('/api/upload/audio', { method: 'POST', body: formData })
        if (!resp.ok) throw new Error('Ошибка загрузки аудио файла')
        const data = await resp.json()
        settings.audioUrl = data.url
      } catch (error: any) {
        toast.error(error.message || 'Ошибка загрузки аудио')
        setIsGenerating(false)
        return
      }
    }

    const gen = await generate({
      type: 'audio',
      model: selectedModel,
      prompt: prompt.trim(),
      settings,
    })

    setIsGenerating(false)

    if (gen) {
      setPrompt('')
      setAudioFile(null)
      hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [
    prompt, audioFile, balance, customMode, instrumental, style,
    duration, voiceId, language, stability, similarity, generate,
    selectedModel, haptic, hapticNotification, isElevenLabs, isSuno,
  ])

  const renderSunoSettings = () => (
    <>
      <label className="gen-field__label">
        <input type="checkbox" checked={customMode} onChange={e => setCustomMode(e.target.checked)} disabled={isGenerating} />
        Custom Mode
      </label>
      <label className="gen-field__label">
        <input type="checkbox" checked={instrumental} onChange={e => setInstrumental(e.target.checked)} disabled={isGenerating} />
        Инструментал (без вокала)
      </label>
      <label className="gen-field__label">
        Стиль:
        <input type="text" value={style} onChange={e => setStyle(e.target.value)} placeholder="Введите стиль" disabled={isGenerating} />
      </label>
      <label className="gen-field__label">
        Длительность (сек):
        <input type="number" min={5} max={300} value={duration} onChange={e => setDuration(Math.min(300, Math.max(5, Number(e.target.value))))} disabled={isGenerating} />
      </label>
    </>
  )

  const renderElevenLabsSettings = () => (
    <>
      <label className="gen-field__label">
        Голос:
        <select value={voiceId} onChange={e => setVoiceId(e.target.value)} disabled={isGenerating}>
          {elevenLabsVoices.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="gen-field__label">
        Язык:
        <select value={language} onChange={e => setLanguage(e.target.value)} disabled={isGenerating}>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <label className="gen-field__label">
        Стабильность: {stability}%
        <input type="range" min={0} max={100} step={5} value={stability} onChange={e => setStability(Number(e.target.value))} disabled={isGenerating} />
      </label>
      <label className="gen-field__label">
        Схожесть с оригиналом: {similarity}%
        <input type="range" min={0} max={100} step={5} value={similarity} onChange={e => setSimilarity(Number(e.target.value))} disabled={isGenerating} />
      </label>
      <label className="gen-field__label">
        Стиль (опционально):
        <input type="text" value={style} onChange={e => setStyle(e.target.value)} disabled={isGenerating} />
      </label>
    </>
  )

  return (
    <div className="gen-page">
      <div className="gen-page__header">
        <button className="gen-page__model-select" onClick={() => setShowModelPicker(!showModelPicker)}>
          <Music size={16} />
          <span>{selectedModel}</span>
          <ChevronDown size={14} className={showModelPicker ? 'rotate-180' : ''} />
        </button>
        <button className="gen-page__settings-button" onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        {showModelPicker && (
          <div className="gen-page__model-list">
            {[...elevenLabsModels, ...sunoModels].map(model => (
              <button
                key={model}
                className={`gen-page__model-list-item ${selectedModel === model ? 'selected' : ''}`}
                onClick={() => { setSelectedModel(model); setShowModelPicker(false); haptic('light') }}
              >
                {model}
                {selectedModel === model && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="gen-page__input-area">
        {(selectedModel === 'elevenlabs/audio-isolation' || selectedModel === 'elevenlabs/speech-to-text') && (
          <>
            <button className={`chat-input__attach ${audioFile ? 'chat-input__attach--active' : ''}`}
              onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
              <Paperclip size={18} />
              {audioFile ? `Файл: ${audioFile.name}` : 'Загрузить аудио'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isGenerating}
            />
          </>
        )}
        <textarea
          ref={inputRef}
          className="chat-input__field"
          placeholder={selectedModel === 'elevenlabs/speech-to-text' ? 'Текст не нужен. Загрузите аудио.' : 'Введите текст для синтеза...'}
          disabled={isGenerating || (!!audioFile && (selectedModel === 'elevenlabs/speech-to-text' || selectedModel === 'elevenlabs/audio-isolation'))}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
        />
        <button className="chat-input__send" onClick={handleGenerate} disabled={isGenerating || (!prompt.trim() && !audioFile)}>
          {isGenerating ? <Loader2 className="spin" /> : <Send />}
        </button>
      </div>

      {showSettings && (
        <div className="modal" onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSettings(false)} className="gen-settings-modal__close"><X /></button>
            {isSuno && renderSunoSettings()}
            {isElevenLabs && renderElevenLabsSettings()}
          </div>
        </div>
      )}

      <div className="gen-page__results" ref={resultsRef}>
        {generations.filter(g => g.type === 'audio').map(generation => (
          <div key={generation.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{generation.model}</span>
              {generation.prompt}
            </div>
            <MediaResult generation={generation} onRetry={() => {
              generate({
                type: 'audio',
                model: generation.modelSlug,
                prompt: generation.prompt,
                settings: generation.settings,
              })
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}