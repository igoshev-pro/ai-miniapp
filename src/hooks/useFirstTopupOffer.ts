// src/hooks/useFirstTopupOffer.ts
'use client'

// Акция «x2 спичек на первое пополнение».
// Данные берём один раз и кэшируем в сторе; при возврате во вкладку
// перезапрашиваем не чаще раза в минуту. Любая ошибка = акции нет.

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { apiClient, ENDPOINTS } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export interface FirstTopupOffer {
  active: boolean
  endsAt: string | null
  multiplier: number
  maxRub: number
}

const INACTIVE: FirstTopupOffer = { active: false, endsAt: null, multiplier: 1, maxRub: 0 }
const REFETCH_MS = 60_000

interface OfferState {
  offer: FirstTopupOffer
  fetchedAt: number
  /** Для какого токена получены данные: смена аккаунта = новый запрос */
  fetchedFor: string | null
  inFlight: boolean
  load: (force?: boolean) => Promise<void>
}

export const useFirstTopupOfferStore = create<OfferState>((set, get) => ({
  offer: INACTIVE,
  fetchedAt: 0,
  fetchedFor: null,
  inFlight: false,

  load: async (force = false) => {
    const token = useAuthStore.getState().token
    if (!token) {
      set({ offer: INACTIVE, fetchedAt: 0, fetchedFor: null })
      return
    }
    const { inFlight, fetchedAt, fetchedFor } = get()
    if (inFlight) return
    if (!force && fetchedFor === token && Date.now() - fetchedAt < REFETCH_MS) return

    set({ inFlight: true })
    try {
      const res = await apiClient.get<
        Partial<FirstTopupOffer> & { data?: Partial<FirstTopupOffer> }
      >(ENDPOINTS.BILLING_FIRST_TOPUP_OFFER)
      // Ответ может прийти как есть или в обёртке { success, data }
      const raw = (res.data?.data ?? res.data) as Partial<FirstTopupOffer>
      const multiplier = Number(raw?.multiplier) || 1
      set({
        offer: {
          active: !!raw?.active && multiplier > 1,
          endsAt: typeof raw?.endsAt === 'string' ? raw.endsAt : null,
          multiplier,
          maxRub: Number(raw?.maxRub) || 0,
        },
      })
    } catch {
      set({ offer: INACTIVE })
    } finally {
      set({ inFlight: false, fetchedAt: Date.now(), fetchedFor: token })
    }
  },
}))

/** Сколько миллисекунд осталось до endsAt; тикает раз в секунду. */
export function useCountdown(endsAt: string | null): number | null {
  const target = endsAt ? Date.parse(endsAt) : NaN
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (!Number.isFinite(target)) return null
  return Math.max(0, target - now)
}

/** 47:12:05 — часы не сворачиваются в сутки. */
export function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * Бонусные спички по акции для покупки на amountRub:
 * tokens × (multiplier − 1) × min(1, maxRub / amountRub).
 */
export function calcOfferBonus(offer: FirstTopupOffer, tokens: number, amountRub: number): number {
  if (!offer.active || offer.multiplier <= 1 || tokens <= 0 || amountRub <= 0) return 0
  const share = offer.maxRub > 0 ? Math.min(1, offer.maxRub / amountRub) : 1
  return Math.floor(tokens * (offer.multiplier - 1) * share)
}

export function useFirstTopupOffer() {
  const token = useAuthStore((s) => s.token)
  const offer = useFirstTopupOfferStore((s) => s.offer)
  const load = useFirstTopupOfferStore((s) => s.load)
  const remainingMs = useCountdown(offer.active ? offer.endsAt : null)

  useEffect(() => {
    load()
  }, [load, token])

  useEffect(() => {
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Таймер дошёл до нуля — акция закончилась, даже если бэкенд ещё не знает
  const expired = remainingMs !== null && remainingMs <= 0
  const isActive = offer.active && !expired

  return {
    offer,
    isActive,
    remainingMs,
    countdown: remainingMs !== null ? formatCountdown(remainingMs) : null,
    reload: () => load(true),
  }
}
