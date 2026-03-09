// src/app/layout.tsx

import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { TelegramProvider } from '@/context/TelegramContext'
import { ToastContainer } from '@/components/ui/ToastContainer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Спички — Агрегатор ИИ',
  description: 'Все нейросети в одном месте. Telegram Mini App.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" data-color-scheme="dark" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body suppressHydrationWarning>
        <TelegramProvider>
          {children}
          <ToastContainer />
        </TelegramProvider>
      </body>
    </html>
  )
}