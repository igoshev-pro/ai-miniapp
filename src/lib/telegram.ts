// src/lib/telegram.ts

// --- Типы Telegram WebApp ---

export interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface InitDataUnsafe {
  query_id?: string
  user?: TelegramUser
  auth_date?: number
  hash?: string
  start_param?: string
}

interface BackButton {
  isVisible: boolean
  show: () => void
  hide: () => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
}

interface MainButton {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  show: () => void
  hide: () => void
  enable: () => void
  disable: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  setParams: (params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }) => void
}

interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

interface SafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export interface WebApp {
  initData: string
  initDataUnsafe: InitDataUnsafe
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  BackButton: BackButton
  MainButton: MainButton
  HapticFeedback: HapticFeedback
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
  ready: () => void
  expand: () => void
  close: () => void
  sendData: (data: string) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  setBottomBarColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  disableVerticalSwipes?: () => void
  enableVerticalSwipes?: () => void
  isVersionAtLeast: (version: string) => boolean
  requestFullscreen: () => void
  onEvent: (eventType: string, callback: (...args: unknown[]) => void) => void
  offEvent: (eventType: string, callback: (...args: unknown[]) => void) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
}

declare global {
  interface Window {
    Telegram?: any
  }
}

// --- Утилиты ---

export function getWebApp(): WebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp as WebApp
  }
  return null
}

export function haptic(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
  try {
    getWebApp()?.HapticFeedback?.impactOccurred(style)
  } catch {}
}

export function hapticNotification(type: 'error' | 'success' | 'warning') {
  try {
    getWebApp()?.HapticFeedback?.notificationOccurred(type)
  } catch {}
}

export function hapticSelection() {
  try {
    getWebApp()?.HapticFeedback?.selectionChanged()
  } catch {}
}

export function getUserInitials(user: TelegramUser | null | undefined): string {
  if (!user) return '?'
  const first = user.first_name?.[0] ?? ''
  const last = user.last_name?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

export function getUserDisplayName(user: TelegramUser | null | undefined): string {
  if (!user) return 'Гость'
  const parts = [user.first_name, user.last_name].filter(Boolean)
  return parts.join(' ') || 'Гость'
}