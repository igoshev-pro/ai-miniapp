'use client'

import { useState } from 'react'
import { Loader2, X, Trash2, AlertTriangle } from 'lucide-react'
import type { AdminPromoCode } from '@/types/admin-promo'

interface Props {
  promo: AdminPromoCode
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeletePromoModal({ promo, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Не удалось удалить')
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
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Удалить промокод?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              <span className="font-mono text-pink-300">{promo.code}</span>
              {promo.description ? ` — ${promo.description}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 text-xs text-orange-300 bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              История использования будет удалена. Применённые ранее бонусы у пользователей сохранятся,
              но статистика по этому промокоду исчезнет.
            </span>
          </div>

          {promo.currentUses > 0 && (
            <div className="text-xs text-zinc-400">
              Промокод был использован{' '}
              <span className="text-white font-semibold">{promo.currentUses}</span> раз(а).
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-sm font-semibold text-white hover:from-red-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}