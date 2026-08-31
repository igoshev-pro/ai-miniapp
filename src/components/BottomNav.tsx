'use client'

import { Newspaper, Layers, Plus, Images, User } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChatStore } from '@/stores/chat.store'

interface Props {
  active: string
  onChange: (id: string) => void
}

// Избранное переехало внутрь Истории отдельной вкладкой: в нижнем меню
// пять слотов, и History нужнее — в неё заходят за своими работами,
// а в избранное заглядывают заметно реже.
const navItems = [
  { id: 'feed',                icon: Newspaper, label: 'Лента' },
  { id: 'generation-history',  icon: Images,    label: 'История' },
  { id: 'create',              icon: Plus,      label: 'Новый чат' },
  { id: 'models',              icon: Layers,    label: 'Модели' },
  { id: 'profile',             icon: User,      label: 'Профиль' },
]

export function BottomNav({ active, onChange }: Props) {
  const { haptic } = useTelegram()
  const switchToNewChat = useChatStore((s) => s.switchToNewChat)

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
                switchToNewChat()
                onChange(item.id)
              }}
            >
              <div className="bottom-nav__create">
                <Plus size={22} strokeWidth={2.5} />
              </div>
              <span className="bottom-nav__create-label">Новый чат</span>
            </button>
          )
        }

        const Icon = item.icon
        const isActive = active === item.id

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
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