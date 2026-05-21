'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  Send,
  Check,
  X,
  Video,
  Settings,
  Wand2,
  Clock,
  Maximize2,
  Zap,
  Loader2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useGeneration, useModels, useUser } from '@/hooks'
import { MediaResult } from '@/components/ui/MediaResult'
import { toast } from '@/stores/toast.store'

/* ─── Types & Config ─── */

interface Props {
  onBack?: () => void
}

interface VideoModelCaps {
  aspectRatios: string[]
  durations: number[]
  qualities: string[]
  resolutions: string[]
  supportsImageInput: boolean
  supportsSound: boolean
  supportsRemoveWatermark: boolean
  hasMode: boolean
  hasQuality: boolean
}

const MODEL_CAPS: Record<string, VideoModelCaps> = {
  'sora-2':              { aspectRatios: ['landscape','portrait'], durations: [10,15], qualities: [], resolutions: [], supportsImageInput: false, supportsSound: false, supportsRemoveWatermark: true, hasMode: false, hasQuality: false },
  'sora-2-img2vid':      { aspectRatios: ['landscape','portrait'], durations: [10,15], qualities: [], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: true, hasMode: false, hasQuality: false },
  'kling-3.0':           { aspectRatios: ['16:9','9:16','1:1'], durations: [3,5,7,10,15], qualities: ['720p','1080p'], resolutions: [], supportsImageInput: false, supportsSound: true,  supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'kling-3.0-img2vid':   { aspectRatios: ['16:9','9:16','1:1'], durations: [3,5,7,10,15], qualities: ['720p','1080p'], resolutions: [], supportsImageInput: true,  supportsSound: true,  supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'kling-3.0-motion':    { aspectRatios: [], durations: [], qualities: ['720p','1080p'], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'runway':              { aspectRatios: ['16:9','9:16','1:1','4:3','3:4'], durations: [5,10], qualities: ['720p','1080p'], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'hailuo-2.3-standard': { aspectRatios: [], durations: [6,10], qualities: [], resolutions: [], supportsImageInput: false, supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: false },
  'hailuo-2.3-pro':      { aspectRatios: [], durations: [6,10], qualities: [], resolutions: ['768P','1080P'], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: false },
  'veo-3.1-fast':        { aspectRatios: ['16:9','9:16'], durations: [4,6,8], qualities: ['720p','1080p','4k'], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'veo-3.1-pro':         { aspectRatios: ['16:9','9:16'], durations: [4,6,8], qualities: ['720p','1080p','4k'], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
  'sora-2-pro':          { aspectRatios: ['16:9','9:16'], durations: [4,8,12], qualities: ['720p','1080p'], resolutions: [], supportsImageInput: true,  supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: true },
}

const DEFAULT_CAPS: VideoModelCaps = {
  aspectRatios: ['16:9','9:16','1:1'], durations: [5,10], qualities: [], resolutions: [],
  supportsImageInput: false, supportsSound: false, supportsRemoveWatermark: false, hasMode: false, hasQuality: false,
}

const AR_L: Record<string,string> = { landscape:'🖥 Пейзаж', portrait:'📱 Портрет', '16:9':'16:9', '9:16':'9:16', '1:1':'1:1', '4:3':'4:3', '3:4':'3:4' }
const Q_L:  Record<string,string> = { '720p':'720p Стандарт', '1080p':'1080p HD', '4k':'4K Ultra', '768P':'768P', '1080P':'1080P' }

const EXAMPLES = [
  'Кинематографичный пролёт над горами на рассвете, облака ниже камеры',
  'Кот в очках сидит за компьютером и пишет код, уютная комната',
  'Таймлапс звёздного неба над пустыней, Млечный путь',
  'Медленное вращение вокруг чашки кофе с паром, макросъёмка',
  'Футуристический город с летающими машинами, ночь, неон',
]

/* ─── Component ─── */

export function VideoGenerationPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { generate, generations } = useGeneration()
  const { models: allModels } = useModels()

  const videoModels = useMemo(
    () => allModels.filter((m) => m.category === 'video'),
    [allModels],
  )

  const [input, setInput] = useState('')
  const [slug, setSlug] = useState(videoModels[0]?.slug ?? 'veo-3.1-fast')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [dur, setDur] = useState(5)
  const [ar, setAr] = useState('16:9')
  const [qual, setQual] = useState('720p')
  const [res, setRes] = useState('768P')
  const [snd, setSnd] = useState(false)
  const [noWm, setNoWm] = useState(true)

  const [imgUrl, setImgUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const resultsEndRef = useRef<HTMLDivElement>(null)

  const model = videoModels.find((m) => m.slug === slug)
  const cost = model?.cost || 15
  const caps = MODEL_CAPS[slug] || DEFAULT_CAPS
  const isI2V = slug.includes('img2vid') || slug === 'kling-3.0-motion'

  const vidGens = useMemo(
    () => generations.filter((g) => g.type === 'video'),
    [generations],
  )

  // TG back
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
    const c = MODEL_CAPS[slug] || DEFAULT_CAPS
    setDur(c.durations[0] || 5)
    setAr(c.aspectRatios[0] || '16:9')
    setQual(c.qualities[0] || '720p')
    setRes(c.resolutions[0] || '768P')
    setSnd(false)
    setNoWm(true)
    setImgUrl('')
  }, [slug])

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
  }, [input])

  // Auto-scroll
  useEffect(() => {
    const el = resultsContainerRef.current
    if (!el) return
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTop = el.scrollHeight
    }
  }, [vidGens.length])

  // Upload
  const upload = useCallback(
    async (file: File) => {
      if (!file.type.match(/image\/(jpeg|png|webp)/)) {
        toast.error('Только JPEG, PNG, WebP')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Макс 10MB')
        return
      }
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const token = sessionStorage.getItem('jwt')
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/upload/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!r.ok) throw new Error('Upload failed')
        const d = await r.json()
        const url = d.data?.url || d.url
        if (!url) throw new Error('No URL')
        setImgUrl(url)
        haptic('light')
        toast.success('Изображение загружено')
      } catch (e: any) {
        toast.error(e.message || 'Ошибка загрузки')
      } finally {
        setUploading(false)
      }
    },
    [haptic],
  )

  // Generate
  const doGen = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt) return
    if (isI2V && !imgUrl) {
      toast.warning('Загрузите изображение для этой модели')
      return
    }
    if (balance < cost) {
      toast.warning(`Недостаточно спичек. Нужно ${cost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }
    haptic('medium')
    setGenerating(true)
    const s: Record<string, unknown> = {}
    if (caps.durations.length) s.duration = dur
    if (caps.aspectRatios.length) s.aspectRatio = ar
    if (caps.hasQuality && caps.qualities.length) s.quality = qual
    if (caps.resolutions.length) s.resolution = res
    if (caps.supportsSound) s.sound = snd
    if (caps.supportsRemoveWatermark) s.removeWatermark = noWm
    if (caps.supportsImageInput && imgUrl) s.imageUrl = imgUrl
    const ok = await generate({ type: 'video', model: slug, prompt, settings: s })
    setGenerating(false)
    if (ok) {
      setInput('')
      hapticNotification('success')
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }, [input, balance, cost, slug, imgUrl, dur, ar, qual, res, snd, noWm, caps, isI2V, haptic, hapticNotification, generate])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doGen()
    }
  }

  const insertExample = useCallback(() => {
    setInput(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])
    haptic('light')
  }, [haptic])

  const hasResults = vidGens.length > 0

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
          <Video size={14} className="text-[var(--gray-500)] shrink-0" />
          <span className="truncate">{model?.name ?? slug}</span>
          <span className="text-[11px] text-white/40 ml-auto shrink-0">
            {cost % 1 === 0 ? cost : cost.toFixed(2)} 🔥
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
            {videoModels.map((m) => (
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
                    {m.provider}
                    {m.slug.includes('img') || m.slug.includes('motion') ? ' · img2vid' : ' · txt2vid'}
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
      <div className="shrink-0 px-4 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {caps.durations.length > 0 && <Badge>{dur} сек</Badge>}
        {caps.aspectRatios.length > 0 && <Badge>{AR_L[ar] || ar}</Badge>}
        {caps.hasQuality && caps.qualities.length > 0 && <Badge>{Q_L[qual] || qual}</Badge>}
        {caps.resolutions.length > 0 && <Badge>{res}</Badge>}
        {isI2V && <Badge active={!!imgUrl}>{imgUrl ? '📸 Фото' : 'img2vid'}</Badge>}
      </div>

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
          {/* Empty state */}
          {!hasResults && !generating && (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in fade-in--2">
              <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
                <Video size={36} strokeWidth={1.5} />
              </div>
              <div className="text-[17px] font-semibold text-white/60">Генерация видео</div>
              <div className="text-[13px] text-white/30 max-w-[280px] leading-[1.5]">
                Опишите сцену. Видео может генерироваться до 5 минут.
              </div>
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
            </div>
          )}

          {/* Results list */}
          {vidGens.map((gen) => (
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
                    type: 'video',
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
        fs-page__input
          shrink-0 flex flex-col gap-2
          px-2.5 pt-2.5 pb-4
          mb-[calc(59px+var(--safe-bottom))]
          border-t border-[var(--border-glass)]
          bg-[var(--bg-glass-heavy)]
          backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
        "
      >
        {/* Image preview (как attachments в чате) */}
        {imgUrl && (
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="" className="w-5 h-5 rounded-[3px] object-cover block" />
              <span className="text-[var(--gray-400)]">Изображение</span>
              <button
                className="
                  w-4 h-4 rounded-[4px] border-none
                  bg-white/[0.06] text-[var(--gray-500)]
                  flex items-center justify-center
                  cursor-pointer ml-0.5
                  active:bg-[rgba(239,68,68,0.2)] active:text-[var(--accent-red)]
                "
                onClick={() => {
                  setImgUrl('')
                  haptic('light')
                }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

                {/* Input row */}
        <div className="flex items-center gap-2">
          {/* Upload button */}
          {caps.supportsImageInput && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) upload(f)
                  e.target.value = ''
                }}
              />
              <button
                className={`
                  w-[38px] h-[38px] rounded-[10px] border-none
                  flex items-center justify-center
                  cursor-pointer transition-all duration-150
                  shrink-0 self-center
                  ${imgUrl
                    ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                    : 'bg-white/[0.04] text-[var(--gray-500)]'
                  }
                  active:scale-[0.92]
                  disabled:opacity-50 disabled:cursor-default
                `}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
              </button>
            </>
          )}

          <textarea
            ref={inputRef}
            className="
              flex-1 min-w-0 block align-middle
              py-[9px] px-3.5
              rounded-[var(--radius-sm)]
              border border-[var(--border-glass)]
              bg-white/[0.03]
              text-white text-[14px] font-[inherit]
              outline-none resize-none leading-[1.4]
              max-h-[120px]
              transition-[border-color] duration-200
              placeholder:text-[var(--gray-600)]
              focus:border-[rgba(250,204,21,0.2)]
            "
            placeholder={isI2V ? 'Загрузите фото и опишите видео...' : 'Опишите видео...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={generating}
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
            disabled={!input.trim() || generating}
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="-ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Settings modal ── */}
      {showSettings && (
        <div
          className="
            fixed inset-0 z-[100]
            bg-black/60 backdrop-blur-[8px]
            flex items-end justify-center
            animate-[fadeIn_0.2s_ease-out]
          "
          onClick={() => setShowSettings(false)}
        >
          <div
            className="
              w-full max-w-[600px] max-h-[85vh]
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
                <Video size={16} /> Настройки · {model?.name}
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
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10 flex flex-col gap-5">
              {/* Duration */}
              {caps.durations.length > 0 && (
                <Field label={<><Clock size={13} /> Длительность</>}>
                  <Chips>
                    {caps.durations.map((d) => (
                      <Chip key={d} active={dur === d} onClick={() => { setDur(d); haptic('light') }}>
                        {d} сек
                      </Chip>
                    ))}
                  </Chips>
                </Field>
              )}

              {/* Aspect Ratio */}
              {caps.aspectRatios.length > 0 && (
                <Field label={<><Maximize2 size={13} /> Соотношение сторон</>}>
                  <Chips>
                    {caps.aspectRatios.map((a) => (
                      <Chip key={a} active={ar === a} onClick={() => { setAr(a); haptic('light') }}>
                        {AR_L[a] || a}
                      </Chip>
                    ))}
                  </Chips>
                </Field>
              )}

              {/* Quality */}
              {caps.hasQuality && caps.qualities.length > 0 && (
                <Field label={<><Zap size={13} /> Качество</>}>
                  <Chips>
                    {caps.qualities.map((q) => (
                      <Chip key={q} active={qual === q} onClick={() => { setQual(q); haptic('light') }}>
                        {Q_L[q] || q}
                      </Chip>
                    ))}
                  </Chips>
                </Field>
              )}

              {/* Resolution */}
              {caps.resolutions.length > 0 && (
                <Field label="Разрешение">
                  <Chips>
                    {caps.resolutions.map((r) => (
                      <Chip key={r} active={res === r} onClick={() => { setRes(r); haptic('light') }}>
                        {r}
                      </Chip>
                    ))}
                  </Chips>
                </Field>
              )}

              {/* Sound */}
              {caps.supportsSound && (
                <Field label="🔊 Звуковые эффекты">
                  <Chips>
                    <Chip active={snd} onClick={() => { setSnd(true); haptic('light') }}>Включить</Chip>
                    <Chip active={!snd} onClick={() => { setSnd(false); haptic('light') }}>Выключить</Chip>
                  </Chips>
                </Field>
              )}

              {/* Watermark */}
              {caps.supportsRemoveWatermark && (
                <Field label="Водяной знак">
                  <Chips>
                    <Chip active={noWm} onClick={() => { setNoWm(true); haptic('light') }}>Убрать</Chip>
                    <Chip active={!noWm} onClick={() => { setNoWm(false); haptic('light') }}>Оставить</Chip>
                  </Chips>
                </Field>
              )}

              {/* Sora warning */}
              {slug === 'sora-2-pro' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-[12px] text-white/60 leading-relaxed">
                  ⚠️ Sora 2 Pro имеет строгую модерацию контента. Задачи с реальными людьми на изображениях не поддерживаются.
                </div>
              )}

              {/* Image upload */}
              {caps.supportsImageInput && (
                <Field
                  label={<><ImageIcon size={13} /> Входное изображение</>}
                  hint={`JPEG, PNG, WebP · макс 10MB${slug === 'sora-2-pro' ? ' · без реальных людей' : ''}`}
                >
                  <div className="grid grid-cols-4 gap-2">
                    {imgUrl && (
                      <div className="relative aspect-square rounded-[10px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-[10px] border border-white/[0.08] block"
                        />
                        <button
                          className="
                            absolute -top-1.5 -right-1.5
                            w-5 h-5 rounded-full border-none
                            bg-red-500 text-white
                            flex items-center justify-center
                            cursor-pointer z-[2]
                          "
                          onClick={() => setImgUrl('')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {!imgUrl && (
                      <button
                        className="
                          aspect-square rounded-[10px]
                          border-[1.5px] border-dashed border-white/[0.12]
                          bg-white/[0.03] text-white/30
                          flex flex-col items-center justify-center gap-1 text-[10px]
                          cursor-pointer transition-all
                          active:bg-white/[0.07] active:border-white/[0.22]
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <span>{uploading ? 'Загрузка...' : 'Добавить'}</span>
                      </button>
                    )}
                  </div>
                </Field>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Helper components ─── */

function Badge({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`
        shrink-0 inline-flex items-center
        px-2.5 py-[3px] rounded-md
        border text-[11px] font-medium whitespace-nowrap
        ${active
          ? 'border-amber-400/30 bg-amber-400/[.08] text-amber-400'
          : 'border-white/[0.07] bg-white/[0.04] text-white/35'
        }
      `}
    >
      {children}
    </span>
  )
}

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