// src/components/ProfilePage.tsx
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
  HelpCircle,
  TrendingUp,
  Clock,
  Flame,
  Loader2,
  ExternalLink,
  LogOut,
  Images,
  ChevronRight,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser, useBilling } from '@/hooks'
import { useAuthStore } from '@/stores/auth.store'
import { SUPPORT_TG_LINK } from '@/config/const'

interface Props {
  onNavigate?: (page: string) => void
}

const planLabels: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  max: 'Max',
  ultimate: 'Ultimate',
  // legacy
  pro: 'Plus',
  unlimited: 'Ultimate',
}

const planColors: Record<string, string> = {
  free: 'rgba(255,255,255,0.08)',
  basic: '#60a5fa',
  plus: '#fbbf24',
  max: '#f97316',
  ultimate: '#c084fc',
  pro: '#fbbf24',
  unlimited: '#c084fc',
}

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

  const copyReferral = useCallback(() => {
    const code =
      referralCode || `SPICHKI-${tgUser?.username?.toUpperCase() || 'USER'}`
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

  // 🆕 Логаут
  const handleLogout = useCallback(() => {
    hapticNotification('warning')

    // Снимаем подтверждение закрытия, иначе TG спросит «точно выйти?»
    try {
      webApp?.disableClosingConfirmation?.()
    } catch {}

    // clearToken сам: рвёт WS + чистит useUserStore.clear()
    useAuthStore.getState().clearToken()

    // Чистим persisted-токен из localStorage (spichki-auth)
    try {
      useAuthStore.persist?.clearStorage?.()
    } catch {}

    // В Telegram закрываем Mini App, в браузере — перезагружаем на экран логина.
    if (webApp) {
      webApp.close()
    } else {
      window.location.reload()
    }
  }, [hapticNotification, webApp])

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
  const planLabel = planLabels[currentPlan] || 'Free'
  const planColor = planColors[currentPlan] || planColors.free
  const isPaidPlan = currentPlan !== 'free'

  // 🆕 Форматирование даты окончания подписки
  const formatExpiryDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // 🆕 Сколько дней осталось до окончания
  const daysUntilExpiry = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

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
        <div
          className="profile-user__plan-badge"
          style={{
            background: isPaidPlan ? `${planColor}26` : undefined, // 26 = 15% alpha
            color: isPaidPlan ? planColor : undefined,
            borderColor: isPaidPlan ? `${planColor}66` : undefined,
          }}
        >
          <Crown size={12} />
          {planLabel}
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
              {isPaidPlan ? (
                <>
                  Тариф{' '}
                  <span style={{ color: planColor }}>{planLabel}</span>
                  {planActive && (
                    <span className="profile-plan-card__active">Активен</span>
                  )}
                </>
              ) : (
                <>Без подписки</>
              )}
            </div>

            {isPaidPlan && subscription.expiresAt ? (
              <div className="profile-plan-card__expiry">
                Действует до{' '}
                <strong style={{ color: 'var(--text-primary, #fff)' }}>
                  {formatExpiryDate(subscription.expiresAt)}
                </strong>
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    opacity: 0.6,
                  }}
                >
                  · осталось {daysUntilExpiry(subscription.expiresAt)} дн.
                </span>
              </div>
            ) : !isPaidPlan ? (
              <div className="profile-plan-card__expiry">
                Откройте больше возможностей с подпиской
              </div>
            ) : null}
          </div>
          <button
            className="profile-plan-card__btn"
            onClick={() => {
              haptic('light')
              onNavigate?.('subscription')
            }}
          >
            {isPaidPlan ? 'Сменить' : 'Подключить'}
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
              <span>
                +{(referralInfo?.totalEarned ?? 0).toLocaleString()} спичек
              </span>
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
        <button
          className="profile-menu-item"
          onClick={() => {
            haptic('light')
            onNavigate?.('generation-history')
          }}
        >
          <Images size={16} />
          <span>Мои генерации</span>
          <ChevronRight size={14} />
        </button>

        <button className="profile-menu-item" onClick={openSupport}>
          <HelpCircle size={16} />
          <span>Поддержка</span>
          <ExternalLink size={14} />
        </button>

        <button
          className="profile-menu-item profile-menu-item--danger"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  )
}