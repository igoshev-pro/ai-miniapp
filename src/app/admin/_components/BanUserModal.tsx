'use client'

import { useState } from 'react'
import { Ban, Loader2, X, ShieldCheck } from 'lucide-react'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function BanUserModal({ user, onClose, onConfirm }: Props) {
  const isBan = !user.isBanned
  const [reason, setReason] = useState(user.banReason || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async () => {
    if (isBan && reason.trim().length < 3) {
      setError('Укажи причину (мин. 3 символа)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Не удалось выполнить',
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
        className={`w-full max-w-md rounded-2xl border bg-zinc-900 shadow-2xl ${
          isBan ? 'border-red-500/30' : 'border-emerald-500/30'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div
            className={`p-2 rounded-xl border ${
              isBan
                ? 'bg-red-500/15 border-red-500/30'
                : 'bg-emerald-500/15 border-emerald-500/30'
            }`}
          >
            {isBan ? (
              <Ban className="w-5 h-5 text-red-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">
              {isBan ? 'Забанить пользователя?' : 'Разбанить пользователя?'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isBan
                ? 'Пользователь не сможет пользоваться сервисом'
                : 'Доступ будет восстановлен'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                {(user.firstName || user.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm text-white truncate">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  user.username ||
                  '—'}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {user.username ? `@${user.username}` : user.email || `id:${user.telegramId}`}
              </div>
            </div>
          </div>

          {isBan && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Причина бана <span className="text-red-400">*</span>
              </label>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Например: спам в чате, нарушение правил..."
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-500/50 resize-none"
              />
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
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 ${
              isBan
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isBan ? 'Бан...' : 'Разбан...'}
              </>
            ) : isBan ? (
              'Забанить'
            ) : (
              'Разбанить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}