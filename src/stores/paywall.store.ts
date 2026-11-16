// src/stores/paywall.store.ts
//
// Глобальный пейволл «Спички закончились». Открывается откуда угодно —
// из страниц генерации, хуков и SSE-клиента — вместо тоста с ошибкой.
// Рендерится один раз в SpichkiApp (<PaywallSheet />).

import { create } from 'zustand'
import { reachGoal } from '@/lib/metrika'
import { hapticNotification } from '@/lib/telegram'

export interface PaywallPayload {
  /** Сколько спичек нужно на действие, если известно */
  need?: number
  /** Сколько спичек сейчас у человека, если известно */
  have?: number
  /** Откуда открыли (для аналитики): image | video | audio | chat | … */
  reason?: string
}

interface PaywallState extends PaywallPayload {
  isOpen: boolean
  open: (payload?: PaywallPayload) => void
  close: () => void
}

export const usePaywallStore = create<PaywallState>((set, get) => ({
  isOpen: false,
  need: undefined,
  have: undefined,
  reason: undefined,

  open: (payload = {}) => {
    const prev = get()
    const wasOpen = prev.isOpen
    // Повторный вызов поверх открытого пейволла (SSE-клиент и обработчик
    // страницы ловят одну и ту же ошибку) не должен стирать need/have.
    set({
      isOpen: true,
      need: payload.need ?? (wasOpen ? prev.need : undefined),
      have: payload.have ?? (wasOpen ? prev.have : undefined),
      reason: payload.reason ?? (wasOpen ? prev.reason : undefined),
    })
    if (!wasOpen) {
      hapticNotification('warning')
      reachGoal('paywall_open', payload.reason ? { reason: payload.reason } : undefined)
    }
  },

  close: () => set({ isOpen: false }),
}))

/** Открыть пейволл вне React (хуки, SSE-клиент, обработчики ошибок). */
export function openPaywall(payload?: PaywallPayload) {
  usePaywallStore.getState().open(payload)
}

// ─── Распознавание ошибки «не хватает спичек» ───────────────────
//
// Бэкенд отвечает не 402, а 400 с текстом вроде
// «Insufficient tokens. Need 12, have 3» или «Недостаточно спичек…».

const INSUFFICIENT_RE =
  /insufficient\s+(tokens|balance|funds)|not\s+enough\s+tokens|недостаточно\s+(спичек|токенов)|не\s*хватает\s+(спичек|токенов)|пополните\s+баланс/i

export function isInsufficientBalanceMessage(message?: string | null): boolean {
  return !!message && INSUFFICIENT_RE.test(message)
}

/** Достаёт need/have из текста ошибки, если они там есть. */
export function parseNeedHave(message?: string | null): { need?: number; have?: number } {
  if (!message) return {}
  const num = (re: RegExp) => {
    const m = message.match(re)
    if (!m) return undefined
    const n = Number(m[1].replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  return {
    need: num(/(?:need|нужно|требуется)\D{0,3}(\d+(?:[.,]\d+)?)/i),
    have: num(/(?:have|у вас|есть|доступно)\D{0,3}(\d+(?:[.,]\d+)?)/i),
  }
}

/**
 * Если ошибка про нехватку спичек — открывает пейволл и возвращает true.
 * Иначе ничего не делает и возвращает false (вызывающий покажет свой тост).
 */
export function handleInsufficientBalance(
  error: { status?: number; message?: string } | string | null | undefined,
  reason?: string,
): boolean {
  const status = typeof error === 'object' && error ? error.status : undefined
  const message = typeof error === 'string' ? error : error?.message
  if (status !== 402 && !isInsufficientBalanceMessage(message)) return false
  openPaywall({ ...parseNeedHave(message), reason })
  return true
}
