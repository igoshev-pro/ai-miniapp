'use client'

import Link from 'next/link'
import {
  Bot,
  Gem,
  Package,
  Users,
  Ticket,
  Receipt,
  Plug,
  Settings,
  ArrowRight,
} from 'lucide-react'

interface QuickLink {
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/admin/models',
    label: 'Модели',
    description: 'Управление AI-моделями, ценами, лимитами',
    icon: Bot,
    color: 'from-orange-500/20 to-red-500/10 text-orange-400 ring-orange-500/30',
  },
  {
    href: '/admin/plans',
    label: 'Тарифы',
    description: 'Подписки: Basic, Plus, Max, Ultimate',
    icon: Gem,
    color:
      'from-purple-500/20 to-fuchsia-500/10 text-purple-400 ring-purple-500/30',
  },
  {
    href: '/admin/packages',
    label: 'Пакеты спичек',
    description: 'Разовая покупка токенов',
    icon: Package,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 ring-amber-500/30',
  },
  {
    href: '/admin/users',
    label: 'Пользователи',
    description: 'Поиск, балансы, баны, роли',
    icon: Users,
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-400 ring-blue-500/30',
  },
  {
    href: '/admin/promo-codes',
    label: 'Промокоды',
    description: 'Создание и управление промокодами',
    icon: Ticket,
    color: 'from-pink-500/20 to-rose-500/10 text-pink-400 ring-pink-500/30',
  },
  {
    href: '/admin/transactions',
    label: 'Транзакции',
    description: 'История платежей и списаний',
    icon: Receipt,
    color:
      'from-emerald-500/20 to-green-500/10 text-emerald-400 ring-emerald-500/30',
  },
  {
    href: '/admin/providers',
    label: 'Провайдеры',
    description: 'OpenAI, Anthropic, KIE и др.',
    icon: Plug,
    color:
      'from-indigo-500/20 to-violet-500/10 text-indigo-400 ring-indigo-500/30',
  },
  {
    href: '/admin/settings',
    label: 'Настройки',
    description: 'Курс спички, бонусы, глобальные параметры',
    icon: Settings,
    color: 'from-zinc-500/20 to-zinc-400/10 text-zinc-300 ring-zinc-500/30',
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Дашборд</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Добро пожаловать в админку Spichki AI 🔥
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-5 transition-all hover:border-white/10 hover:bg-zinc-900"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${link.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="mb-1 flex items-center gap-1 text-base font-semibold text-white">
                {link.label}
                <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                {link.description}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">
          📊 Аналитика
        </h2>
        <p className="text-xs text-zinc-500">
          Графики revenue, генераций и популярных моделей появятся здесь в
          ближайшем апдейте.
        </p>
      </div>
    </div>
  )
}