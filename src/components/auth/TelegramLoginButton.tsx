'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { TelegramWidgetData } from '@/hooks/useAuth'

interface TelegramLoginButtonProps {
  onAuth: (data: TelegramWidgetData) => Promise<void>
}

declare global {
  interface Window {
    onTelegramWidgetAuth?: (user: TelegramWidgetData) => void
  }
}

export function TelegramLoginButton({ onAuth }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  const handleAuth = useCallback(
    async (data: TelegramWidgetData) => {
      setIsLoading(true)
      setError(null)
      try {
        await onAuth(data)
      } catch {
        setError('Ошибка авторизации. Попробуйте ещё раз.')
      } finally {
        setIsLoading(false)
      }
    },
    [onAuth],
  )

  useEffect(() => {
    if (!botUsername || !containerRef.current) return

    // Global callback for Telegram widget
    window.onTelegramWidgetAuth = (user: TelegramWidgetData) => {
      handleAuth(user)
    }

    // Create and inject widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramWidgetAuth(user)')
    script.setAttribute('data-request-access', 'write')

    // Clear container and append script
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(script)

    return () => {
      delete window.onTelegramWidgetAuth
    }
  }, [botUsername, handleAuth])

  if (!botUsername) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>
          Telegram Login не настроен. Откройте приложение в Telegram.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🔥</div>
        <h1 style={styles.title}>SPICHKI AI</h1>
        <p style={styles.subtitle}>Все нейросети в одном месте</p>

        <div style={styles.divider} />

        <p style={styles.loginHint}>
          Войдите через Telegram, чтобы продолжить
        </p>

        {isLoading ? (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>Авторизация...</span>
          </div>
        ) : (
          <div ref={containerRef} style={styles.widgetWrapper} />
        )}

        {error && <p style={styles.errorText}>{error}</p>}

        <p style={styles.footerHint}>
          Или откройте{' '}
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            @{botUsername}
          </a>{' '}
          в Telegram
        </p>
      </div>
    </div>
  )
}

// ─── Inline styles (no external CSS needed) ──────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)',
    zIndex: 9999,
    padding: '20px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '380px',
    width: '100%',
    padding: '40px 24px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logo: {
    fontSize: '56px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: 0,
  },
  divider: {
    width: '60px',
    height: '2px',
    background: 'linear-gradient(90deg, #FF6B35, #FF8F65)',
    borderRadius: '1px',
    margin: '24px 0',
  },
  loginHint: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
  },
  widgetWrapper: {
    minHeight: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 0',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#FF6B35',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  errorText: {
    fontSize: '13px',
    color: '#FF6B6B',
    marginTop: '12px',
    textAlign: 'center' as const,
  },
  footerHint: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: '24px',
    textAlign: 'center' as const,
  },
  link: {
    color: '#FF6B35',
    textDecoration: 'none',
  },
}