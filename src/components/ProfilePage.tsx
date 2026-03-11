'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User,
  Wallet,
  Coins,
  Crown,
  Gift,
  Users,
  Copy,
  Check,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Clock,
  Flame,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser, useBilling } from '@/hooks'

interface Props {
  onNavigate?: (page: string) => void
}

const SUPPORT_TG_LINK = 'https://t.me/d_igoshev'

export function ProfilePage({ onNavigate }: Props) {
  const { user: tgUser, haptic, hapticNotification, webApp } = useTelegram()
  const {
    user,
    balance,
    subscription,
    referralCode,
    isLoaded,
    refetch,
  } = useUser()
  const { referralInfo, loadReferralInfo } = useBilling()

  const [copiedRef, setCopiedRef] = useState(false)

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

  const openSupport = useCallback(() => {
    haptic('light')
    if (webApp) {
      webApp.openTelegramLink(SUPPORT_TG_LINK)
    } else {
      window.open(SUPPORT_TG_LINK, '_blank')
    }
  }, [haptic, webApp])

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
                Следующее списание:{' '}
                {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          <button
            className="profile-plan-card__btn"
            onClick={() => {
              haptic('light')
              onNavigate?.('subscription')
            }}
          >
            Сменить
          </button>
        </div>
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
            <div className="profile-stat-card__label">С нами с</div>
            <div className="profile-stat-card__value">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Меню */}
      <div className="profile-section fade-in fade-in--4">
        <button className="profile-menu-item" onClick={openSupport}>
          <HelpCircle size={16} />
          <span>Поддержка</span>
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  )
}