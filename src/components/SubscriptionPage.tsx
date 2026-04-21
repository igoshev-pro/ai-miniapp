// src/components/SubscriptionPage.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Crown, Check, Zap, Loader2, Star, Sparkles, Rocket, Diamond,
  MessageSquare, Image as ImageIcon, Video, Music,
  Lock, Unlock, Gift, Clock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'

interface Props { onBack?: () => void }
type Currency = 'rub' | 'usd'
const RATE = 90

interface PlanData {
  id: string; name: string; priceRub: number; tokens: number; bonusTokens: number
  icon: React.ReactNode; color: string; gradient: string; modelsAccess: string
  freeModels: { name: string; limit: string }[]
  capabilities: { icon: React.ReactNode; text: string }[]
  isPopular?: boolean
}

const PLANS: PlanData[] = [
  {
    id: 'basic', name: 'Basic', priceRub: 450, tokens: 150, bonusTokens: 0,
    icon: <Zap size={22} />, color: '#60a5fa',
    gradient: 'linear-gradient(135deg,rgba(96,165,250,.15),rgba(96,165,250,.05))',
    modelsAccess: 'Ограниченное', freeModels: [],
    capabilities: [
      { icon: <MessageSquare size={13} />, text: '1 500 запросов в текст' },
      { icon: <ImageIcon size={13} />, text: 'Генерация 125 изображений' },
      { icon: <Video size={13} />, text: 'Генерация 25 видео' },
      { icon: <Music size={13} />, text: 'Генерация 36 песен' },
    ],
  },
  {
    id: 'plus', name: 'Plus', priceRub: 990, tokens: 330, bonusTokens: 0,
    icon: <Star size={22} />, color: '#fbbf24', isPopular: true,
    gradient: 'linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.05))',
    modelsAccess: 'Полный доступ',
    freeModels: [
      { name: 'gpt-oss-120b', limit: '10/час, 60/сутки' },
      { name: 'DeepSeek V3.2', limit: '10/час, 60/сутки' },
      { name: 'xAI: Grok 4.1 Fast', limit: '10/час, 60/сутки' },
    ],
    capabilities: [
      { icon: <MessageSquare size={13} />, text: 'Бесплатная генерация текста 10/час, 60/сутки' },
      { icon: <ImageIcon size={13} />, text: 'Генерация 275 изображений' },
      { icon: <Video size={13} />, text: 'Генерация 55 видео' },
      { icon: <Music size={13} />, text: 'Генерация 82 песен' },
    ],
  },
  {
    id: 'max', name: 'Max', priceRub: 2490, tokens: 830, bonusTokens: 50,
    icon: <Rocket size={22} />, color: '#f97316',
    gradient: 'linear-gradient(135deg,rgba(249,115,22,.15),rgba(249,115,22,.05))',
    modelsAccess: 'Полный доступ',
    freeModels: [
      { name: 'gpt-oss-120b', limit: 'Безлимит' },
      { name: 'DeepSeek V3.2', limit: 'Безлимит' },
      { name: 'xAI: Grok 4.1 Fast', limit: 'Безлимит' },
    ],
    capabilities: [
      { icon: <MessageSquare size={13} />, text: 'Безлимитная генерация текста' },
      { icon: <ImageIcon size={13} />, text: 'Генерация 733 изображений' },
      { icon: <Video size={13} />, text: 'Генерация 146 видео' },
      { icon: <Music size={13} />, text: 'Генерация 220 песен' },
    ],
  },
  {
    id: 'ultimate', name: 'Ultimate', priceRub: 5990, tokens: 1997, bonusTokens: 220,
    icon: <Diamond size={22} />, color: '#c084fc',
    gradient: 'linear-gradient(135deg,rgba(192,132,252,.15),rgba(192,132,252,.05))',
    modelsAccess: 'Полный доступ',
    freeModels: [
      { name: 'GPT Image 1.5 Lite', limit: '10/час, 60/сутки' },
      { name: 'Imagen 4', limit: '10/час, 60/сутки' },
      { name: 'Midjourney обычный', limit: '10/час, 60/сутки' },
      { name: 'gpt-oss-120b', limit: 'Безлимит' },
      { name: 'DeepSeek V3.2', limit: 'Безлимит' },
      { name: 'xAI: Grok 4.1 Fast', limit: 'Безлимит' },
    ],
    capabilities: [
      { icon: <MessageSquare size={13} />, text: 'Безлимитная генерация текста' },
      { icon: <ImageIcon size={13} />, text: 'Бесплатная генерация изображений 10/час, 60/сутки' },
      { icon: <ImageIcon size={13} />, text: 'Генерация 369 изображений' },
      { icon: <Video size={13} />, text: 'Генерация 220 видео' },
      { icon: <Music size={13} />, text: 'Генерация 554 песен' },
    ],
  },
]

function fmtPrice(r: number, c: Currency) {
  if (c === 'rub') return r.toLocaleString('ru-RU')
  const u = r / RATE
  return u % 1 === 0 ? u.toFixed(0) : u.toFixed(2).replace(/\.?0+$/, '')
}

function priceLabel(c: Currency) {
  return c === 'rub' ? '1 спичка = 3 ₽' : `1 спичка ≈ $${(3 / RATE).toFixed(3)}`
}

export function SubscriptionPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { subscription } = useUser()
  const { subscribe } = useBilling()
  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cur, setCur] = useState<Currency>('rub')
  const plan = subscription.plan

  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const h = () => onBack?.()
    webApp.BackButton.onClick(h)
    return () => { webApp.BackButton.offClick(h); webApp.BackButton.hide() }
  }, [webApp, onBack])

  const go = useCallback(async (id: string) => {
    if (id === plan) return
    haptic('medium'); setBusy(id)
    const url = await subscribe(id); setBusy(null)
    if (url) { webApp?.openLink ? webApp.openLink(url) : window.open(url, '_blank'); hapticNotification('success') }
  }, [plan, haptic, hapticNotification, subscribe, webApp])

  return (
    <div className="relative z-[1] px-4 pb-[100px]">

      {/* ── Header ── */}
      <div className="text-center pt-5 pb-3 animate-fade-in">
        <Crown size={24} className="text-amber-400 mx-auto mb-2" />
        <h1 className="text-[22px] font-bold text-white">Тарифы</h1>
        <p className="text-[13px] text-white/40 mt-1">
          {priceLabel(cur)} · Выберите план для себя
        </p>
      </div>

      {/* ── Currency ── */}
      <div className="flex gap-1 p-[3px] mb-3.5 bg-white/[.04] border border-white/[.06] rounded-xl animate-fade-in">
        {(['rub', 'usd'] as Currency[]).map(c => (
          <button key={c} onClick={() => { haptic('light'); setCur(c) }}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[.97] border-none ${cur === c ? 'bg-white/[.08] text-white shadow-[0_1px_4px_rgba(0,0,0,.2)]' : 'bg-transparent text-white/40'}`}>
            {c === 'rub' ? '₽ Рубли' : '$ USD'}
          </button>
        ))}
      </div>

      {/* ── Current ── */}
      <div className="text-center p-3.5 bg-white/[.03] border border-white/[.06] rounded-xl mb-4 animate-fade-in">
        <div className="text-[11px] text-white/35 mb-1">Текущий план</div>
        <div className="text-[16px] font-semibold text-white">
          {plan === 'free' ? 'Free' : PLANS.find(p => p.id === plan)?.name || plan}
        </div>
        {subscription.isActive && subscription.expiresAt && (
          <div className="text-[11px] text-white/30 mt-1">
            Активна до {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </div>
        )}
      </div>

      {/* ── Plans ── */}
      <div className="flex flex-col gap-3 mb-4 animate-fade-in [animation-delay:.1s]">
        {PLANS.map(p => {
          const isCur = plan === p.id
          const isExp = expanded === p.id
          return (
            <div key={p.id}
              className={`relative rounded-[18px] p-[18px] flex flex-col gap-3.5 transition-all duration-[250ms] bg-white/[.025] border-[1.5px] ${isCur ? 'bg-white/[.04]' : ''}`}
              style={{ borderColor: isCur ? p.color : 'rgba(255,255,255,.06)' }}>

              {/* Popular */}
              {p.isPopular && (
                <div className="absolute -top-2.5 right-4 flex items-center gap-1 text-black text-[10px] font-bold px-3 py-[3px] rounded-lg tracking-wide"
                  style={{ background: p.color }}>
                  <Sparkles size={10} /> Популярный
                </div>
              )}

              {/* Top */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0"
                  style={{ background: p.gradient, color: p.color }}>{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-bold text-white">{p.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-white/40 mt-0.5">
                    {p.modelsAccess === 'Полный доступ'
                      ? <><Unlock size={11} /> Полный доступ</>
                      : <><Lock size={11} /> Ограниченное</>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[22px] font-extrabold text-white">
                    {cur === 'usd' && '$'}{fmtPrice(p.priceRub, cur)}
                  </span>
                  {cur === 'rub' && <span className="text-[14px] text-white/50"> ₽</span>}
                  <span className="block text-[11px] text-white/30 text-right">/мес</span>
                </div>
              </div>

              {/* Tokens */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[.03] rounded-[10px]">
                <div className="flex items-center gap-1.5 flex-1">
                  <Sparkles size={14} style={{ color: p.color }} />
                  <span className="text-[16px] font-bold text-white">{p.tokens.toLocaleString()}</span>
                  <span className="text-[13px] text-white/40">спичек</span>
                </div>
                {p.bonusTokens > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                    <Gift size={12} /> +{p.bonusTokens} в подарок
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="flex flex-col gap-1.5">
                {p.capabilities.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12.5px] text-white/60">
                    <span className="shrink-0 flex items-center" style={{ color: p.color }}>{c.icon}</span>
                    <span className="leading-[1.3]">{c.text}</span>
                  </div>
                ))}
              </div>

              {/* Free models */}
              {p.freeModels.length > 0 && (
                <>
                  <button onClick={e => { e.stopPropagation(); haptic('light'); setExpanded(prev => prev === p.id ? null : p.id) }}
                    className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg border border-white/[.06] bg-white/[.02] text-white/50 text-[12px] font-medium transition-all active:bg-white/[.05]">
                    <Zap size={13} style={{ color: p.color }} />
                    <span className="flex-1 text-left">Бесплатный доступ к моделям ({p.freeModels.length})</span>
                    {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {isExp && (
                    <div className="flex flex-col gap-1 py-0.5 animate-fade-in">
                      {p.freeModels.map((m, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[.02] border border-white/[.04]">
                          <span className="text-[12px] font-medium text-white/70">{m.name}</span>
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-[3px] rounded whitespace-nowrap ${m.limit === 'Безлимит' ? 'text-green-400 bg-green-400/[.08]' : 'text-white/35 bg-white/[.04]'}`}>
                            {m.limit === 'Безлимит' ? <><Sparkles size={10} /> Безлимит</> : <><Clock size={10} /> {m.limit}</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Button */}
              <button onClick={() => go(p.id)} disabled={isCur || busy === p.id}
                className={`w-full flex items-center justify-center gap-1.5 py-[13px] rounded-xl border-none text-[14px] font-semibold transition-all active:scale-[.98] active:opacity-90 disabled:opacity-60 ${isCur ? 'bg-white/[.06] !text-white/40 cursor-default active:!scale-100 active:!opacity-100' : 'text-black cursor-pointer'}`}
                style={!isCur ? { background: p.color } : undefined}>
                {busy === p.id ? <Loader2 size={16} className="animate-spin" />
                  : isCur ? <><Check size={14} /> Текущий план</>
                  : <>Подключить за {cur === 'usd' ? '$' : ''}{fmtPrice(p.priceRub, cur)}{cur === 'rub' ? ' ₽' : ''}</>}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Free ── */}
      <div className="text-center p-4 bg-white/[.02] border border-white/[.04] rounded-xl animate-fade-in [animation-delay:.2s]">
        <div className="text-[14px] font-semibold text-white/50 mb-1">Free</div>
        <div className="text-[12px] text-white/25">
          50 спичек при регистрации · Ограниченный доступ к моделям · Без подписки
        </div>
      </div>
    </div>
  )
}