'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Crown,
  Check,
  Zap,
  Loader2,
  Star,
  Sparkles,
  Shield,
  Rocket,
  Diamond,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Music,
  Lock,
  Unlock,
  Gift,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'

interface Props {
  onBack?: () => void
}

type Currency = 'rub' | 'usd'
const RATE_RUB_TO_USD = 90

interface PlanData {
  id: string
  name: string
  priceRub: number
  tokens: number
  bonusTokens: number
  icon: React.ReactNode
  color: string
  gradient: string
  modelsAccess: string
  freeModels: { name: string; limit: string }[]
  capabilities: { icon: React.ReactNode; text: string }[]
  isPopular?: boolean
}

const PLANS: PlanData[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceRub: 450,
    tokens: 150,
    bonusTokens: 0,
    icon: <Zap size={22} />,
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))',
    modelsAccess: 'Ограниченное',
    freeModels: [],
    capabilities: [
      { icon: <MessageSquare size={13} />, text: '1 500 запросов в текст' },
      { icon: <ImageIcon size={13} />, text: 'Генерация 125 изображений' },
      { icon: <Video size={13} />, text: 'Генерация 25 видео' },
      { icon: <Music size={13} />, text: 'Генерация 36 песен' },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    priceRub: 990,
    tokens: 330,
    bonusTokens: 0,
    icon: <Star size={22} />,
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
    modelsAccess: 'Полный доступ',
    isPopular: true,
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
    id: 'max',
    name: 'Max',
    priceRub: 2490,
    tokens: 830,
    bonusTokens: 50,
    icon: <Rocket size={22} />,
    color: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))',
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
    id: 'ultimate',
    name: 'Ultimate',
    priceRub: 5990,
    tokens: 1997,
    bonusTokens: 220,
    icon: <Diamond size={22} />,
    color: '#c084fc',
    gradient: 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(192,132,252,0.05))',
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

function formatPrice(priceRub: number, currency: Currency): string {
  if (currency === 'rub') {
    return priceRub.toLocaleString('ru-RU')
  }
  const usd = priceRub / RATE_RUB_TO_USD
  // Красиво округляем: если целое — без копеек
  return usd % 1 === 0
    ? usd.toFixed(0)
    : usd.toFixed(2).replace(/\.?0+$/, '')
}

function currencySymbol(currency: Currency): string {
  return currency === 'rub' ? '₽' : '$'
}

function tokenPriceLabel(currency: Currency): string {
  if (currency === 'rub') return '1 спичка = 3 ₽'
  const usd = 3 / RATE_RUB_TO_USD
  return `1 спичка ≈ $${usd.toFixed(3)}`
}

export function SubscriptionPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { subscription } = useUser()
  const { subscribe } = useBilling()
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('rub')

  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      const handler = () => {
        if (onBack) onBack()
      }
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack])

  const currentPlan = subscription.plan

  const handleSubscribe = useCallback(
    async (planId: string) => {
      if (planId === currentPlan) return
      haptic('medium')
      setSubscribingPlan(planId)
      const paymentUrl = await subscribe(planId)
      setSubscribingPlan(null)
      if (paymentUrl) {
        if (webApp?.openLink) {
          webApp.openLink(paymentUrl)
        } else {
          window.open(paymentUrl, '_blank')
        }
        hapticNotification('success')
      }
    },
    [currentPlan, haptic, hapticNotification, subscribe, webApp],
  )

  const toggleExpand = (planId: string) => {
    haptic('light')
    setExpandedPlan(expandedPlan === planId ? null : planId)
  }

  const toggleCurrency = () => {
    haptic('light')
    setCurrency((prev) => (prev === 'rub' ? 'usd' : 'rub'))
  }

  return (
    <div className="subscription-page">
      {/* Header */}
      <div className="subscription-page__header fade-in fade-in--1">
        <Crown size={24} className="subscription-page__header-icon" />
        <div className="subscription-page__title">Тарифы</div>
        <div className="subscription-page__subtitle">
          {tokenPriceLabel(currency)} · Выберите план для себя
        </div>
      </div>

      {/* Currency toggle */}
      <div className="currency-toggle fade-in fade-in--1">
        <button
          className={`currency-toggle__btn ${currency === 'rub' ? 'currency-toggle__btn--active' : ''}`}
          onClick={() => { haptic('light'); setCurrency('rub') }}
        >
          ₽ Рубли
        </button>
        <button
          className={`currency-toggle__btn ${currency === 'usd' ? 'currency-toggle__btn--active' : ''}`}
          onClick={() => { haptic('light'); setCurrency('usd') }}
        >
          $ USD
        </button>
      </div>

      {/* Current plan */}
      <div className="subscription-current fade-in fade-in--1">
        <div className="subscription-current__label">Текущий план</div>
        <div className="subscription-current__plan">
          {currentPlan === 'free'
            ? 'Free'
            : PLANS.find((p) => p.id === currentPlan)?.name || currentPlan}
        </div>
        {subscription.isActive && subscription.expiresAt && (
          <div className="subscription-current__expiry">
            Активна до{' '}
            {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="subscription-plans fade-in fade-in--2">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isExpanded = expandedPlan === plan.id

          return (
            <div
              key={plan.id}
              className={`sub-card ${isCurrent ? 'sub-card--current' : ''} ${isExpanded ? 'sub-card--expanded' : ''}`}
              style={{
                '--plan-color': plan.color,
                borderColor: isCurrent ? plan.color : undefined,
              } as React.CSSProperties}
            >
              {plan.isPopular && (
                <div className="sub-card__popular" style={{ background: plan.color }}>
                  <Sparkles size={10} />
                  Популярный
                </div>
              )}

              {/* Top row */}
              <div className="sub-card__top">
                <div
                  className="sub-card__icon"
                  style={{ background: plan.gradient, color: plan.color }}
                >
                  {plan.icon}
                </div>
                <div className="sub-card__info">
                  <div className="sub-card__name">{plan.name}</div>
                  <div className="sub-card__access">
                    {plan.modelsAccess === 'Полный доступ' ? (
                      <><Unlock size={11} /> Полный доступ</>
                    ) : (
                      <><Lock size={11} /> Ограниченное</>
                    )}
                  </div>
                </div>
                <div className="sub-card__price">
                  <span className="sub-card__amount">
                    {currency === 'usd' && '$'}
                    {formatPrice(plan.priceRub, currency)}
                  </span>
                  {currency === 'rub' && (
                    <span className="sub-card__currency"> ₽</span>
                  )}
                  <span className="sub-card__period">/мес</span>
                </div>
              </div>

              {/* Tokens */}
              <div className="sub-card__tokens-row">
                <div className="sub-card__tokens">
                  <Sparkles size={14} style={{ color: plan.color }} />
                  <span className="sub-card__tokens-value">{plan.tokens.toLocaleString()}</span>
                  <span className="sub-card__tokens-label">спичек</span>
                </div>
                {plan.bonusTokens > 0 && (
                  <div className="sub-card__bonus">
                    <Gift size={12} />
                    +{plan.bonusTokens} в подарок
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="sub-card__capabilities">
                {plan.capabilities.map((cap, i) => (
                  <div key={i} className="sub-card__cap">
                    <span className="sub-card__cap-icon" style={{ color: plan.color }}>
                      {cap.icon}
                    </span>
                    <span className="sub-card__cap-text">{cap.text}</span>
                  </div>
                ))}
              </div>

              {/* Free models */}
              {plan.freeModels.length > 0 && (
                <>
                  <button
                    className="sub-card__expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(plan.id)
                    }}
                  >
                    <Zap size={13} style={{ color: plan.color }} />
                    <span>Бесплатный доступ к моделям ({plan.freeModels.length})</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="sub-card__free-models">
                      {plan.freeModels.map((m, i) => (
                        <div key={i} className="sub-card__free-model">
                          <span className="sub-card__free-model-name">{m.name}</span>
                          <span
                            className={`sub-card__free-model-limit ${m.limit === 'Безлимит' ? 'sub-card__free-model-limit--unlimited' : ''}`}
                          >
                            {m.limit === 'Безлимит' ? (
                              <><Sparkles size={10} /> Безлимит</>
                            ) : (
                              <><Clock size={10} /> {m.limit}</>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Button */}
              <button
                className={`sub-card__btn ${isCurrent ? 'sub-card__btn--current' : ''}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || subscribingPlan === plan.id}
                style={!isCurrent ? { background: plan.color } : undefined}
              >
                {subscribingPlan === plan.id ? (
                  <Loader2 size={16} className="spin" />
                ) : isCurrent ? (
                  <>
                    <Check size={14} />
                    Текущий план
                  </>
                ) : (
                  <>
                    Подключить за {currency === 'usd' ? '$' : ''}{formatPrice(plan.priceRub, currency)}{currency === 'rub' ? ' ₽' : ''}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Free */}
      <div className="subscription-free fade-in fade-in--3">
        <div className="subscription-free__title">Free</div>
        <div className="subscription-free__desc">
          50 спичек при регистрации · Ограниченный доступ к моделям · Без подписки
        </div>
      </div>
    </div>
  )
}