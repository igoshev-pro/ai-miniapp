// src/components/ReferralPage.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  Flame,
  Loader2,
  ChevronRight,
  Link,
  Star,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'

export function ReferralPage() {
  const { haptic, hapticNotification, webApp, user: tgUser } = useTelegram()
  const { referralCode } = useUser()
  const { referralInfo, loadReferralInfo } = useBilling()
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const code = referralCode || `SPICHKI-${tgUser?.username?.toUpperCase() || 'USER'}`
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'SpichkiBot'
  const referralLink = `https://t.me/${botUsername}?start=ref_${code}`

  useEffect(() => {
    loadReferralInfo().then(() => setIsLoading(false))
  }, [loadReferralInfo])

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(true)
    hapticNotification('success')
    toast.success('Код скопирован')
    setTimeout(() => setCopiedCode(false), 2000)
  }, [code, hapticNotification])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopiedLink(true)
    hapticNotification('success')
    toast.success('Ссылка скопирована')
    setTimeout(() => setCopiedLink(false), 2000)
  }, [referralLink, hapticNotification])

  const shareLink = useCallback(() => {
    haptic('medium')
    const text = `🔥 Спички — все нейросети в одном месте! Регистрируйся и получи бонусные спички: ${referralLink}`

    if (webApp?.openTelegramLink) {
      // Шарим через Telegram
      webApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🔥 Спички — все нейросети в одном месте! Получи бонус при регистрации')}`
      )
    } else if (navigator.share) {
      navigator.share({ text, url: referralLink }).catch(() => {})
    } else {
      copyLink()
    }
  }, [haptic, webApp, referralLink, copyLink])

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="referral-page">
      <div className="referral-page__header fade-in fade-in--1">
        <Gift size={28} className="referral-page__icon" />
        <div className="referral-page__title">Реферальная программа</div>
        <div className="referral-page__subtitle">
          Приглашайте друзей и зарабатывайте спички
        </div>
      </div>

      {/* Условия */}
      <div className="referral-rewards fade-in fade-in--2">
        <div className="referral-reward">
          <div className="referral-reward__value">+100 🔥</div>
          <div className="referral-reward__label">Вашему другу</div>
          <div className="referral-reward__desc">при регистрации</div>
        </div>
        <div className="referral-reward__divider" />
        <div className="referral-reward">
          <div className="referral-reward__value">+50 🔥</div>
          <div className="referral-reward__label">Вам</div>
          <div className="referral-reward__desc">за приглашение</div>
        </div>
        <div className="referral-reward__divider" />
        <div className="referral-reward">
          <div className="referral-reward__value">+10%</div>
          <div className="referral-reward__label">Кэшбэк</div>
          <div className="referral-reward__desc">от покупок друга</div>
        </div>
      </div>

      {/* Код и ссылка */}
      <div className="referral-share fade-in fade-in--2">
        <div className="referral-share__title">Ваш реферальный код</div>

        <div className="referral-share__code-block">
          <div className="referral-share__code">{code}</div>
          <button className="referral-share__copy" onClick={copyCode}>
            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="referral-share__link-block">
          <div className="referral-share__link-label">
            <Link size={12} />
            Ссылка для приглашения
          </div>
          <div className="referral-share__link-row">
            <div className="referral-share__link">{referralLink}</div>
            <button className="referral-share__copy" onClick={copyLink}>
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <button className="referral-share__btn" onClick={shareLink}>
          <Share2 size={16} />
          Поделиться с друзьями
        </button>
      </div>

      {/* Статистика */}
      <div className="referral-stats fade-in fade-in--3">
        <div className="referral-stats__title">Статистика</div>

        {isLoading ? (
          <div className="chats-history__loading">
            <Loader2 size={18} className="spin" />
          </div>
        ) : (
          <>
            <div className="referral-stats__grid">
              <div className="referral-stat">
                <Users size={18} className="referral-stat__icon" />
                <div className="referral-stat__value">
                  {referralInfo?.referralCount ?? 0}
                </div>
                <div className="referral-stat__label">Друзей</div>
              </div>
              <div className="referral-stat">
                <Flame size={18} className="referral-stat__icon" />
                <div className="referral-stat__value">
                  +{(referralInfo?.totalEarned ?? 0).toLocaleString()}
                </div>
                <div className="referral-stat__label">Заработано спичек</div>
              </div>
            </div>

            {/* Список рефералов */}
            {referralInfo?.referrals && referralInfo.referrals.length > 0 && (
              <div className="referral-list">
                <div className="referral-list__title">Приглашённые друзья</div>
                {referralInfo.referrals.map((ref) => (
                  <div key={ref.id} className="referral-list__item">
                    <div className="referral-list__avatar">
                      <Users size={14} />
                    </div>
                    <div className="referral-list__info">
                      <div className="referral-list__name">
                        {ref.firstName}
                        {ref.username && (
                          <span className="referral-list__username">@{ref.username}</span>
                        )}
                      </div>
                      <div className="referral-list__date">
                        {formatDate(ref.joinedAt)}
                      </div>
                    </div>
                    <div className="referral-list__earned">
                      +{ref.earned} 🔥
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!referralInfo?.referrals || referralInfo.referrals.length === 0) && (
              <div className="referral-empty">
                <Users size={24} />
                <div>Пока никого нет</div>
                <div className="referral-empty__hint">
                  Поделитесь ссылкой с друзьями, чтобы начать зарабатывать
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}