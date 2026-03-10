// src/components/AudioGenerationPage.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Mic, Settings, Wand2,
  Clock, Loader2, Shuffle, Volume2, Languages,
  Paperclip,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { allModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

const audioModels = allModels.filter((m) => m.category === 'audio')

const modelCapabilities: Record<string, {
  type: 'music' | 'tts' | 'sfx'
  maxDuration: number; minDuration: number
  genres: string[]; moods: string[]; voices: string[]; languages: string[]
  supportsLyrics: boolean; supportsInstrumental: boolean
}> = {
  'suno-v4': {
    type: 'music', maxDuration: 240, minDuration: 30,
    genres: ['pop', 'rock', 'hip-hop', 'jazz', 'electronic', 'classical', 'r&b', 'country', 'metal', 'folk', 'indie', 'lo-fi', 'ambient', 'latin', 'k-pop'],
    moods: ['happy', 'sad', 'energetic', 'calm', 'aggressive', 'romantic', 'epic', 'dark', 'dreamy', 'uplifting'],
    voices: [], languages: ['ru', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'],
    supportsLyrics: true, supportsInstrumental: true,
  },
  'elevenlabs': {
    type: 'tts', maxDuration: 300, minDuration: 5,
    genres: [], moods: [],
    voices: ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam'],
    languages: ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'ko', 'zh'],
    supportsLyrics: false, supportsInstrumental: false,
  },
}

const genreLabels: Record<string, string> = {
  'pop': 'Pop', 'rock': 'Rock', 'hip-hop': 'Hip-Hop', 'jazz': 'Jazz',
  'electronic': 'Electronic', 'classical': 'Classical', 'r&b': 'R&B',
  'country': 'Country', 'metal': 'Metal', 'folk': 'Folk',
  'indie': 'Indie', 'lo-fi': 'Lo-Fi', 'ambient': 'Ambient',
  'latin': 'Latin', 'k-pop': 'K-Pop',
}

const moodLabels: Record<string, string> = {
  'happy': '😊 Весёлый', 'sad': '😢 Грустный', 'energetic': '⚡ Энергичный',
  'calm': '🧘 Спокойный', 'aggressive': '🔥 Агрессивный', 'romantic': '💕 Романтичный',
  'epic': '🎬 Эпичный', 'dark': '🌑 Тёмный', 'dreamy': '☁️ Мечтательный',
  'uplifting': '🌅 Вдохновляющий',
}

const langLabels: Record<string, string> = {
  'ru': '🇷🇺 Русский', 'en': '🇬🇧 English', 'es': '🇪🇸 Español',
  'fr': '🇫🇷 Français', 'de': '🇩🇪 Deutsch', 'it': '🇮🇹 Italiano',
  'pt': '🇵🇹 Português', 'pl': '🇵🇱 Polski', 'hi': '🇮🇳 Hindi',
  'ja': '🇯🇵 日本語', 'ko': '🇰🇷 한국어', 'zh': '🇨🇳 中文',
}

const musicExamples = [
  'Энергичный поп-трек о летних приключениях, с запоминающимся припевом',
  'Лофай бит для учёбы, пианино и мягкие барабаны, дождь за окном',
  'Эпичная оркестровая тема для фэнтези фильма, хор, валторны',
  'Грустная инди-баллада о расставании, акустическая гитара',
  'Ретровейв 80s, синтезаторы, драм-машина, ностальгия',
]

const ttsExamples = [
  'Привет! Это тестовая озвучка текста. Надеюсь, вам нравится мой голос.',
  'Breaking news: scientists have discovered that AI can now generate realistic human speech.',
  'Добро пожаловать на наш подкаст. Сегодня мы поговорим о будущем технологий.',
]

export function AudioGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()

  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(audioModels[0]?.name ?? '')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [genre, setGenre] = useState('')
  const [mood, setMood] = useState('')
  const [duration, setDuration] = useState(60)
  const [isInstrumental, setIsInstrumental] = useState(false)
  const [language, setLanguage] = useState('ru')

  const [voice, setVoice] = useState('Rachel')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentModel = audioModels.find((m) => m.name === selectedModel)
  const modelSlug = currentModel?.slug || 'suno-v4'
  const modelCost = currentModel?.cost || 5
  const caps = modelCapabilities[modelSlug] || modelCapabilities['suno-v4']
  const isMusic = caps.type === 'music'
  const isTTS = caps.type === 'tts'

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
    setGenre(''); setMood(''); setDuration(isMusic ? 60 : 30)
    setIsInstrumental(false); setLanguage('ru')
    setVoice(caps.voices[0] || 'Rachel'); setStability(50); setSimilarity(75)
  }, [modelSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const audioGenerations = generations.filter((g: any) => g.type === 'audio')
  const durationMultiplier = isTTS ? Math.ceil(duration / 30) : 1
  const totalCost = modelCost * durationMultiplier

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return
    if (balance < totalCost) {
      toast.warning(`Недостаточно спичек. Нужно ${totalCost}, у вас ${balance}`)
      hapticNotification('error'); return
    }
    haptic('medium'); setIsGenerating(true)
    const settings: Record<string, unknown> = { language }
    if (isMusic) {
      settings.duration = duration
      if (genre) settings.genre = genre
      if (mood) settings.mood = mood
      settings.instrumental = isInstrumental
    }
    if (isTTS) {
      settings.voice = voice
      settings.stability = stability / 100
      settings.similarity = similarity / 100
    }
    const result = await generate({ type: 'audio', model: modelSlug, prompt, settings })
    setIsGenerating(false)
    if (result) {
      setInput(''); hapticNotification('success')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [input, balance, totalCost, modelSlug, genre, mood, duration, isInstrumental, language, voice, stability, similarity, isMusic, isTTS, haptic, hapticNotification, generate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
  }

  const insertExample = () => {
    const examples = isMusic ? musicExamples : ttsExamples
    setInput(examples[Math.floor(Math.random() * examples.length)]); haptic('light')
  }

  return (
    <div className="gen-page">
      <div className="gen-page__header fade-in fade-in--1">
        <div className="gen-page__model-select-container">
          <button className="gen-page__model-select"
            onClick={() => { setShowModelPicker(!showModelPicker); haptic('light') }}>
            {isMusic ? <Music size={16} /> : <Mic size={16} />}
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
          {isMusic && genre && <span>{genreLabels[genre] || genre}</span>}
          {isMusic && mood && <><span>·</span><span>{moodLabels[mood]?.split(' ')[0]}</span></>}
          {isMusic && <><span>·</span><span>{duration}с</span></>}
          {isMusic && isInstrumental && <><span>·</span><span>🎵 Без вокала</span></>}
          {isTTS && <><span>🗣 {voice}</span><span>·</span><span>{langLabels[language]?.split(' ')[0]}</span></>}
        </div>

        {showModelPicker && (
          <div className="gen-page__model-list fade-in">
            {audioModels.map((m) => {
              const mCaps = modelCapabilities[m.slug]
              return (
                <button key={m.id}
                  className={`gen-page__model-list-item ${selectedModel === m.name ? 'selected' : ''}`}
                  onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); haptic('light') }}>
                  <div className="gen-page__model-list-info">
                    <span className="gen-page__model-name">{m.name}</span>
                    <span className="gen-page__model-provider">
                      {m.provider} · {mCaps?.type === 'music' ? 'Музыка и песни' : 'Озвучка текста'}
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
        {audioGenerations.length === 0 && (
          <div className="gen-page__empty fade-in fade-in--2">
            <div className="gen-page__empty-icon">
              {isMusic ? <Music size={36} strokeWidth={1.5} /> : <Mic size={36} strokeWidth={1.5} />}
            </div>
            <div className="gen-page__empty-title">{isMusic ? 'Генерация музыки' : 'Озвучка текста'}</div>
            <div className="gen-page__empty-text">
              {isMusic
                ? 'Опишите песню: жанр, настроение, инструменты. Можете написать текст песни.'
                : 'Введите текст для озвучки. Выберите голос и язык в настройках.'}
            </div>
            <button className="gen-page__example-btn" onClick={insertExample}>
              <Wand2 size={14} /> Пример
            </button>
          </div>
        )}
        {audioGenerations.map((gen: any) => (
          <div key={gen.id} className="gen-page__result-item fade-in">
            <div className="gen-page__result-prompt">
              <span className="gen-page__result-model">{gen.model}</span>
              {gen.prompt.length > 150 ? gen.prompt.slice(0, 150) + '...' : gen.prompt}
            </div>
            <MediaResult generation={gen}
              onRetry={() => { generate({ type: 'audio', model: gen.modelSlug, prompt: gen.prompt, settings: gen.settings }) }} />
          </div>
        ))}
        <div ref={resultsRef} />
      </div>

      <div className="gen-page__input-area">
        <div className="chat-input__row">
          <button
            className={`chat-input__attach ${showAttachMenu ? 'chat-input__attach--active' : ''}`}
            onClick={() => { setShowAttachMenu(!showAttachMenu); haptic('light') }}
          >
            <Paperclip size={18} />
          </button>
          <div className="chat-input__field-wrap">
            <textarea ref={inputRef} className="chat-input__field"
              placeholder={isMusic ? 'Опишите песню или напишите текст...' : 'Введите текст для озвучки...'}
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
              <h2 className="gen-settings-modal__title">
                {isMusic ? <Music size={16} /> : <Mic size={16} />}
                Настройки · {selectedModel}
              </h2>
              <button className="gen-settings-modal__close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="gen-settings-modal__body">
              {isMusic && (
                <>
                  <div className="gen-field">
                    <label className="gen-field__label"><Music size={13} /> Жанр</label>
                    <div className="gen-field__chips gen-field__chips--wrap">
                      <button className={`gen-chip ${!genre ? 'gen-chip--active' : ''}`}
                        onClick={() => { setGenre(''); haptic('light') }}>Авто</button>
                      {caps.genres.map((g) => (
                        <button key={g} className={`gen-chip ${genre === g ? 'gen-chip--active' : ''}`}
                          onClick={() => { setGenre(g); haptic('light') }}>{genreLabels[g] || g}</button>
                      ))}
                    </div>
                  </div>

                  <div className="gen-field">
                    <label className="gen-field__label">Настроение</label>
                    <div className="gen-field__chips gen-field__chips--wrap">
                      <button className={`gen-chip ${!mood ? 'gen-chip--active' : ''}`}
                        onClick={() => { setMood(''); haptic('light') }}>Авто</button>
                      {caps.moods.map((m) => (
                        <button key={m} className={`gen-chip ${mood === m ? 'gen-chip--active' : ''}`}
                          onClick={() => { setMood(m); haptic('light') }}>{moodLabels[m] || m}</button>
                      ))}
                    </div>
                  </div>

                  <div className="gen-field">
                    <label className="gen-field__label"><Clock size={13} /> Длительность: {duration} сек</label>
                    <input type="range" className="gen-range" min={caps.minDuration} max={caps.maxDuration}
                      step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                    <div className="gen-field__range-labels">
                      <span>{caps.minDuration}с</span><span>{caps.maxDuration}с (4 мин)</span>
                    </div>
                  </div>

                  {caps.supportsInstrumental && (
                    <div className="gen-field">
                      <label className="gen-field__label">Тип</label>
                      <div className="gen-field__chips">
                        <button className={`gen-chip ${!isInstrumental ? 'gen-chip--active' : ''}`}
                          onClick={() => { setIsInstrumental(false); haptic('light') }}>🎤 С вокалом</button>
                        <button className={`gen-chip ${isInstrumental ? 'gen-chip--active' : ''}`}
                          onClick={() => { setIsInstrumental(true); haptic('light') }}>🎵 Инструментал</button>
                      </div>
                    </div>
                  )}

                  {!isInstrumental && caps.supportsLyrics && (
                    <div className="gen-field">
                      <label className="gen-field__label"><Languages size={13} /> Язык вокала</label>
                      <div className="gen-field__chips gen-field__chips--wrap">
                        {caps.languages.map((l) => (
                          <button key={l} className={`gen-chip ${language === l ? 'gen-chip--active' : ''}`}
                            onClick={() => { setLanguage(l); haptic('light') }}>{langLabels[l] || l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isTTS && (
                <>
                  <div className="gen-field">
                    <label className="gen-field__label"><Volume2 size={13} /> Голос</label>
                    <div className="gen-field__chips gen-field__chips--wrap">
                      {caps.voices.map((v) => (
                        <button key={v} className={`gen-chip ${voice === v ? 'gen-chip--active' : ''}`}
                          onClick={() => { setVoice(v); haptic('light') }}>{v}</button>
                      ))}
                    </div>
                  </div>

                  <div className="gen-field">
                    <label className="gen-field__label"><Languages size={13} /> Язык</label>
                    <div className="gen-field__chips gen-field__chips--wrap">
                      {caps.languages.map((l) => (
                        <button key={l} className={`gen-chip ${language === l ? 'gen-chip--active' : ''}`}
                          onClick={() => { setLanguage(l); haptic('light') }}>{langLabels[l] || l}</button>
                      ))}
                    </div>
                  </div>

                  <div className="gen-field">
                    <label className="gen-field__label">
                      Стабильность: {stability}%
                      <span className="gen-field__hint">Выше = стабильнее, ниже = экспрессивнее</span>
                    </label>
                    <input type="range" className="gen-range" min={0} max={100} step={5}
                      value={stability} onChange={(e) => setStability(Number(e.target.value))} />
                    <div className="gen-field__range-labels"><span>Экспрессия</span><span>Стабильность</span></div>
                  </div>

                  <div className="gen-field">
                    <label className="gen-field__label">
                      Схожесть с оригиналом: {similarity}%
                      <span className="gen-field__hint">Точность воспроизведения голоса</span>
                    </label>
                    <input type="range" className="gen-range" min={0} max={100} step={5}
                      value={similarity} onChange={(e) => setSimilarity(Number(e.target.value))} />
                    <div className="gen-field__range-labels"><span>Разнообразие</span><span>Точность</span></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}