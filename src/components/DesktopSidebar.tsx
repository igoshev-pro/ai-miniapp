'use client'

import { Plus, Newspaper, Star, Layers, User, Flame, Zap } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChatStore } from '@/stores/chat.store'
import { useUser } from '@/hooks'

interface Props {
  active: string
  onChange: (id: string) => void
}

const navItems = [
  { id: 'feed', icon: Newspaper, label: 'Лента' },
  { id: 'favorites', icon: Star, label: 'Избранное' },
  { id: 'models', icon: Layers, label: 'Модели' },
  { id: 'profile', icon: User, label: 'Профиль' },
]

export function DesktopSidebar({ active, onChange }: Props) {
  const { haptic } = useTelegram()
  const user = useUser()
  const switchToNewChat = useChatStore((s) => s.switchToNewChat)

  // ── Защита от undefined ──
  const balance = user?.balance ?? 0
  const isLoaded = user?.isLoaded ?? false

  const formatted = isLoaded ? balance.toLocaleString() : '—'
  const barWidth = Math.min(100, Math.max(5, (balance / 10000) * 100))

  // ── Дебаг: убери после проверки ──
  console.log('[Sidebar] useUser =>', { balance, isLoaded, raw: user })

  return (
    <aside className="desktop-sidebar">
      {/* ─── Logo ─── */}
      <div className="desktop-sidebar__logo">
        <span className="desktop-sidebar__logo-icon">🔥</span>
        <span className="desktop-sidebar__logo-text">SPICHKI</span>
      </div>

      {/* ─── New Chat ─── */}
      <div className="desktop-sidebar__create-wrap">
        <button
          onClick={() => {
            haptic('medium')
            switchToNewChat()
            onChange('create')
          }}
          className="desktop-sidebar__create-btn"
        >
          <div className="desktop-sidebar__create-icon">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <span className="desktop-sidebar__create-label">Новый чат</span>
        </button>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="desktop-sidebar__nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id

          return (
            <button
              key={item.id}
              onClick={() => {
                haptic('light')
                onChange(item.id)
              }}
              className={[
                'desktop-sidebar__item',
                isActive ? 'desktop-sidebar__item--active' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="desktop-sidebar__item-icon">
                <Icon size={20} />
              </div>
              <span className="desktop-sidebar__item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ─── Balance Card ─── */}
      <div className="desktop-sidebar__balance-card">
        <div className="desktop-sidebar__balance-top">
          <div className="desktop-sidebar__balance-glow">
            <Flame size={16} />
          </div>
          <div className="desktop-sidebar__balance-info">
            <span className="desktop-sidebar__balance-hint">Баланс</span>
            <span className="desktop-sidebar__balance-amount">{formatted}</span>
          </div>
        </div>

        <div className="desktop-sidebar__bar">
          <div
            className="desktop-sidebar__bar-fill"
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <button
          onClick={() => {
            haptic('light')
            onChange('topup')
          }}
          className="desktop-sidebar__topup-btn"
        >
          <Zap size={12} />
          <span className="desktop-sidebar__topup-label">Пополнить</span>
        </button>
      </div>

      {/* ─── Footer ─── */}
      <div className="desktop-sidebar__footer">
        <span className="desktop-sidebar__version">v1.0 · AI Platform</span>
      </div>
    </aside>
  )
}