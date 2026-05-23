'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Gem,
  Package,
  Users,
  Ticket,
  Receipt,
  Plug,
  Settings,
  Flame,
} from 'lucide-react'
import type { AdminRole } from '@/hooks/useAdminAuth'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  superAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/models', label: 'Модели', icon: Bot },
  { href: '/admin/billing/plans', label: 'Тарифы', icon: Gem },
  { href: '/admin/billing/packages', label: 'Пакеты спичек', icon: Package },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/promo-codes', label: 'Промокоды', icon: Ticket },
  { href: '/admin/transactions', label: 'Транзакции', icon: Receipt },
  { href: '/admin/providers', label: 'Провайдеры', icon: Plug },
  {
    href: '/admin/settings',
    label: 'Настройки',
    icon: Settings,
    superAdminOnly: true,
  },
]

interface Props {
  role: AdminRole
}

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-white/5 bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Spichki AI</div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            Admin Panel
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.superAdminOnly && role !== 'super_admin') return null

            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)

            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/20 to-red-500/10 text-orange-400 ring-1 ring-orange-500/30'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-5 py-4">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          ← К приложению
        </Link>
      </div>
    </aside>
  )
}