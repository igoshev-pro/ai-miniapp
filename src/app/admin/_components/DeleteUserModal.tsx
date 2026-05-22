'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteUserModal({ user, onClose, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyValue =
    user.username ||
    user.email ||
    (user.telegramId ? String(user.telegramId) : user._id.slice(-6))

  const canDelete = confirmText.trim() === verifyValue && !loading

  const handleDelete = async () => {
    if (!canDelete) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Не удалось удалить')
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
        className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Удалить пользователя?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Действие необратимо</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* User card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-red-500/30 flex items-center justify-center text-sm font-bold text-red-300">
                {(user.firstName || user.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm text-white truncate">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '—'}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {user.username ? `@${user.username}` : user.email || `id:${user.telegramId}`}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 space-y-1.5">
            <p className="text-xs text-red-300 font-semibold uppercase tracking-wider">
              Что произойдёт:
            </p>
            <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
              <li>Аккаунт будет удалён навсегда</li>
              <li>История транзакций сохранится (для отчётности)</li>
              <li>Генерации останутся в базе как «orphan»</li>
              <li>Реферальные связи будут разорваны</li>
              {user.totalDeposited > 0 && (
                <li className="text-orange-300">
                  ⚠ Пользователь внёс <b>{user.totalDeposited.toLocaleString('ru-RU')} ₽</b>
                </li>
              )}
            </ul>
          </div>

          {/* Confirm input */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Для подтверждения введите{' '}
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-red-300 font-mono">
                {verifyValue}
              </code>
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
              placeholder={verifyValue}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-500/50"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-5 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-sm font-semibold text-white hover:from-red-500 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить навсегда'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}