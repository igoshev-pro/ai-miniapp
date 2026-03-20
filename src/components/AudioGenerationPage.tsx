'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Paperclip, Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { useModelsStore } from '@/stores/models.store'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

const elevenLabsVoices = ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam']
const languages = ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'ko', 'zh']

export function AudioGenerationPage() {
  const { haptic, hapticNotification } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const modelsStore = useModelsStore()

  const audioModels = modelsStore.models.filter(m => m.category === 'audio')

  const [selectedModelSlug, setSelectedModelSlug] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Suno settings
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)

  // ElevenLabs settings
  const [voiceId, setVoiceId] = useState('Rachel')
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)

  const [audioFile, setAudioFile] = useState<File | null>(null)

  // Выбираем первую модель по умолчанию
  useEffect(() => {
    if (!selectedModelSlug && audioModels.length > 0) {
      setSelectedModelSlug(audioModels[0].slug)
    }
  }, [audioModels, selectedModelSlug])

  const selectedModel = audioModels.find(m => m.slug === selectedModelSlug)
  const isElevenLabs = selectedModelSlug.includes('elevenlabs')
  const isSuno = selectedModelSlug.includes('suno')

  // Reset on model change
  useEffect(() => {
    setPrompt('')
    setAudioFile(null)
    setDuration(30)
    setCustomMode(false)
    setInstrumental(false)
    setStyle('')
    setLanguage('ru')
    setVoiceId('Rachel')
    setStability(50)
    setSimilarity(75)
  }, [selectedModelSlug])

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
      toast.warning('Введите текст или загрузите аудио файл')
      return
    }

    const cost = selectedModel?.cost ?? 5
    if (balance < cost) {
      toast.warning(`Недостаточно спичек. Нужно ${cost}, у вас ${balance}`)
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

    if (audioFile) {
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
      model: selectedModelSlug,
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
    selectedModelSlug, selectedModel, haptic, hapticNotification, isElevenLabs, isSuno,
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

  if (audioModels.length === 0) {
    return (
      <div className="gen-page">
        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
          <Music size={48} />
          <p>Аудио модели загружаются...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gen-page">
      <div className="gen-page__header">
        <button className="gen-page__model-select" onClick={() => setShowModelPicker(!showModelPicker)}>
          <Music size={16} />
          <span>{selectedModel?.name || selectedModelSlug}</span>
          <ChevronDown size={14} className={showModelPicker ? 'rotate-180' : ''} />
        </button>
        <button className="gen-page__settings-button" onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        {showModelPicker && (
          <div className="gen-page__model-list">
            {audioModels.map(model => (
              <button
                key={model.slug}
                className={`gen-page__model-list-item ${selectedModelSlug === model.slug ? 'selected' : ''}`}
                onClick={() => { setSelectedModelSlug(model.slug); setShowModelPicker(false); haptic('light') }}
              >
                <span>{model.name}</span>
                <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{model.cost} 🔥</span>
                {selectedModelSlug === model.slug && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="gen-page__input-area">
        {isElevenLabs && (
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
          placeholder={isSuno ? 'Опишите музыку...' : isElevenLabs ? 'Введите текст для озвучки...' : 'Введите текст...'}
          disabled={isGenerating}
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