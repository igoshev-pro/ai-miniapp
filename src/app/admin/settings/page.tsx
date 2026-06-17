'use client'

import Link from 'next/link'
import { 
  Flame, 
  Settings as SettingsIcon, 
  Zap, 
  Bell, 
  Shield, 
  Database,
  ChevronRight,
  Sparkles,
  ImageIcon
} from 'lucide-react'

interface SettingCard {
  href: string
  icon: React.ElementType
  title: string
  description: string
  badge?: string
  badgeColor?: string
  ready: boolean
}

const SETTINGS: SettingCard[] = [
  {
    href: '/admin/settings/tokenomics',
    icon: Flame,
    title: 'Токеномика',
    description: 'Курс спичек, бонусы при регистрации, пачки покупок, рефералка',
    badge: 'Активно',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ready: true,
  },
  {
    href: '/admin/category-covers',
    icon: ImageIcon,
    title: 'Обложки категорий',
    description: 'Изображения для 4 типов нейросетей на главной странице',
    badge: 'Активно',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ready: true,
  },
  {
    href: '/admin/settings/generation',
    icon: Zap,
    title: 'Параметры генерации',
    description: 'Дефолтные настройки моделей, лимиты, таймауты',
    badge: 'Скоро',
    badgeColor: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    ready: false,
  },
  {
    href: '/admin/settings/notifications',
    icon: Bell,
    title: 'Уведомления',
    description: 'Шаблоны рассылок, триггеры, каналы доставки',
    badge: 'Скоро',
    badgeColor: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    ready: false,
  },
  {
    href: '/admin/settings/security',
    icon: Shield,
    title: 'Безопасность',
    description: 'Rate-limits, блокировки, антифрод правила',
    badge: 'Скоро',
    badgeColor: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    ready: false,
  },
  {
    href: '/admin/settings/system',
    icon: Database,
    title: 'Системные',
    description: 'Maintenance mode, фича-флаги, кэш, очереди',
    badge: 'Скоро',
    badgeColor: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    ready: false,
  },
]

export default function SettingsHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <SettingsIcon className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Настройки</h1>
            <p className="text-sm text-zinc-400">
              Конфигурация системы, экономики и поведения
            </p>
          </div>
        </div>
      </div>

      {/* Quick stat / promo banner */}
      <div className="mb-8 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-red-500/5 to-transparent p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 shrink-0">
          <Sparkles className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1">Совет</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Изменения в токеномике применяются <strong className="text-zinc-200">мгновенно</strong> для новых регистраций и покупок.
            Уже выданные бонусы и купленные пачки пересчёту не подлежат.
          </p>
        </div>
      </div>

      {/* Settings grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS.map((s) => {
          const Icon = s.icon
          const Wrapper = s.ready ? Link : 'div'
          const wrapperProps = s.ready ? { href: s.href } : {}

          return (
            <Wrapper
              key={s.href}
              {...(wrapperProps as any)}
              className={`
                group relative rounded-2xl border p-5 transition-all
                ${s.ready 
                  ? 'border-zinc-800 bg-zinc-900/50 hover:border-orange-500/40 hover:bg-zinc-900 cursor-pointer' 
                  : 'border-zinc-800/50 bg-zinc-900/30 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  p-2.5 rounded-xl border shrink-0 transition-colors
                  ${s.ready 
                    ? 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20 group-hover:border-orange-500/40' 
                    : 'bg-zinc-800/50 border-zinc-700/50'
                  }
                `}>
                  <Icon className={`w-5 h-5 ${s.ready ? 'text-orange-400' : 'text-zinc-500'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{s.title}</h3>
                    {s.badge && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {s.ready && (
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all shrink-0" />
                )}
              </div>
            </Wrapper>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-8 text-center text-xs text-zinc-600">
        Нужен новый раздел настроек? Скажи разработчику 🚀
      </div>
    </div>
  )
}