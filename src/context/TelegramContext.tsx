'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  getWebApp,
  haptic as hapticFn,
  hapticNotification as hapticNotificationFn,
  hapticSelection as hapticSelectionFn,
  getUserInitials,
  getUserDisplayName,
  type WebApp,
  type TelegramUser,
} from '@/lib/telegram'

interface TelegramContextValue {
  webApp: WebApp | null
  user: TelegramUser | null
  userInitials: string
  userDisplayName: string
  colorScheme: 'light' | 'dark'
  platform: string
  startParam: string | null
  isReady: boolean
  isTelegram: boolean
  haptic: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  hapticNotification: (type: 'error' | 'success' | 'warning') => void
  hapticSelection: () => void
  showBackButton: (callback: () => void) => void
  hideBackButton: () => void
  showMainButton: (text: string, callback: () => void) => void
  hideMainButton: () => void
  close: () => void
  sendData: (data: string) => void
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  user: null,
  userInitials: '?',
  userDisplayName: 'Гость',
  colorScheme: 'dark',
  platform: 'unknown',
  startParam: null,
  isReady: false,
  isTelegram: false,
  haptic: () => {},
  hapticNotification: () => {},
  hapticSelection: () => {},
  showBackButton: () => {},
  hideBackButton: () => {},
  showMainButton: () => {},
  hideMainButton: () => {},
  close: () => {},
  sendData: () => {},
})

function applySafeArea(wa: WebApp) {
  const safeTop = wa.safeAreaInset?.top ?? 0
  const contentTop = wa.contentSafeAreaInset?.top ?? 0
  const total = safeTop + contentTop

  // Минимум 44px на iOS (статус-бар), 0 на десктопе
  const platform = (wa.platform || '').toLowerCase()
  const isPhone = platform.includes('ios') || platform.includes('android')
  const minOffset = isPhone ? 44 : 0
  const offset = Math.max(total, minOffset)

  document.documentElement.style.setProperty('--safe-area-top', offset + 'px')
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<WebApp | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const wa = getWebApp()
    if (wa) {
      wa.ready()
      wa.expand()
      wa.setHeaderColor('#0a0a0a')
      wa.setBackgroundColor('#0a0a0a')

      if (wa.isVersionAtLeast('7.10')) {
        wa.setBottomBarColor('#0a0a0a')
      }

      wa.enableClosingConfirmation()

      // Fullscreen
      if (wa.isVersionAtLeast('8.0')) {
        try {
          wa.requestFullscreen()
        } catch {}
      }

      // Считаем safe area
      applySafeArea(wa)

      // Слушаем изменения safe area (при fullscreen они меняются)
      if (wa.onEvent) {
        try {
          wa.onEvent('safeAreaChanged' as any, () => applySafeArea(wa))
          wa.onEvent('contentSafeAreaChanged' as any, () => applySafeArea(wa))
        } catch {}
      }

      // Фоллбек: пересчитываем через 500ms (после fullscreen)
      setTimeout(() => applySafeArea(wa), 500)
      setTimeout(() => applySafeArea(wa), 1500)

      setWebApp(wa)
    }
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!webApp) return

    const handleViewport = () => {
      document.documentElement.style.setProperty(
        '--tg-viewport-height',
        `${webApp.viewportHeight}px`
      )
      document.documentElement.style.setProperty(
        '--tg-viewport-stable-height',
        `${webApp.viewportStableHeight}px`
      )
      // Пересчитываем safe area при изменении viewport
      applySafeArea(webApp)
    }

    handleViewport()
    webApp.onEvent('viewportChanged', handleViewport)
    return () => webApp.offEvent('viewportChanged', handleViewport)
  }, [webApp])

  useEffect(() => {
    if (!webApp) return

    const handleTheme = () => {
      document.documentElement.setAttribute('data-color-scheme', webApp.colorScheme)
    }

    handleTheme()
    webApp.onEvent('themeChanged', handleTheme)
    return () => webApp.offEvent('themeChanged', handleTheme)
  }, [webApp])

  const user = webApp?.initDataUnsafe?.user ?? null

  const showBackButton = useCallback(
    (callback: () => void) => {
      if (webApp?.BackButton) {
        webApp.BackButton.onClick(callback)
        webApp.BackButton.show()
      }
    },
    [webApp]
  )

  const hideBackButton = useCallback(() => {
    webApp?.BackButton?.hide()
  }, [webApp])

  const showMainButton = useCallback(
    (text: string, callback: () => void) => {
      if (webApp?.MainButton) {
        webApp.MainButton.setParams({
          text,
          color: '#FACC15',
          text_color: '#0A0A0A',
          is_active: true,
          is_visible: true,
        })
        webApp.MainButton.onClick(callback)
        webApp.MainButton.show()
      }
    },
    [webApp]
  )

  const hideMainButton = useCallback(() => {
    webApp?.MainButton?.hide()
  }, [webApp])

  const value: TelegramContextValue = {
    webApp,
    user,
    userInitials: getUserInitials(user),
    userDisplayName: getUserDisplayName(user),
    colorScheme: webApp?.colorScheme ?? 'dark',
    platform: webApp?.platform ?? 'unknown',
    startParam: webApp?.initDataUnsafe?.start_param ?? null,
    isReady,
    isTelegram: !!webApp,
    haptic: hapticFn,
    hapticNotification: hapticNotificationFn,
    hapticSelection: hapticSelectionFn,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    close: () => webApp?.close(),
    sendData: (data: string) => webApp?.sendData(data),
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  return useContext(TelegramContext)
}
