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
  TrendingDown,
  Crown,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling } from '@/hooks'
import { useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'

interface Props {
  onBack?: () => void
}

type Currency = 'rub' | 'usd'
const RUB_TO_USD = 90
const BASE_PRICE_PER_TOKEN = 3 // 3₽ за спичку — базовая цена

// Локальные данные пакетов (пока API не отдаёт скидки)
const PACKAGES_DATA = [
  { id: 'pack_100', tokens: 100, priceRub: 299, label: '100 спичек' },
  { id: 'pack_300', tokens: 300, priceRub: 749, label: '300 спичек', popular: true },
  { id: 'pack_700', tokens: 700, priceRub: 1490, label: '700 спичек' },
  { id: 'pack_1500', tokens: 1500, priceRub: 2690, label: '1 500 спичек' },
  { id: 'pack_5000', tokens: 5000, priceRub: 7490, label: '5 000 спичек', best: true },
]

function calcDiscount(tokens: number, priceRub: number): number {
  const baseTotal = tokens * BASE_PRICE_PER_TOKEN
  if (priceRub >= baseTotal) return 0
  return Math.round(((baseTotal - priceRub) / baseTotal) * 100)
}

function formatPrice(priceRub: number, currency: Currency): string {
  if (currency === 'rub') return priceRub.toLocaleString('ru-RU')
  const usd = priceRub / RUB_TO_USD
  return usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2).replace(/\.?0+$/, '')
}

function currencySymbol(c: Currency) {
  return c === 'rub' ? '₽' : '$'
}

function pricePerToken(priceRub: number, tokens: number, currency: Currency): string {
  if (currency === 'rub') {
    return (priceRub / tokens).toFixed(1) + ' ₽'
  }
  return '$' + (priceRub / RUB_TO_USD / tokens).toFixed(3)
}

export function TopUpPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { isLoading, purchaseTokens, applyPromo } = useBilling()

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('rub')
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  const [provider] = useState<'yookassa' | 'cryptomus' | 'stars'>('stars')

  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      const handler = () => { if (onBack) onBack() }
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack])

  const selectedPkg = PACKAGES_DATA.find((p) => p.id === selectedPackage)

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      toast.warning('Выберите пакет')
      return
    }
    haptic('medium')
    const paymentUrl = await purchaseTokens(selectedPackage, provider)
    if (paymentUrl) {
      if (webApp?.openLink) {
        webApp.openLink(paymentUrl)
      } else {
        window.open(paymentUrl, '_blank')
      }
      hapticNotification('success')
    }
  }, [selectedPackage, provider, purchaseTokens, haptic, hapticNotification, webApp])

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
      {/* Header */}
      <div className="topup-page__header fade-in fade-in--1">
        <div className="topup-page__title">Пополнить баланс</div>
      </div>

      {/* Баланс */}
      <div className="topup-balance fade-in fade-in--1">
        <div className="topup-balance__label">Текущий баланс</div>
        <div className="topup-balance__value">
          <Flame size={20} className="topup-balance__flame" />
          {balance.toLocaleString()} спичек
        </div>
      </div>

      {/* Валюта */}
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

      {/* Базовая цена */}
      <div className="topup-base-price fade-in fade-in--1">
        <Flame size={12} />
        <span>
          1 спичка = {currency === 'rub' ? '3 ₽' : `$${(3 / RUB_TO_USD).toFixed(3)}`}
        </span>
      </div>

      {/* Пакеты */}
      <div className="topup-section fade-in fade-in--2">
        <div className="topup-section__title">
          <Zap size={14} />
          Пакеты спичек
        </div>

        <div className="topup-packages">
          {PACKAGES_DATA.map((pkg) => {
            const discount = calcDiscount(pkg.tokens, pkg.priceRub)
            const isSelected = selectedPackage === pkg.id

            return (
              <div
                key={pkg.id}
                className={`topup-package ${isSelected ? 'topup-package--selected' : ''} ${pkg.popular ? 'topup-package--popular' : ''} ${pkg.best ? 'topup-package--best' : ''}`}
                onClick={() => {
                  setSelectedPackage(pkg.id)
                  haptic('light')
                }}
              >
                {/* Бейджи */}
                {pkg.popular && (
                  <div className="topup-package__badge">
                    <Sparkles size={10} />
                    Популярный
                  </div>
                )}
                {pkg.best && (
                  <div className="topup-package__badge topup-package__badge--best">
                    <Crown size={10} />
                    Лучшая цена
                  </div>
                )}

                {/* Скидка */}
                {discount > 0 && (
                  <div className="topup-package__discount">
                    <TrendingDown size={10} />
                    −{discount}%
                  </div>
                )}

                {/* Токены */}
                <div className="topup-package__top">
                  <div className="topup-package__tokens">
                    <Flame size={14} />
                    {pkg.tokens.toLocaleString()}
                  </div>
                </div>

                <div className="topup-package__name">{pkg.label}</div>

                {/* Цена */}
                <div className="topup-package__price">
                  {currency === 'usd' && '$'}
                  {formatPrice(pkg.priceRub, currency)}
                  {currency === 'rub' && ' ₽'}
                </div>

                {/* Старая цена (если скидка) */}
                {discount > 0 && (
                  <div className="topup-package__old-price">
                    {currency === 'usd' && '$'}
                    {formatPrice(pkg.tokens * BASE_PRICE_PER_TOKEN, currency)}
                    {currency === 'rub' && ' ₽'}
                  </div>
                )}

                {/* Цена за спичку */}
                <div className="topup-package__per">
                  {pricePerToken(pkg.priceRub, pkg.tokens, currency)} / спичка
                </div>

                {isSelected && (
                  <div className="topup-package__check">
                    <Check size={14} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Кнопка оплаты */}
        <button
          className="topup-buy-btn"
          onClick={handlePurchase}
          disabled={!selectedPackage || isLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="spin" />
          ) : selectedPkg ? (
            <>
              <Zap size={16} />
              Оплатить {currency === 'usd' ? '$' : ''}
              {formatPrice(selectedPkg.priceRub, currency)}
              {currency === 'rub' ? ' ₽' : ''}
            </>
          ) : (
            <>
              <Zap size={16} />
              Выберите пакет
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

      {/* Инфо */}
      <div className="topup-info fade-in fade-in--3">
        <div className="topup-info__text">
          Оплата через Telegram Stars. Спички зачисляются мгновенно.
        </div>
        <div className="topup-info__legal">
          ИП Аневич А.С. · ИНН 246220127244
        </div>
      </div>
    </div>
  )
}