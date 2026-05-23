'use client'

import { useState, useMemo } from 'react'
import { Loader2, X, Wallet, Plus, Minus, AlertTriangle } from 'lucide-react'
import type { AdminUser } from '@/types/admin-user'
import type { BalanceType } from '@/lib/api/admin-users'

interface Props {
  user: AdminUser
  onClose: () => void
  onConfirm: (body: {
    balanceType: BalanceType
    amount: number
    reason: string
  }) => Promise<void>
}

const BALANCES: Array<{
  value: BalanceType
  label: string
  short: string
  color: string
  warn?: string
}> = [
  {
    value: 'tokenBalance',
    label: 'Основные токены',
    short: '🔥 Токены',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
  },
  {
    value: 'bonusTokens',
    label: 'Бонусные токены',
    short: '🎁 Бонусы',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
  },
  {
    value: 'cashbackBalance',
    label: 'Кэшбек',
    short: '💰 Кэшбек',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300',
    warn: 'Кэшбек может быть выведен реальными деньгами',
  },
]

export function AdjustBalanceModal({ user, onClose, onConfirm }: Props) {
  const [balanceType, setBalanceType] = useState<BalanceType>('tokenBalance')
  const [mode, setMode] = useState<'add' | 'subtract'>('add')
  const [amountStr, setAmountStr] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentValue = useMemo(() => {
    if (balanceType === 'tokenBalance') return user.tokenBalance
    if (balanceType === 'bonusTokens') return user.bonusTokens
    return user.cashbackBalance
  }, [balanceType, user])

  const amount = Number(amountStr) || 0
  const delta = mode === 'add' ? amount : -amount
  const after = currentValue + delta
  const willGoNegative = after < 0

  const selected = BALANCES.find((b) => b.value === balanceType)!

  const canSubmit =
    amount > 0 &&
    Number.isInteger(amount) &&
    reason.trim().length >= 3 &&
    !willGoNegative &&
    !loading

  const handle = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm({ balanceType, amount: delta, reason: reason.trim() })
      onClose()
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          'Не удалось скорректировать баланс',
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
        className="w-full max-w-md rounded-2xl border border-blue-500/30 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30">
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Корректировка баланса</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.username ||
                `id:${user.telegramId}`}
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
          {/* Тип баланса */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Тип баланса</label>
            <div className="grid grid-cols-3 gap-2">
              {BALANCES.map((b) => {
                const active = balanceType === b.value
                return (
                  <button
                    key={b.value}
                    onClick={() => setBalanceType(b.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? `bg-gradient-to-br ${b.color}`
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{b.short}</div>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Текущее значение:{' '}
              <span className="text-white font-semibold">
                {currentValue.toLocaleString('ru-RU')}
              </span>
            </div>
            {selected.warn && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-orange-300 bg-orange-500/5 border border-orange-500/20 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>⚠ {selected.warn}</span>
              </div>
            )}
          </div>

          {/* Mode: add/subtract */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Операция</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('add')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  mode === 'add'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-semibold">Начислить</span>
              </button>
              <button
                onClick={() => setMode('subtract')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  mode === 'subtract'
                    ? 'bg-red-500/15 border-red-500/50 text-red-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span className="text-sm font-semibold">Списать</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Сумма</label>
            <input
              type="number"
              min="1"
              step="1"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50"
            />
            {amount > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-zinc-500">После операции: </span>
                <span
                  className={`font-semibold ${
                    willGoNegative ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {after.toLocaleString('ru-RU')}
                </span>
                {willGoNegative && (
                  <span className="text-red-400 ml-2">⚠ Уйдёт в минус!</span>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Причина <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Например: компенсация за сбой генерации"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

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
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Применить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}