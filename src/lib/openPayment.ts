// src/lib/openPayment.ts
//
// Открытие страницы оплаты без блокировки всплывающих окон.
//
// Safari (и не только) блокирует window.open, вызванный после await: к этому
// моменту «жест пользователя» уже истёк. Поэтому вне Telegram окно открываем
// синхронно прямо в обработчике клика, а адрес подставляем, когда бэкенд
// вернёт ссылку. Если окно открыть не дали — уходим на оплату в этой же
// вкладке (платёжка вернёт на /?payment=success|fail).
//
// Внутри Telegram: Stars-инвойсы (t.me/$…) — через openInvoice, остальное —
// через openLink.

import type { WebApp } from './telegram'
import { useUserStore } from '@/stores/user.store'

// Баланс перед уходом на оплату: по нему после ?payment=success понимаем,
// успел ли вебхук начислить спички.
const BALANCE_KEY = 'spichki_balance_before_payment'
const BALANCE_TTL_MS = 2 * 60 * 60 * 1000

function rememberBalanceBeforePayment() {
  try {
    const balance = useUserStore.getState().user?.totalBalance
    if (balance == null) return
    localStorage.setItem(BALANCE_KEY, JSON.stringify({ balance, at: Date.now() }))
  } catch {
    // без localStorage просто не узнаем, начислено ли уже
  }
}

/** Достаёт (и стирает) баланс, сохранённый перед оплатой. */
export function takeBalanceBeforePayment(): number | null {
  try {
    const raw = localStorage.getItem(BALANCE_KEY)
    localStorage.removeItem(BALANCE_KEY)
    if (!raw) return null
    const { balance, at } = JSON.parse(raw) as { balance: number; at: number }
    if (typeof balance !== 'number' || Date.now() - at > BALANCE_TTL_MS) return null
    return balance
  } catch {
    return null
  }
}

export interface PaymentWindow {
  /** Перейти на оплату. onPaid вызовется, когда Stars-инвойс закрыт со статусом paid. */
  go: (url: string, onPaid?: () => void) => void
  /** Бэкенд не вернул ссылку — закрыть заготовленное окно. */
  cancel: () => void
}

export function isStarsInvoiceUrl(url: string): boolean {
  return /^https?:\/\/t\.me\/(\$|invoice\/)/i.test(url)
}

/**
 * Вызывать СИНХРОННО в обработчике клика, до любого await.
 */
export function preparePaymentWindow(webApp: WebApp | null): PaymentWindow {
  let popup: Window | null = null

  if (!webApp && typeof window !== 'undefined') {
    try {
      popup = window.open('', '_blank')
      if (popup) {
        try {
          popup.document.title = 'Переход к оплате…'
          popup.document.body.style.cssText =
            'margin:0;background:#0a0a0a;color:#fff;font:15px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'
          popup.document.body.textContent = 'Переход к оплате…'
        } catch {
          // чужой документ — не страшно
        }
      }
    } catch {
      popup = null
    }
  }

  return {
    go(url, onPaid) {
      rememberBalanceBeforePayment()
      if (webApp) {
        if (isStarsInvoiceUrl(url) && typeof webApp.openInvoice === 'function') {
          try {
            webApp.openInvoice(url, (status) => {
              if (status === 'paid') onPaid?.()
            })
            return
          } catch {
            // старый клиент — откроем как ссылку
          }
        }
        webApp.openLink(url)
        return
      }

      if (popup && !popup.closed) {
        try {
          // Платёжная страница не должна получать доступ к нашему окну
          popup.opener = null
          popup.location.href = url
          return
        } catch {
          try { popup.close() } catch { /* ignore */ }
        }
      }
      // Всплывающее окно заблокировано — оплата в этой же вкладке
      window.location.href = url
    },

    cancel() {
      if (popup && !popup.closed) {
        try { popup.close() } catch { /* ignore */ }
      }
      popup = null
    },
  }
}
