'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { useAuthStore, useUserStore } from '@/stores'
import { YM_ID, initMetrika, isMetrikaEnabled, reachGoal, trackSignUp } from '@/lib/metrika'

interface TxResponse {
  data?: {
    transactions?: {
      _id: string
      type: string
      paymentStatus?: string
      paymentAmountRub?: number
    }[]
  }
}

const PAID_TYPES = new Set(['deposit', 'subscription'])
const PURCHASE_CHECK_EVERY_MS = 30_000

/**
 * Счётчик Метрики на весь сайт (лендинг /start и приложение) и цели,
 * которые не привязаны к конкретному экрану: клик по кнопке входа на
 * лендинге, регистрация и оплата. Первую генерацию шлют useGeneration/useChat.
 */
export function YandexMetrika() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!isMetrikaEnabled()) return
    initMetrika()
    setEnabled(true)
  }, [])

  // lp_cta: все кнопки входа на лендинге ведут на /?auth=1 — ловим их одним
  // делегированным обработчиком, чтобы не размечать каждую ссылку.
  useEffect(() => {
    if (!enabled) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]')
      if (a && a.closest('.lp') && a.getAttribute('href')?.startsWith('/?auth=1')) {
        reachGoal('lp_cta')
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled])

  // sign_up: профиль появился, и аккаунт создан только что.
  const user = useUserStore((s) => s.user)
  useEffect(() => {
    if (enabled && user) trackSignUp(user)
  }, [enabled, user])

  // purchase: оплату подтверждает вебхук на бэкенде, фронт об этом не знает.
  // Поэтому при входе и при возвращении на вкладку (после страницы оплаты)
  // смотрим последние транзакции и шлём цель по новым завершённым платежам.
  const token = useAuthStore((s) => s.token)
  const userId = user?.id
  const lastCheck = useRef(0)
  useEffect(() => {
    if (!enabled || !token || !userId) return
    const seenKey = `ym_paid_tx_${userId}`

    const check = async () => {
      if (Date.now() - lastCheck.current < PURCHASE_CHECK_EVERY_MS) return
      lastCheck.current = Date.now()
      try {
        const { data } = await apiClient.get<TxResponse>(ENDPOINTS.BILLING_TRANSACTIONS, {
          params: { page: 1, limit: 20 },
        })
        const paid = (data.data?.transactions || []).filter(
          (t) => PAID_TYPES.has(t.type) && t.paymentStatus === 'completed',
        )
        const stored = localStorage.getItem(seenKey)
        const seen = new Set<string>(stored ? JSON.parse(stored) : [])
        // Первый запуск в этом браузере: прошлые платежи только запоминаем,
        // иначе каждый старый клиент «оплатил бы» заново при первом заходе.
        if (stored) {
          for (const t of paid) {
            if (seen.has(t._id)) continue
            reachGoal(
              'purchase',
              t.paymentAmountRub ? { order_price: t.paymentAmountRub, currency: 'RUB' } : undefined,
            )
          }
        }
        paid.forEach((t) => seen.add(t._id))
        localStorage.setItem(seenKey, JSON.stringify([...seen].slice(-100)))
      } catch {
        // сеть или localStorage недоступны — проверим в следующий раз
      }
    }

    lastCheck.current = 0
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled, token, userId])

  if (!enabled) return null
  return <Script id="yandex-metrika" src={`https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`} strategy="afterInteractive" />
}
