'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronDown, Send, Check, X, Music, Settings, Paperclip, Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useUser } from '@/hooks'
import { useModels } from '@/hooks/useModels'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

const elevenLabsVoices = ['Adam', 'Antoni', 'Arnold', 'Bella', 'Domi', 'Elli', 'Josh', 'Rachel', 'Sam']
const languages = ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'ko', 'zh']

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    padding: '12px 16px',
    gap: 12,
    overflow: 'auto',
  },

  /* ── Header ── */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    position: 'relative' as const,
    height: 44,
  },
  modelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 14px',
    borderRadius: 12,
    background: '#1c1c1e',
    border: '1px solid #2c2c2e',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
    height: 44,
  },
  modelBtnName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#1c1c1e',
    border: '1px solid #2c2c2e',
    color: '#aaa',
    cursor: 'pointer',
    flexShrink: 0,
  },

  /* ── Dropdown ── */
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#1c1c1e',
    border: '1px solid #333',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 100,
    maxHeight: 260,
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #222',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  dropdownItemSelected: {
    background: '#2a2a2e',
  },
  dropdownCost: {
    fontSize: 11,
    opacity: 0.5,
    marginLeft: 8,
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  /* ── Bottom bar: fixed ── */
  bottomBar: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
    background: '#111',
    borderTop: '1px solid #2c2c2e',
    zIndex: 50,
  },
  attachIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#1c1c1e',
    border: '1px solid #2c2c2e',
    color: '#aaa',
    cursor: 'pointer',
    flexShrink: 0,
  },
  attachIconActive: {
    borderColor: '#f57c00',
    color: '#f57c00',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    padding: '10px 14px',
    borderRadius: 12,
    background: '#1c1c1e',
    border: '1px solid #2c2c2e',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none' as const,
    height: 44,
    lineHeight: '22px',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#f57c00',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },

  /* ── Settings modal ── */
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80vh',
    background: '#1c1c1e',
    borderRadius: 16,
    padding: '24px 20px 28px',
    overflowY: 'auto' as const,
    position: 'relative' as const,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  modalClose: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    background: '#333',
    border: 'none',
    borderRadius: 8,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    color: '#ccc',
    fontSize: 13,
  },
  fieldLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#ccc',
    fontSize: 14,
    cursor: 'pointer',
  },
  fieldInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  fieldSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  fieldRange: {
    width: '100%',
    accentColor: '#f57c00',
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: '#f57c00',
  },

  /* ── Results ── */
  results: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    paddingBottom: 80, // чтобы не перекрывал fixed bar
  },
  resultItem: {
    background: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #2c2c2e',
  },
  resultPrompt: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    display: 'flex',
    gap: 6,
    alignItems: 'baseline',
  },
  resultModel: {
    fontSize: 11,
    color: '#f57c00',
    fontWeight: 600,
    flexShrink: 0,
  },
  loading: {
    padding: 40,
    textAlign: 'center' as const,
    color: '#666',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  hidden: { display: 'none' },
}

export function AudioGenerationPage() {
  const { haptic, hapticNotification } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const audioModels = allModels.filter(m => m.category === 'audio')

  const [selectedModelSlug, setSelectedModelSlug] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)

  const [voiceId, setVoiceId] = useState('Rachel')
  const [language, setLanguage] = useState('ru')
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)

  const [audioFile, setAudioFile] = useState<File | null>(null)

  useEffect(() => {
    if (!selectedModelSlug && audioModels.length > 0) setSelectedModelSlug(audioModels[0].slug)
  }, [audioModels, selectedModelSlug])

  const selectedModel = audioModels.find(m => m.slug === selectedModelSlug)
  const isElevenLabs = selectedModelSlug.includes('elevenlabs')
  const isSuno = selectedModelSlug.includes('suno')

  useEffect(() => {
    setPrompt(''); setAudioFile(null); setDuration(30); setCustomMode(false)
    setInstrumental(false); setStyle(''); setLanguage('ru'); setVoiceId('Rachel')
    setStability(50); setSimilarity(75)
  }, [selectedModelSlug])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) { toast.error('Только аудиофайлы'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Макс 10МБ'); return }
    setAudioFile(file)
  }

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !audioFile) { toast.warning('Введите текст или загрузите аудио'); return }
    const cost = selectedModel?.cost ?? 5
    if (balance < cost) { toast.warning(`Нужно ${cost} спичек`); hapticNotification('error'); return }
    setIsGenerating(true); haptic('medium')

    const settings: Record<string, any> = {}
    if (isSuno) { settings.customMode = customMode; settings.instrumental = instrumental; if (style.trim()) settings.style = style.trim(); settings.duration = duration }
    if (isElevenLabs) { settings.voiceId = voiceId; settings.language = language; settings.stability = stability / 100; settings.similarity = similarity / 100; if (style.trim()) settings.style = style.trim() }

    if (audioFile) {
      try {
        const fd = new FormData(); fd.append('file', audioFile)
        const resp = await fetch('/api/upload/audio', { method: 'POST', body: fd })
        if (!resp.ok) throw new Error('Ошибка загрузки')
        settings.audioUrl = (await resp.json()).url
      } catch (e: any) { toast.error(e.message); setIsGenerating(false); return }
    }

    const gen = await generate({ type: 'audio', model: selectedModelSlug, prompt: prompt.trim(), settings })
    setIsGenerating(false)
    if (gen) { setPrompt(''); setAudioFile(null); hapticNotification('success'); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200) }
  }, [prompt, audioFile, balance, customMode, instrumental, style, duration, voiceId, language, stability, similarity, generate, selectedModelSlug, selectedModel, haptic, hapticNotification, isElevenLabs, isSuno])

  const renderSunoSettings = () => (
    <div style={S.fieldGroup}>
      <label style={S.fieldLabelRow}>
        <input type="checkbox" style={S.checkbox} checked={customMode} onChange={e => setCustomMode(e.target.checked)} disabled={isGenerating} />
        Custom Mode
      </label>
      <label style={S.fieldLabelRow}>
        <input type="checkbox" style={S.checkbox} checked={instrumental} onChange={e => setInstrumental(e.target.checked)} disabled={isGenerating} />
        Инструментал (без вокала)
      </label>
      <label style={S.fieldLabel}>Стиль<input style={S.fieldInput} type="text" value={style} onChange={e => setStyle(e.target.value)} placeholder="pop, rock, jazz..." disabled={isGenerating} /></label>
      <label style={S.fieldLabel}>Длительность: {duration} сек<input style={S.fieldRange} type="range" min={5} max={300} step={5} value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={isGenerating} /></label>
    </div>
  )

  const renderElevenLabsSettings = () => (
    <div style={S.fieldGroup}>
      <label style={S.fieldLabel}>Голос<select style={S.fieldSelect} value={voiceId} onChange={e => setVoiceId(e.target.value)} disabled={isGenerating}>{elevenLabsVoices.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label style={S.fieldLabel}>Язык<select style={S.fieldSelect} value={language} onChange={e => setLanguage(e.target.value)} disabled={isGenerating}>{languages.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
      <label style={S.fieldLabel}>Стабильность: {stability}%<input style={S.fieldRange} type="range" min={0} max={100} step={5} value={stability} onChange={e => setStability(Number(e.target.value))} disabled={isGenerating} /></label>
      <label style={S.fieldLabel}>Схожесть: {similarity}%<input style={S.fieldRange} type="range" min={0} max={100} step={5} value={similarity} onChange={e => setSimilarity(Number(e.target.value))} disabled={isGenerating} /></label>
      <label style={S.fieldLabel}>Стиль<input style={S.fieldInput} type="text" value={style} onChange={e => setStyle(e.target.value)} disabled={isGenerating} /></label>
    </div>
  )

  if (audioModels.length === 0) {
    return <div style={S.page}><div style={S.loading}><Music size={48} /><p>Аудио модели загружаются...</p></div></div>
  }

  const canSend = !isGenerating && (prompt.trim() || audioFile)

  return (
    <div style={S.page}>
      {/* ═══ HEADER ═══ */}
      <div style={S.header}>
        <button style={S.modelBtn} onClick={() => setShowModelPicker(!showModelPicker)}>
          <Music size={16} />
          <span style={S.modelBtnName}>{selectedModel?.name || selectedModelSlug}</span>
          <ChevronDown size={14} style={{ transform: showModelPicker ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
        <button style={S.settingsBtn} onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        {showModelPicker && (
          <div style={S.dropdown}>
            {audioModels.map(model => (
              <button key={model.slug} style={{ ...S.dropdownItem, ...(selectedModelSlug === model.slug ? S.dropdownItemSelected : {}) }}
                onClick={() => { setSelectedModelSlug(model.slug); setShowModelPicker(false); haptic('light') }}>
                <span>{model.name}</span>
                <span style={S.dropdownCost}>{model.cost} 🔥{selectedModelSlug === model.slug && <Check size={14} />}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ RESULTS ═══ */}
      <div style={S.results} ref={resultsRef}>
        {generations.filter(g => g.type === 'audio').map(generation => (
          <div key={generation.id} style={S.resultItem}>
            <div style={S.resultPrompt}>
              <span style={S.resultModel}>{generation.model}</span>
              <span>{generation.prompt}</span>
            </div>
            <MediaResult generation={generation} onRetry={() => generate({ type: 'audio', model: generation.modelSlug, prompt: generation.prompt, settings: generation.settings })} />
          </div>
        ))}
      </div>

      {/* ═══ BOTTOM FIXED BAR: attach + input + send ═══ */}
      <div style={S.bottomBar}>
        {isElevenLabs && (
          <button
            style={{ ...S.attachIcon, ...(audioFile ? S.attachIconActive : {}) }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
          >
            <Paperclip size={20} />
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="audio/*" style={S.hidden} onChange={handleFileChange} disabled={isGenerating} />

        <textarea
          ref={inputRef}
          style={S.textInput}
          placeholder={isSuno ? 'Опишите музыку...' : isElevenLabs ? 'Текст для озвучки...' : 'Введите текст...'}
          disabled={isGenerating}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={1}
        />

        <button style={{ ...S.sendBtn, ...(!canSend ? S.sendBtnDisabled : {}) }} onClick={handleGenerate} disabled={!canSend}>
          {isGenerating ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
        </button>
      </div>

      {/* ═══ SETTINGS MODAL — по центру ═══ */}
      {showSettings && (
        <div style={S.overlay} onClick={() => setShowSettings(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <button style={S.modalClose} onClick={() => setShowSettings(false)}><X size={16} /></button>
            <div style={S.modalTitle}>
              {isSuno ? '🎵 Настройки Suno' : isElevenLabs ? '🎙️ Настройки ElevenLabs' : '⚙️ Настройки'}
            </div>
            {isSuno && renderSunoSettings()}
            {isElevenLabs && renderElevenLabsSettings()}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}