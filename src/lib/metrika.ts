/**
 * Яндекс Метрика: номер счётчика и цели для Директа.
 *
 * Идентификаторы целей зафиксированы в плане рекламной кампании и заведены
 * в Метрике руками — переименовывать нельзя, иначе Директ потеряет конверсии.
 *
 * Счётчик работает только на боевом домене: локальные и тестовые заходы
 * не должны попадать в статистику и обучать стратегию Директа. Для проверки
 * на localhost добавь к адресу `?_ym_debug=1`.
 */

export const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID || 113888841)

export type MetrikaGoal = 'lp_cta' | 'sign_up' | 'first_gen' | 'purchase'

const PROD_HOST = 'spichki-ai.net'

/** Сколько после создания аккаунта вход ещё считается регистрацией. */
const SIGN_UP_WINDOW_MS = 15 * 60 * 1000
/** Первую генерацию засчитываем только новичкам, а не старым пользователям на новом устройстве. */
const FIRST_GEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void
  }
}

export function isMetrikaEnabled(): boolean {
  if (typeof window === 'undefined' || !YM_ID) return false
  const host = window.location.hostname
  if (host === PROD_HOST || host.endsWith('.' + PROD_HOST)) return true
  return window.location.search.includes('_ym_debug')
}

/**
 * Очередь ym и init, как в официальном сниппете. Вызывается до загрузки
 * tag.js, поэтому цели, отправленные раньше скрипта, не теряются: tag.js
 * разберёт очередь, когда загрузится.
 */
export function initMetrika() {
  if (!isMetrikaEnabled() || (window as any).__ymInited) return
  ;(window as any).__ymInited = true
  const w = window as any
  w.ym =
    w.ym ||
    function (...args: unknown[]) {
      ;(w.ym.a = w.ym.a || []).push(args)
    }
  w.ym.l = Date.now()
  w.ym(YM_ID, 'init', {
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  })
}

export function reachGoal(goal: MetrikaGoal, params?: Record<string, unknown>) {
  if (!isMetrikaEnabled()) return
  try {
    initMetrika()
    window.ym?.(YM_ID, 'reachGoal', goal, params)
  } catch {
    // метрика не должна ломать приложение
  }
}

/** Цель, которая для данного ключа срабатывает один раз на браузер. */
function reachGoalOnce(key: string, goal: MetrikaGoal, params?: Record<string, unknown>) {
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    // без localStorage лучше лишний раз отправить, чем потерять конверсию
  }
  reachGoal(goal, params)
}

function isRecent(createdAt: string | null | undefined, windowMs: number): boolean {
  if (!createdAt) return false
  const t = Date.parse(createdAt)
  return Number.isFinite(t) && Date.now() - t < windowMs
}

/**
 * Регистрация: профиль появился, и аккаунт создан только что. Так один
 * сигнал покрывает все способы входа (виджет Telegram, бот, Mini App, почта),
 * а повторный вход старого пользователя целью не считается.
 */
export function trackSignUp(user: { id: string; createdAt: string | null }) {
  if (!isRecent(user.createdAt, SIGN_UP_WINDOW_MS)) return
  reachGoalOnce(`ym_sign_up_${user.id}`, 'sign_up')
}

export function trackFirstGeneration(user: { id: string; createdAt: string | null } | null | undefined) {
  if (!user || !isRecent(user.createdAt, FIRST_GEN_WINDOW_MS)) return
  reachGoalOnce(`ym_first_gen_${user.id}`, 'first_gen')
}
