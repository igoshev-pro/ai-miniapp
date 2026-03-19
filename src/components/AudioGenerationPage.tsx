'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Mic, Settings, Wand2,
  Clock, Loader2, Languages, Paperclip, Upload
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

// Списки поддерживаемых моделей
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

// Возможные голоса ElevenLabs (можно подгрузить из настроек / API)
const elevenLabsVoices = ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam']

// Поддерживаемые языки
const languages = ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'ko', 'zh']

export function AudioGenerationPage() {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()

  // Выбранная модель
  const [selectedModel, setSelectedModel] = useState('suno-v4')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Параметры для Suno
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('') // для Suno и ElevenLabs стилевые параметры
  const [duration, setDuration] = useState(30)

  // Параметры для ElevenLabs
  const [voiceId, setVoiceId] = useState('Rachel')
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)

  // Для загрузки аудио (файлы)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Проверяем тип модели
  const isElevenLabs = elevenLabsModels.has(selectedModel)
  const isSuno = sunoModels.has(selectedModel)

  // Максимальные и минимальные длительности можно запрограммировать отдельно
  const minDuration = 5
  const maxDuration = 300

  useEffect(() => {
    // Reset параметры при смене модели
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

  // Генерация аудио, с передачей параметров для выбранных моделей
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !audioFile) {
      toast.warning('Введите текст или загрузите аудио файл (для распознавания или шума)')
      return
    }

    if (balance < 5) { // Можно считать стоимость динамически
      toast.warning('Недостаточно спичек для генерации')
      hapticNotification('error')
      return
    }

    setIsGenerating(true)
    haptic('medium')

    // Формируем настройки для запроса по модели и ее возможностям
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

    // Для моделей, которые требуют загрузку аудиофайла (speech-to-text, audio-isolation)
    if (audioFile && (selectedModel === 'elevenlabs/audio-isolation' || selectedModel === 'elevenlabs/speech-to-text')) {
      try {
        // Загружаем аудио файл на сервер (предполагается эндпоинт /upload/audio)
        const formData = new FormData()
        formData.append('file', audioFile)

        const resp = await fetch('/api/upload/audio', { // уточнить реальный URL загрузки в вашем бэкенде
          method: 'POST',
          body: formData
        })
        if (!resp.ok) throw new Error('Ошибка загрузки аудио файла')
        const data = await resp.json()
        // В settings передаем ссылку или id файла для генерации
        settings.audioUrl = data.url // или data.fileId и аналогично в бэкенде использовать
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

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 200)
    }
  }, [
    prompt, audioFile, balance, customMode, instrumental, style,
    duration, voiceId, language, stability, similarity, generate,
    selectedModel, haptic, hapticNotification, isElevenLabs, isSuno,
  ])

  // Обработка выбора файла для загрузки аудио
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
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

  // Отображение кнопок дополнительных функций для Suno моделей
  const renderSunoSettings = () => (
    <>
      <label>
        <input
          type="checkbox"
          checked={customMode}
          onChange={e => setCustomMode(e.target.checked)}
          disabled={isGenerating}
        />
        Custom Mode
      </label>
      <label>
        <input
          type="checkbox"
          checked={instrumental}
          onChange={e => setInstrumental(e.target.checked)}
          disabled={isGenerating}
        />
        Инструментал (без вокала)
      </label>
      <label>
        Стиль:
        <input
          type="text"
          value={style}
          onChange={e => setStyle(e.target.value)}
          placeholder="Введите стиль"
          disabled={isGenerating}
        />
      </label>
      <label>
        Длительность (сек):
        <input
          type="number"
          min={minDuration}
          max={maxDuration}
          value={duration}
          onChange={e => setDuration(Math.min(maxDuration, Math.max(minDuration, Number(e.target.value))))}
          disabled={isGenerating}
        />
      </label>
    </>
  )

  // Отображение настроек ElevenLabs
  const renderElevenLabsSettings = () => (
    <>
      <label>
        Голос:
        <select
          value={voiceId}
          onChange={e => setVoiceId(e.target.value)}
          disabled={isGenerating}
        >
          {elevenLabsVoices.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Язык:
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          disabled={isGenerating}
        >
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <label>
        Стабильность: {stability}%
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={stability}
          onChange={e => setStability(Number(e.target.value))}
          disabled={isGenerating}
        />
      </label>
      <label>
        Схожесть с оригиналом: {similarity}%
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={similarity}
          onChange={e => setSimilarity(Number(e.target.value))}
          disabled={isGenerating}
        />
      </label>
      <label>
        Стиль (опционально):
        <input
          type="text"
          value={style}
          onChange={e => setStyle(e.target.value)}
          disabled={isGenerating}
        />
      </label>
    </>
  )

  return (
    <div className="gen-page">
      <div className="gen-page__header">
        <button onClick={() => setShowModelPicker(!showModelPicker)}>
          <Music size={16} /> <span>{selectedModel}</span> <ChevronDown size={14} />
        </button>
        <button onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        {showModelPicker && (
          <div className="gen-page__model-list">
            {[...elevenLabsModels, ...sunoModels].map(model => (
              <button
                key={model}
                className={model === selectedModel ? 'selected' : ''}
                onClick={() => {
                  setSelectedModel(model)
                  setShowModelPicker(false)
                  haptic('light')
                }}>
                {model}
                {model === selectedModel && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="gen-page__input-area">
        {(selectedModel === 'elevenlabs/audio-isolation' ||
          selectedModel === 'elevenlabs/speech-to-text') && (
            <>
              <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
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
          placeholder={
            selectedModel === 'elevenlabs/speech-to-text'
              ? 'Текст не нужен. Загрузите аудио.'
              : 'Введите текст для синтеза...'
          }
          disabled={
            isGenerating ||
            (!!audioFile && (selectedModel === 'elevenlabs/speech-to-text' || selectedModel === 'elevenlabs/audio-isolation'))
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <button onClick={handleGenerate} disabled={isGenerating || (!prompt.trim() && !audioFile)}>
          {isGenerating ? <Loader2 className="spin" /> : <Send />}
        </button>
      </div>

      {showSettings && (
        <div className="modal" onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSettings(false)}><X /></button>
            {isSuno && renderSunoSettings()}
            {isElevenLabs && renderElevenLabsSettings()}
          </div>
        </div>
      )}

      <div className="gen-page__results" ref={resultsRef}>
        {generations
          .filter(g => g.type === 'audio')
          .map(generation => (
            <div key={generation.id} className="generation-result">
              <div>{generation.model}</div>
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