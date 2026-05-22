'use client'

import { Shield, ShieldCheck } from 'lucide-react'
import type { AdminRole } from '@/hooks/useAdminAuth'

interface Props {
  username?: string
  telegramId: number
  role: AdminRole
}

export function AdminHeader({ username, telegramId, role }: Props) {
  const isSuper = role === 'super_admin'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-zinc-950/80 px-8 backdrop-blur-xl">
      <div className="text-sm text-zinc-400">Панель администратора</div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isSuper
              ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
              : 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
          }`}
        >
          {isSuper ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          {isSuper ? 'Super Admin' : 'Admin'}
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {username ? `@${username}` : 'Без юзернейма'}
          </div>
          <div className="text-[11px] text-zinc-500">ID: {telegramId}</div>
        </div>
      </div>
    </header>
  )
}