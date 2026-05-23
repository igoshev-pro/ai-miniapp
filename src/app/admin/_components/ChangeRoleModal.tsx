'use client'

import { useState } from 'react'
import { Loader2, X, ShieldCheck, User as UserIcon, Crown } from 'lucide-react'
import type { AdminUser, UserRole } from '@/types/admin-user'

interface Props {
  user: AdminUser
  onClose: () => void
  onConfirm: (role: UserRole) => Promise<void>
}

const ROLES: Array<{
  value: UserRole
  label: string
  desc: string
  Icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  {
    value: 'user',
    label: 'User',
    desc: 'Обычный пользователь',
    Icon: UserIcon,
    color: 'text-zinc-300 border-zinc-700',
  },
  {
    value: 'moderator',
    label: 'Moderator',
    desc: 'Модерация контента',
    Icon: ShieldCheck,
    color: 'text-cyan-400 border-cyan-500/30',
  },
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Полный доступ к админке',
    Icon: ShieldCheck,
    color: 'text-orange-400 border-orange-500/30',
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    desc: 'Может управлять админами',
    Icon: Crown,
    color: 'text-yellow-400 border-yellow-500/30',
  },
]

export function ChangeRoleModal({ user, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<UserRole>(user.role)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changed = selected !== user.role

  const handle = async () => {
    if (!changed) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(selected)
      onClose()
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Не удалось изменить роль',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-orange-500/30 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Изменить роль</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Текущая роль:{' '}
              <span className="text-white font-semibold">{user.role}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {ROLES.map((r) => {
            const active = selected === r.value
            const current = user.role === r.value
            return (
              <button
                key={r.value}
                onClick={() => setSelected(r.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-zinc-800/70 border-orange-500/50'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg border ${r.color} bg-zinc-900`}
                >
                  <r.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {r.label}
                    </span>
                    {current && (
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        текущая
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">{r.desc}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    active ? 'border-orange-400 bg-orange-400' : 'border-zinc-700'
                  }`}
                />
              </button>
            )
          })}

          {(selected === 'admin' || selected === 'super_admin') && (
            <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-3 text-xs text-orange-300">
              ⚠️ Эта роль даёт доступ к админ-панели и управлению пользователями.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-5 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handle}
            disabled={!changed || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-sm font-semibold text-white hover:from-orange-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}