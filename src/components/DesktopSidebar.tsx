'use client'

import { Newspaper, Layers, Plus, Star, User, Flame } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChatStore } from '@/stores/chat.store'
import { useUser } from '@/hooks'

interface Props {
  active: string
  onChange: (id: string) => void
}

const navItems = [
  { id: 'feed',      icon: Newspaper, label: 'Лента' },
  { id: 'favorites', icon: Star,      label: 'Избранное' },
  { id: 'create',    icon: Plus,      label: 'Новый чат' },
  { id: 'models',    icon: Layers,    label: 'Модели' },
  { id: 'profile',   icon: User,      label: 'Профиль' },
]

export function DesktopSidebar({ active, onChange }: Props) {
  const { haptic } = useTelegram()
  const { balance, isLoaded } = useUser()
  const switchToNewChat = useChatStore((s) => s.switchToNewChat)

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div className="desktop-sidebar__logo">
        <span className="desktop-sidebar__logo-text">SPICHKI AI</span>
      </div>

      {/* Balance */}
      <div className="desktop-sidebar__balance">
        <Flame size={14} className="desktop-sidebar__balance-flame" />
        <span className="desktop-sidebar__balance-amount">
          {isLoaded ? balance.toLocaleString() : '0'}
        </span>
        <span className="desktop-sidebar__balance-label">спичек</span>
      </div>

      {/* Navigation */}
      <nav className="desktop-sidebar__nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isCreate = item.id === 'create'

          return (
            <button
              key={item.id}
              className={`desktop-sidebar__item ${
                active === item.id ? 'desktop-sidebar__item--active' : ''
              } ${isCreate ? 'desktop-sidebar__item--create' : ''}`}
              onClick={() => {
                haptic(isCreate ? 'medium' : 'light')
                if (isCreate) switchToNewChat()
                onChange(item.id)
              }}
            >
              <div className="desktop-sidebar__item-icon">
                <Icon size={20} />
              </div>
              <span className="desktop-sidebar__item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="desktop-sidebar__footer">
        <div className="desktop-sidebar__version">v1.0</div>
      </div>
    </aside>
  )
}