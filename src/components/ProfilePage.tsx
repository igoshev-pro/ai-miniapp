// src/components/ProfilePage.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User,
  Wallet,
  Coins,
  Crown,
  Star,
  Gift,
  Users,
  Copy,
  Check,
  ChevronRight,
  Shield,
  HelpCircle,
  Zap,
  TrendingUp,
  Clock,
  MessageSquare,
  Image,
  Video,
  Music,
  Flame,
  Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser, useBilling } from '@/hooks'

interface Props {
  onNavigate?: (page: string) => void
}

export function ProfilePage({ onNavigate }: Props) {
  const { user: tgUser, haptic, hapticNotification } = useTelegram()
  const {
    user,
    balance,
    tokenBalance,
    bonusTokens,
    subscription,
    referralCode,
    isLoaded,
    refetch,
  } = useUser()
  const { referralInfo, loadReferralInfo, plans, loadPlans } = useBilling()

  const [copiedRef, setCopiedRef] = useState(false)
  const [showPlans, setShowPlans] = useState(false)

  useEffect(() => {
    if (!isLoaded) refetch()
    loadReferralInfo()
  }, [isLoaded, refetch, loadReferralInfo])

  const planLabels: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    unlimited: 'Unlimited',
  }

  const copyReferral = useCallback(() => {
    const code = referralCode || `SPICHKI-${tgUser?.username?.toUpperCase() || 'USER'}`
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedRef(true)
    hapticNotification('success')
    setTimeout(() => setCopiedRef(false), 2000)
  }, [referralCode, tgUser, hapticNotification])

  const handleShowPlans = useCallback(() => {
    if (!showPlans && plans.length === 0) {
      loadPlans()
    }
    setShowPlans(!showPlans)
    haptic('light')
  }, [showPlans, plans, loadPlans, haptic])

  if (!isLoaded) {
    return (
      <div className="profile-page">
        <div className="chats-history__loading">
          <Loader2 size={20} className="spin" />
          <span>Загрузка профиля...</span>
        </div>
      </div>
    )
  }

  const displayName = user?.firstName || tgUser?.first_name || 'Пользователь'
  const username = user?.username || tgUser?.username || 'user'
  const avatar = user?.photoUrl || tgUser?.photo_url || null
  const currentPlan = subscription.plan
  const planActive = subscription.isActive

  return (
    <div className="profile-page">
      <div className="profile-page__header fade-in fade-in--1">
        <div className="profile-page__title">Профиль</div>
      </div>

      {/* Аватар + имя */}
      <div className="profile-user fade-in fade-in--1">
        <div className="profile-user__avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="profile-user__avatar-img" />
          ) : (
            <User size={24} />
          )}
        </div>
        <div className="profile-user__info">
          <div className="profile-user__name">{displayName}</div>
          <div className="profile-user__username">@{username}</div>
        </div>
        <div className="profile-user__plan-badge">
          <Crown size={12} />
          {planLabels[currentPlan]}
        </div>
      </div>

      {/* Баланс */}
      <div className="profile-balance fade-in fade-in--2">
        <div className="profile-balance__header">
          <div className="profile-balance__label">
            <Wallet size={14} />
            Баланс
          </div>
          <div className="profile-balance__value">
            <Flame size={16} className="profile-balance__flame" />
            {balance.toLocaleString()} спичек
          </div>
        </div>

        {bonusTokens > 0 && (
          <div className="profile-balance__breakdown">
            <span>Купленные: {tokenBalance.toLocaleString()}</span>
            <span>Бонусные: {bonusTokens.toLocaleString()}</span>
          </div>
        )}

        <div className="profile-balance__actions">
          <button
            className="profile-balance__btn profile-balance__btn--primary"
            onClick={() => {
              haptic('medium')
              onNavigate?.('topup')
            }}
          >
            <Coins size={14} />
            Пополнить
          </button>
          <button
            className="profile-balance__btn"
            onClick={() => {
              haptic('light')
              onNavigate?.('transactions')
            }}
          >
            <Clock size={14} />
            История
          </button>
        </div>
      </div>

      {/* Подписка */}
      <div className="profile-section fade-in fade-in--3">
        <div className="profile-section__title">
          <Crown size={14} />
          Подписка
        </div>
        <div className="profile-plan-card">
          <div className="profile-plan-card__info">
            <div className="profile-plan-card__name">
              {planLabels[currentPlan]}
              {planActive && currentPlan !== 'free' && (
                <span className="profile-plan-card__active">Активна</span>
              )}
            </div>
            {subscription.expiresAt && (
              <div className="profile-plan-card__expiry">
                Следующее списание: {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          <button className="profile-plan-card__btn" onClick={handleShowPlans}>
            {showPlans ? 'Скрыть' : 'Сменить'}
          </button>
        </div>

        {showPlans && (
          <div className="profile-plans fade-in">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`profile-plans__item ${
                  currentPlan === plan.plan ? 'profile-plans__item--current' : ''
                }`}
                onClick={() => {
                  haptic('light')
                  if (currentPlan !== plan.plan) {
                    onNavigate?.(`subscribe:${plan.plan}`)
                  }
                }}
              >
                <div className="profile-plans__head">
                  <span className="profile-plans__name">{plan.name}</span>
                  <span className="profile-plans__price">
                    {plan.price} ₽
                    <span className="profile-plans__period">{plan.period}</span>
                  </span>
                </div>
                <ul className="profile-plans__features">
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Реферальная программа */}
      <div className="profile-section fade-in fade-in--3">
        <div className="profile-section__title">
          <Gift size={14} />
          Реферальная программа
        </div>
        <div className="profile-referral">
          <div className="profile-referral__code-row">
            <div className="profile-referral__code">
              {referralCode || `SPICHKI-${username.toUpperCase()}`}
            </div>
            <button className="profile-referral__copy" onClick={copyReferral}>
              {copiedRef ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="profile-referral__stats">
            <div className="profile-referral__stat">
              <Users size={14} />
              <span>{referralInfo?.referralCount ?? 0} друзей</span>
            </div>
            <div className="profile-referral__stat">
              <Flame size={14} />
              <span>+{(referralInfo?.totalEarned ?? 0).toLocaleString()} спичек</span>
            </div>
          </div>
          <div className="profile-referral__hint">
            Приглашайте друзей и получайте бонусные спички
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="profile-section fade-in fade-in--4">
        <div className="profile-section__title">
          <TrendingUp size={14} />
          Статистика
        </div>
        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="profile-stat-card__value">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                : '—'}
            </div>
            <div className="profile-stat-card__label">С нами с</div>
          </div>
        </div>
      </div>

      {/* Меню */}
      <div className="profile-section fade-in fade-in--4">
        <button className="profile-menu-item" onClick={() => { haptic('light'); onNavigate?.('favorites') }}>
          <Star size={16} />
          <span>Избранное</span>
          <ChevronRight size={16} />
        </button>
        <button className="profile-menu-item" onClick={() => { haptic('light'); onNavigate?.('support') }}>
          <HelpCircle size={16} />
          <span>Поддержка</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}