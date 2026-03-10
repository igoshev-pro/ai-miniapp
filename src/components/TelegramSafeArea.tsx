// src/components/TelegramSafeArea.tsx
'use client'

import { useEffect } from 'react'

export function TelegramSafeArea() {
  useEffect(() => {
    // Проверяем, открыто ли приложение в Telegram
    const isTelegram =
      window.Telegram?.WebApp?.initData ||
      window.Telegram?.WebApp?.platform !== undefined

    if (isTelegram) {
      document.body.classList.add('tg-mini-app')

      // Говорим Telegram раскрыть на весь экран
      window.Telegram?.WebApp?.expand?.()
      window.Telegram?.WebApp?.requestFullscreen?.()
    }

    return () => {
      document.body.classList.remove('tg-mini-app')
    }
  }, [])

  return null
}