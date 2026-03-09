// src/components/SubscriptionPage.tsx

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
  Headphones,
  Infinity,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Music,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'

export function SubscriptionPage() {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { subscription } = useUser()
  const { plans, isLoading, loadPlans, subscribe } = useBilling()
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const currentPlan = subscription.plan

  const planIcons: Record<string, React.ReactNode> = {
    basic: <Zap size={20} />,
    pro: <Star size={20} />,
    unlimited: <Crown size={20} />,
  }

  const planColors: Record<string, string> = {
    basic: '#60a5fa',
    pro: '#fbbf24',
    unlimited: '#c084fc',
  }

  const featureIcons: Record<string, React.ReactNode> = {
    'спичек': <Sparkles size={13} />,
    'Текст': <MessageSquare size={13} />,
    'Изображения': <ImageIcon size={13} />,
    'Видео': <Video size={13} />,
    'Аудио': <Music size={13} />,
    'Приоритет': <Zap size={13} />,
    'API': <Shield size={13} />,
    'поддержка': <Headphones size={13} />,
    'без лимита': <Infinity size={13} />,
    'Всё': <Infinity size={13} />,
  }

  const getFeatureIcon = (feature: string) => {
    for (const [key, icon] of Object.entries(featureIcons)) {
      if (feature.includes(key)) return icon
    }
    return <Check size={13} />
  }

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

  return (
    <div className="subscription-page">
      <div className="subscription-page__header fade-in fade-in--1">
        <Crown size={24} className="subscription-page__header-icon" />
        <div className="subscription-page__title">Тарифы</div>
        <div className="subscription-page__subtitle">
          Выберите план, который подходит именно вам
        </div>
      </div>

      {/* Текущий план */}
      <div className="subscription-current fade-in fade-in--1">
        <div className="subscription-current__label">Текущий план</div>
        <div className="subscription-current__plan">
          {currentPlan === 'free' ? 'Free' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
        </div>
        {subscription.isActive && subscription.expiresAt && (
          <div className="subscription-current__expiry">
            Активна до {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
        )}
      </div>

      {/* Карточки планов */}
      <div className="subscription-plans fade-in fade-in--2">
        {isLoading && plans.length === 0 ? (
          <div className="chats-history__loading">
            <Loader2 size={20} className="spin" />
          </div>
        ) : (
          plans.map((plan) => {
            const isCurrent = currentPlan === plan.plan
            const color = planColors[plan.plan] || '#fff'

            return (
              <div
                key={plan.id}
                className={`subscription-card ${isCurrent ? 'subscription-card--current' : ''}`}
                style={{ '--plan-color': color } as React.CSSProperties}
              >
                {plan.plan === 'pro' && (
                  <div className="subscription-card__popular">
                    <Sparkles size={10} />
                    Популярный
                  </div>
                )}

                <div className="subscription-card__header">
                  <div className="subscription-card__icon" style={{ color }}>
                    {planIcons[plan.plan]}
                  </div>
                  <div className="subscription-card__name">{plan.name}</div>
                  <div className="subscription-card__price">
                    <span className="subscription-card__amount">{plan.price}</span>
                    <span className="subscription-card__currency">₽</span>
                    <span className="subscription-card__period">{plan.period}</span>
                  </div>
                </div>

                <div className="subscription-card__tokens">
                  <Sparkles size={14} style={{ color }} />
                  {plan.tokensPerMonth.toLocaleString()} спичек / мес
                </div>

                <ul className="subscription-card__features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="subscription-card__feature">
                      <span className="subscription-card__feature-icon" style={{ color }}>
                        {getFeatureIcon(f)}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`subscription-card__btn ${isCurrent ? 'subscription-card__btn--current' : ''}`}
                  onClick={() => handleSubscribe(plan.plan)}
                  disabled={isCurrent || subscribingPlan === plan.plan}
                  style={!isCurrent ? { background: color } : undefined}
                >
                  {subscribingPlan === plan.plan ? (
                    <Loader2 size={16} className="spin" />
                  ) : isCurrent ? (
                    <>
                      <Check size={14} />
                      Текущий план
                    </>
                  ) : currentPlan === 'free' ? (
                    'Подключить'
                  ) : (
                    'Сменить план'
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Free tier */}
      <div className="subscription-free fade-in fade-in--3">
        <div className="subscription-free__title">Free</div>
        <div className="subscription-free__desc">
          50 спичек при регистрации · Все модели доступны · Без подписки
        </div>
      </div>
    </div>
  )
}