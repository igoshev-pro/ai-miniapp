// src/components/TopUpPage.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Zap,
  Gift,
  Check,
  Loader2,
  ChevronRight,
  Sparkles,
  Tag,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling } from '@/hooks'
import { useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

export function TopUpPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const {
    packages,
    isLoading,
    loadPackages,
    purchaseTokens,
    applyPromo,
  } = useBilling()

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      toast.warning('Выберите пакет')
      return
    }

    haptic('medium')

    const paymentUrl = await purchaseTokens(selectedPackage)

    if (paymentUrl) {
      // Открываем ссылку оплаты
      if (webApp) {
        webApp.openLink(paymentUrl)
      } else {
        window.open(paymentUrl, '_blank')
      }
    }
  }, [selectedPackage, purchaseTokens, haptic, webApp])

  const handlePromo = useCallback(async () => {
    const code = promoCode.trim()
    if (!code) return

    haptic('light')
    setPromoLoading(true)
    const success = await applyPromo(code)
    setPromoLoading(false)

    if (success) {
      setPromoApplied(true)
      setPromoCode('')
      hapticNotification('success')
    } else {
      hapticNotification('error')
    }
  }, [promoCode, applyPromo, haptic, hapticNotification])

  return (
    <div className="topup-page">
      <div className="topup-page__header fade-in fade-in--1">
        <div className="topup-page__title">Пополнить баланс</div>
      </div>

      {/* Текущий баланс */}
      <div className="topup-balance fade-in fade-in--1">
        <div className="topup-balance__label">Текущий баланс</div>
        <div className="topup-balance__value">
          <Flame size={20} className="topup-balance__flame" />
          {balance.toLocaleString()} спичек
        </div>
      </div>

      {/* Пакеты */}
      <div className="topup-section fade-in fade-in--2">
        <div className="topup-section__title">
          <Zap size={14} />
          Пакеты спичек
        </div>

        <div className="topup-packages">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`topup-package ${selectedPackage === pkg.id ? 'topup-package--selected' : ''} ${pkg.popular ? 'topup-package--popular' : ''}`}
              onClick={() => {
                setSelectedPackage(pkg.id)
                haptic('light')
              }}
            >
              {pkg.popular && (
                <div className="topup-package__badge">
                  <Sparkles size={10} />
                  Популярный
                </div>
              )}

              <div className="topup-package__top">
                <div className="topup-package__tokens">
                  <Flame size={14} />
                  {pkg.tokens.toLocaleString()}
                </div>
                {pkg.bonus && (
                  <div className="topup-package__bonus">
                    +{pkg.bonus} бонус
                  </div>
                )}
              </div>

              <div className="topup-package__name">{pkg.name}</div>

              <div className="topup-package__price">
                {pkg.price} {pkg.currency}
              </div>

              <div className="topup-package__per">
                {(pkg.price / (pkg.tokens + (pkg.bonus || 0))).toFixed(1)} {pkg.currency}/спичка
              </div>

              {selectedPackage === pkg.id && (
                <div className="topup-package__check">
                  <Check size={14} />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="topup-buy-btn"
          onClick={handlePurchase}
          disabled={!selectedPackage || isLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <>
              <Zap size={16} />
              Оплатить
            </>
          )}
        </button>
      </div>

      {/* Промокод */}
      <div className="topup-section fade-in fade-in--3">
        <div className="topup-section__title">
          <Tag size={14} />
          Промокод
        </div>
        <div className="topup-promo">
          <div className="topup-promo__input-row">
            <input
              type="text"
              placeholder="Введите промокод"
              className="topup-promo__input"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase())
                setPromoApplied(false)
              }}
              disabled={promoLoading}
            />
            <button
              className="topup-promo__btn"
              onClick={handlePromo}
              disabled={!promoCode.trim() || promoLoading}
            >
              {promoLoading ? (
                <Loader2 size={14} className="spin" />
              ) : promoApplied ? (
                <Check size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          </div>
          {promoApplied && (
            <div className="topup-promo__success">
              <Gift size={12} />
              Промокод применён!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}