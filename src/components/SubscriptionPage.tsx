// src/components/SubscriptionPage.tsx
'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Crown, Check, Zap, Loader2, Star, Sparkles, Rocket, Diamond,
  MessageSquare, Image as ImageIcon, Video, Music,
  Lock, Unlock, Gift, Clock, ChevronDown, ChevronUp,
  CreditCard, Bitcoin, Info,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'
import { fmtKgs } from '@/config/legal' // 🆕
import type {
  SubscriptionPlan as ApiSubscriptionPlan,
  PaymentProvider,
  PaymentCurrency,
} from '@/hooks/useBilling'

interface Props { onBack?: () => void }
type Currency = 'kgs' | 'rub' | 'usd' // 🆕 добавлен kgs
type Provider = Extract<PaymentProvider, 'stars' | 'tochka' | 'freedompay' | 'heleket'>

// курс совпадает с RUB_TO_USD_RATE на беке
const RATE = 90

// ─── Маппинг icon-строки на компонент Lucide ──────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Zap, Star, Rocket, Diamond, Crown, Sparkles,
}

function getPlanIcon(name?: string) {
  if (!name) return Zap
  return ICON_MAP[name] ?? Zap
}

// ─── Эвристика подбора иконки фичи по тексту ──────────────────
function getCapabilityIcon(text: string): React.ComponentType<{ size?: number }> {
  const lower = text.toLowerCase()
  if (lower.includes('текст') || lower.includes('запрос')) return MessageSquare
  if (lower.includes('изображ')) return ImageIcon
  if (lower.includes('видео')) return Video
  if (lower.includes('песен') || lower.includes('аудио') || lower.includes('музык')) return Music
  return Sparkles
}

// ─── Градиент по hex-цвету плана ──────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildGradient(color: string): string {
  return `linear-gradient(135deg, ${hexToRgba(color, 0.15)}, ${hexToRgba(color, 0.05)})`
}

// ─── Провайдеры ────────────────────────────────────────────────
const PROVIDERS: { id: Provider; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; sub: string }[] = [
  { id: 'stars',      label: 'Stars',  icon: Star,        sub: 'Telegram' },
  { id: 'tochka',     label: 'Карта',  icon: CreditCard,  sub: 'РФ ₽'     },
  { id: 'freedompay', label: 'Карта',  icon: CreditCard,  sub: 'KG ⃀'     }, // 🆕
  { id: 'heleket',    label: 'Crypto', icon: Bitcoin,     sub: 'USDT/BTC' },
]

// ─── Форматтеры ───────────────────────────────────────────────
function fmtPrice(rub: number, c: Currency) {
  if (c === 'kgs') return fmtKgs(rub) // 🆕 сом
  if (c === 'rub') return rub.toLocaleString('ru-RU')
  const usd = rub / RATE
  return usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2).replace(/\.?0+$/, '')
}

// 🆕 символы валют
function curPrefix(c: Currency) {
  return c === 'usd' ? '$' : ''
}
function curSuffix(c: Currency) {
  if (c === 'rub') return ' ₽'
  if (c === 'kgs') return ' сом'
  return ''
}

// ─── Параметры required (для Midjourney и аналогичных) ────────
function formatRequiredParams(params?: Record<string, any> | null): string | null {
  if (!params || Object.keys(params).length === 0) return null
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

export function SubscriptionPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { subscription } = useUser()
  const { subscribe, loadPlans, plans, isLoading } = useBilling()

  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cur, setCur] = useState<Currency>('kgs')           // 🆕 дефолт — сом
  const [provider, setProvider] = useState<Provider>('freedompay') // 🆕 дефолт
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)

  const currentPlan = subscription.plan
  const isTelegram = !!webApp

  // ─── Загружаем планы с бека при маунте и при смене валюты ──
  useEffect(() => {
    setIsLoadingPlans(true)
    // 🆕 kgs использует те же рублёвые цены (конвертация только визуальная)
    const currency: PaymentCurrency = cur === 'usd' ? 'USD' : 'RUB'
    loadPlans(currency).finally(() => setIsLoadingPlans(false))
  }, [cur, loadPlans])

  // ─── Доступные провайдеры в зависимости от условий ─────────
  const availableProviders = useMemo(() => {
    return PROVIDERS.filter(p => {
      if (p.id === 'stars')  return isTelegram          // Stars только в TG
      if (p.id === 'tochka') return cur === 'rub'       // Tochka только RUB
      return true                                        // freedompay, heleket — всегда
    })
  }, [isTelegram, cur])

  // ─── Авто-переключение провайдера если выбранный недоступен ─
  useEffect(() => {
    if (!availableProviders.some(p => p.id === provider)) {
      setProvider(availableProviders[0]?.id ?? 'heleket')
    }
  }, [availableProviders, provider])

  // ─── Подписаться ───────────────────────────────────────────
  const go = useCallback(async (planId: string) => {
    if (planId === currentPlan) return
    haptic('medium')
    setBusy(planId)
    // 🆕 kgs → RUB для бэкенда (логика оплаты не меняется)
    const currency: PaymentCurrency = cur === 'usd' ? 'USD' : 'RUB'
    const url = await subscribe(planId, provider, currency)
    setBusy(null)
    if (url) {
      if (webApp?.openLink) {
        webApp.openLink(url)
      } else {
        window.open(url, '_blank')
      }
      hapticNotification('success')
    }
  }, [currentPlan, cur, provider, haptic, hapticNotification, subscribe, webApp])

  // ─── Текущий план для шапки ────────────────────────────────
  const currentPlanData = plans.find(p => p.id === currentPlan || p.plan === currentPlan)

  return (
    <div className="relative z-[1] px-4 pb-[100px]">

      {/* ── Header ── */}
      <div className="text-center pt-5 pb-3 animate-fade-in">
        <Crown size={24} className="text-amber-400 mx-auto mb-2" />
        <h1 className="text-[22px] font-bold text-white">Тарифы</h1>
        <p className="text-[13px] text-white/40 mt-1">
          Выберите план для себя
        </p>
      </div>

      {/* ── Currency ── 🆕 Сом · Рубли · USD */}
      <div className="flex gap-1 p-[3px] mb-3.5 bg-white/[.04] border border-white/[.06] rounded-xl animate-fade-in">
        {(['kgs', 'rub', 'usd'] as Currency[]).map(c => (
          <button
            key={c}
            onClick={() => { haptic('light'); setCur(c) }}
            className={`
              flex-1 flex items-center justify-center gap-1 py-2.5
              rounded-[10px] text-[13px] font-semibold
              transition-all active:scale-[.97] border-none
              ${cur === c
                ? 'bg-white/[.08] text-white shadow-[0_1px_4px_rgba(0,0,0,.2)]'
                : 'bg-transparent text-white/40'
              }
            `}
          >
            {c === 'kgs' ? '⃀ Сом' : c === 'rub' ? '₽ Рубли' : '$ USD'}
          </button>
        ))}
      </div>

      {/* ── Current plan ── */}
      <div className="text-center p-3.5 bg-white/[.03] border border-white/[.06] rounded-xl mb-4 animate-fade-in">
        <div className="text-[11px] text-white/35 mb-1">Текущий план</div>
        <div className="text-[16px] font-semibold text-white">
          {currentPlan === 'free' ? 'Free' : (currentPlanData?.name || currentPlan)}
        </div>
        {subscription.isActive && subscription.expiresAt && (
          <div className="text-[11px] text-white/30 mt-1">
            Активна до {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </div>
        )}
      </div>

      {/* ── Способ оплаты ── */}
      <div className="mb-4 animate-fade-in">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white/60 mb-2">
          <CreditCard size={13} /> Способ оплаты
        </div>
        <div className={`grid gap-1.5 ${
          availableProviders.length === 1 ? 'grid-cols-1'
          : availableProviders.length === 2 ? 'grid-cols-2'
          : availableProviders.length === 3 ? 'grid-cols-3'
          : 'grid-cols-4'
        }`}>
          {availableProviders.map(p => {
            const isOn = provider === p.id
            const Icon = p.icon
            return (
              <button
                key={p.id}
                onClick={() => { haptic('light'); setProvider(p.id) }}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2.5 px-1
                  rounded-[10px] border-[1.5px] transition-all active:scale-[.97]
                  ${isOn
                    ? 'bg-amber-400/[.08] border-amber-400/40 text-white'
                    : 'bg-white/[.04] border-white/[.06] text-white/50'
                  }
                `}
              >
                <Icon size={16} className={isOn ? 'text-amber-400' : ''} />
                <div className="text-[11px] font-semibold leading-none">{p.label}</div>
                <div className="text-[9px] text-white/35 leading-none">{p.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoadingPlans && plans.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="text-amber-400 animate-spin" />
        </div>
      )}

      {/* ── Plans ── */}
      {plans.length > 0 && (
        <div className="flex flex-col gap-3 mb-4 animate-fade-in [animation-delay:.1s]">
          {plans.map(p => {
            const isCurrentPlan = currentPlan === p.id || currentPlan === p.plan
            const isExp = expanded === p.id
            const planColor = p.color || '#60a5fa'
            const planGradient = buildGradient(planColor)
            const PlanIcon = getPlanIcon(p.icon)
            const priceRub = p.priceRub ?? p.price ?? 0

            return (
              <div
                key={p.id}
                className={`
                  relative rounded-[18px] p-[18px] flex flex-col gap-3.5
                  transition-all duration-[250ms]
                  bg-white/[.025] border-[1.5px]
                  ${isCurrentPlan ? 'bg-white/[.04]' : ''}
                `}
                style={{ borderColor: isCurrentPlan ? planColor : 'rgba(255,255,255,.06)' }}
              >
                {/* Popular badge */}
                {p.isPopular && (
                  <div
                    className="absolute -top-2.5 right-4 flex items-center gap-1 text-black text-[10px] font-bold px-3 py-[3px] rounded-lg tracking-wide"
                    style={{ background: planColor }}
                  >
                    <Sparkles size={10} /> Популярный
                  </div>
                )}

                {/* Top row */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0"
                    style={{ background: planGradient, color: planColor }}
                  >
                    <PlanIcon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-bold text-white">{p.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-white/40 mt-0.5">
                      {p.modelsAccess === 'full'
                        ? <><Unlock size={11} /> Полный доступ</>
                        : <><Lock size={11} /> Ограниченное</>
                      }
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[22px] font-extrabold text-white">
                      {curPrefix(cur)}{fmtPrice(priceRub, cur)}
                    </span>
                    {cur === 'rub' && <span className="text-[14px] text-white/50"> ₽</span>}
                    {cur === 'kgs' && <span className="text-[14px] text-white/50"> сом</span>}
                    <span className="block text-[11px] text-white/30 text-right">/мес</span>
                  </div>
                </div>

                {/* Tokens */}
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[.03] rounded-[10px]">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Sparkles size={14} style={{ color: planColor }} />
                    <span className="text-[16px] font-bold text-white">
                      {p.tokensPerMonth.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-white/40">спичек</span>
                  </div>
                  {p.bonusTokens > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                      <Gift size={12} /> +{p.bonusTokens} в подарок
                    </div>
                  )}
                </div>

                {/* Capabilities */}
                {p.capabilities && p.capabilities.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {p.capabilities.map((cap, i) => {
                      const CapIcon = getCapabilityIcon(cap)
                      return (
                        <div key={i} className="flex items-center gap-2 text-[12.5px] text-white/60">
                          <span className="shrink-0 flex items-center" style={{ color: planColor }}>
                            <CapIcon size={13} />
                          </span>
                          <span className="leading-[1.3]">{cap}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Free models */}
                {p.freeModels && p.freeModels.length > 0 && (
                  <>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        haptic('light')
                        setExpanded(prev => prev === p.id ? null : p.id)
                      }}
                      className="
                        flex items-center gap-1.5 w-full
                        px-3 py-2 rounded-lg
                        border border-white/[.06] bg-white/[.02]
                        text-white/50 text-[12px] font-medium
                        transition-all active:bg-white/[.05]
                      "
                    >
                      <Zap size={13} style={{ color: planColor }} />
                      <span className="flex-1 text-left">
                        Бесплатный доступ к моделям ({p.freeModels.length})
                      </span>
                      {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExp && (
                      <div className="flex flex-col gap-1 py-0.5 animate-fade-in">
                        {p.freeModels.map((m, i) => {
                          const requiredHint = formatRequiredParams(m.requiredParams)
                          return (
                            <div
                              key={i}
                              className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/[.02] border border-white/[.04]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-medium text-white/70">
                                  {m.name}
                                </span>
                                <span
                                  className={`
                                    flex items-center gap-1 text-[10px] font-medium
                                    px-2 py-[3px] rounded whitespace-nowrap
                                    ${m.isUnlimited
                                      ? 'text-green-400 bg-green-400/[.08]'
                                      : 'text-white/35 bg-white/[.04]'
                                    }
                                  `}
                                >
                                  {m.isUnlimited
                                    ? <><Sparkles size={10} /> Безлимит</>
                                    : <><Clock size={10} /> {m.limit}</>
                                  }
                                </span>
                              </div>
                              {requiredHint && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
                                  <Info size={9} />
                                  <span>Только с параметрами: {requiredHint}</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Subscribe button */}
                <button
                  onClick={() => go(p.id)}
                  disabled={isCurrentPlan || busy === p.id || isLoading}
                  className={`
                    w-full flex items-center justify-center gap-1.5
                    py-[13px] rounded-xl border-none
                    text-[14px] font-semibold
                    transition-all active:scale-[.98] active:opacity-90
                    disabled:opacity-60
                    ${isCurrentPlan
                      ? 'bg-white/[.06] !text-white/40 cursor-default active:!scale-100 active:!opacity-100'
                      : 'text-black cursor-pointer'
                    }
                  `}
                  style={!isCurrentPlan ? { background: planColor } : undefined}
                >
                  {busy === p.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isCurrentPlan ? (
                    <><Check size={14} /> Текущий план</>
                  ) : (
                    <>
                      Подключить за {curPrefix(cur)}{fmtPrice(priceRub, cur)}{curSuffix(cur)}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Free plan info ── */}
      <div className="text-center p-4 bg-white/[.02] border border-white/[.04] rounded-xl animate-fade-in [animation-delay:.2s]">
        <div className="text-[14px] font-semibold text-white/50 mb-1">Free</div>
        <div className="text-[12px] text-white/25">
          9 спичек при регистрации · Ограниченный доступ к моделям · Без подписки
        </div>
      </div>
    </div>
  )
}