'use client'

import { Newspaper, Layers, Plus, Star, User } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'

interface Props {
  active: string
  onChange: (id: string) => void
}

const navItems = [
  { id: 'feed',      icon: Newspaper, label: 'Лента' },
  { id: 'favorites', icon: Star,      label: 'Избранное' },
  { id: 'create',    icon: Plus,      label: '' },
  { id: 'models',    icon: Layers,    label: 'Модели' },
  { id: 'profile',   icon: User,      label: 'Профиль' },
]

export function BottomNav({ active, onChange }: Props) {
  const { haptic } = useTelegram()

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        if (item.id === 'create') {
          return (
            <button
              key={item.id}
              className="bottom-nav__item bottom-nav__item--center"
              onClick={() => {
                haptic('medium')
                onChange(item.id)
              }}
            >
              <div className="bottom-nav__create">
                <Plus size={24} />
              </div>
            </button>
          )
        }

        const Icon = item.icon

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${
              active === item.id ? 'bottom-nav__item--active' : ''
            }`}
            onClick={() => {
              haptic('light')
              onChange(item.id)
            }}
          >
            <div className="bottom-nav__icon">
              <Icon size={20} />
            </div>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}