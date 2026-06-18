'use client'

import { useEffect, useState } from 'react'
import { X, Crown, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import type { AdminUser } from '@/types/admin-user'
import type { AdminUserSubscriptionInfo, SetSubscriptionBody } from '@/lib/api/admin-users'
import { adminBillingApi } from '@/lib/api/admin-billing'
import type { AdminSubscriptionPlan } from '@/types/admin-billing'

interface Props {
  user: AdminUser
  currentSubscription: AdminUserSubscriptionInfo | null
  onClose: () => void
  onConfirm: (body: SetSubscriptionBody) => Promise<void>
}

const DURATION_DAYS = 30

export function SetSubscriptionModal({
  user,
  currentSubscription,
  onClose,
  onConfirm,
}: Props) {
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plansError, setPlansError] = useState<string | null>(null)

  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Загружаем актуальный список планов из БД
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingPlans(true)
      setPlansError(null)
      try {
        const list = await adminBillingApi.listPlans()
        if (cancelled) return
        // Только активные платные планы (free выбираем отдельной кнопкой)
        const filtered = (list || [])
          .filter((p) => p.isActive && p.planKey !== 'free')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.priceRub - b.priceRub)
        setPlans(filtered)
      } catch (e: any) {
        if (cancelled) return
        setPlansError(e?.response?.data?.message || e?.message || 'Не удалось загрузить планы')
      } finally {
        if (!cancelled) setLoadingPlans(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    `tg:${user.telegramId}`

  const isCurrentlyActive = !!currentSubscription?.isActive
  const currentPlanKey = currentSubscription?.plan || 'free'

  const handleActivate = async () => {
    if (!selectedPlan) {
      setSubmitError('Выберите тарифный план')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onConfirm({
        plan: selectedPlan,
        durationDays: DURATION_DAYS,
        grantTokens: false, // ❗ токены не начисляем
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message || e?.message || 'Ошибка активации')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onConfirm({
        plan: 'free',
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message || e?.message || 'Ошибка снятия подписки')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30">
              <Crown className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Управление подпиской</h3>
              <p className="text-[11px] text-zinc-500 truncate max-w-[260px]">{fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Current subscription */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Текущий статус
            </div>
            {isCurrentlyActive ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white capitalize">
                    {currentSubscription?.planName || currentPlanKey}
                  </div>
                  {currentSubscription?.expiresAt && (
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      до {new Date(currentSubscription.expiresAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>
                {currentSubscription?.source && (
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                    {currentSubscription.source}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Free (без подписки)</div>
            )}
          </div>

          {/* Plans list */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">
              Выдать план на {DURATION_DAYS} дней{' '}
              <span className="text-zinc-600">(токены не начисляются)</span>
            </label>

            {loadingPlans ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка планов...
              </div>
            ) : plansError ? (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{plansError}</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-xs text-zinc-500 py-2">Нет доступных планов</div>
            ) : (
              <div className="space-y-2">
                {plans.map((p) => {
                  const isSelected = selectedPlan === p.planKey
                  const isCurrent = currentPlanKey === p.planKey && isCurrentlyActive
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setSelectedPlan(p.planKey)}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-purple-500/60 bg-purple-500/10'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white capitalize">
                            {p.name}
                          </span>
                          {p.isPopular && (
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                          )}
                          {isCurrent && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              текущий
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {p.tokensPerMonth}🔥 / мес ·{' '}
                          {p.modelsAccess === 'full' ? 'все модели' : 'ограничено'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-white font-semibold">
                          {p.priceRub.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Причина <span className="text-zinc-600">(опционально)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: компенсация за ошибку"
              maxLength={200}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Info */}
          <div className="text-[11px] text-zinc-500 leading-relaxed">
            <p className="mb-1">
              ⚠️ Активация заменит текущую подписку (если есть). Токены{' '}
              <span className="text-white font-semibold">не начисляются</span>.
            </p>
            <p>Срок действия: 30 дней с момента активации.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-zinc-800 bg-zinc-950">
          {isCurrentlyActive && (
            <button
              onClick={handleRemove}
              disabled={submitting}
              className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Снять подписку
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleActivate}
            disabled={submitting || !selectedPlan || loadingPlans}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-sm font-semibold text-white hover:from-purple-500 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            Активировать на 30 дней
          </button>
        </div>
      </div>
    </div>
  )
}