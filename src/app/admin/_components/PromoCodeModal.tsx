'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, X, Ticket, Sparkles, Percent, Banknote, CalendarRange } from 'lucide-react'
import {
  PromoCodeType,
  PromoApplyTo,
  type AdminPromoCode,
  type AdminPromoUpsert,
} from '@/types/admin-promo'

interface Props {
  promo?: AdminPromoCode | null // если передан — режим edit
  onClose: () => void
  onConfirm: (body: AdminPromoUpsert) => Promise<void>
}

const TYPE_OPTIONS: Array<{
  value: PromoCodeType
  label: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    value: PromoCodeType.BONUS_TOKENS,
    label: 'Бонус-токены',
    desc: 'Начислить N токенов после оплаты',
    icon: Sparkles,
  },
  {
    value: PromoCodeType.DISCOUNT_PERCENT,
    label: 'Скидка %',
    desc: 'Процент от суммы покупки',
    icon: Percent,
  },
  {
    value: PromoCodeType.DISCOUNT_RUB,
    label: 'Скидка ₽',
    desc: 'Фиксированная сумма в рублях',
    icon: Banknote,
  },
  {
    value: PromoCodeType.SUBSCRIPTION_DAYS,
    label: 'Дни подписки',
    desc: 'Бесплатные дни подписки',
    icon: CalendarRange,
  },
]

const APPLY_TO_OPTIONS: Array<{ value: PromoApplyTo; label: string }> = [
  { value: PromoApplyTo.ANY, label: 'Любая покупка' },
  { value: PromoApplyTo.SUBSCRIPTION, label: 'Только подписки' },
  { value: PromoApplyTo.TOKEN_PACKAGE, label: 'Только пакеты токенов' },
  { value: PromoApplyTo.STANDALONE, label: 'Без покупки (standalone)' },
]

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PromoCodeModal({ promo, onClose, onConfirm }: Props) {
  const isEdit = !!promo

  const [code, setCode] = useState(promo?.code || '')
  const [description, setDescription] = useState(promo?.description || '')
    const [type, setType] = useState<PromoCodeType>(
    promo?.type || PromoCodeType.BONUS_TOKENS,
  )
  const [applyTo, setApplyTo] = useState<PromoApplyTo>(
    promo?.applyTo || PromoApplyTo.ANY,
  )

  // Value fields (зависят от type)
  const [bonusTokens, setBonusTokens] = useState<string>(
    promo?.bonusTokens ? String(promo.bonusTokens) : '',
  )
  const [discountPercent, setDiscountPercent] = useState<string>(
    promo?.discountPercent ? String(promo.discountPercent) : '',
  )
  const [discountRub, setDiscountRub] = useState<string>(
    promo?.discountRub ? String(promo.discountRub) : '',
  )
  const [subscriptionDays, setSubscriptionDays] = useState<string>(
    promo?.subscriptionDays ? String(promo.subscriptionDays) : '',
  )
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(
    promo?.subscriptionPlan || '',
  )

  // Constraints
  const [minPurchaseRub, setMinPurchaseRub] = useState<string>(
    promo?.minPurchaseRub ? String(promo.minPurchaseRub) : '',
  )
  const [applicablePlansStr, setApplicablePlansStr] = useState<string>(
    (promo?.applicablePlans || []).join(', '),
  )
  const [applicablePackagesStr, setApplicablePackagesStr] = useState<string>(
    (promo?.applicablePackages || []).join(', '),
  )

  // Limits
  const [maxUsesStr, setMaxUsesStr] = useState<string>(
    promo?.maxUses != null ? String(promo.maxUses) : '',
  )
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<string>(
    promo?.maxUsesPerUser ? String(promo.maxUsesPerUser) : '1',
  )

  // Dates
  const [startsAt, setStartsAt] = useState<string>(toInputDate(promo?.startsAt))
  const [expiresAt, setExpiresAt] = useState<string>(toInputDate(promo?.expiresAt))

  // Misc
  const [isActive, setIsActive] = useState<boolean>(promo?.isActive ?? true)
  const [internalNote, setInternalNote] = useState<string>(promo?.internalNote || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sanitize code: только A-Z, 0-9, _, -
  useEffect(() => {
    setCode((c) => c.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
  }, []) // только при маунте

  const onCodeChange = (v: string) => {
    setCode(v.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32))
  }

  // Валидация конкретного value по типу
  const valueError = useMemo<string | null>(() => {
    if (type === PromoCodeType.BONUS_TOKENS) {
      const v = Number(bonusTokens)
      if (!v || v <= 0) return 'Укажи количество бонус-токенов'
    } else if (type === PromoCodeType.DISCOUNT_PERCENT) {
      const v = Number(discountPercent)
      if (!v || v <= 0 || v > 100) return 'Процент должен быть 1–100'
    } else if (type === PromoCodeType.DISCOUNT_RUB) {
      const v = Number(discountRub)
      if (!v || v <= 0) return 'Укажи сумму скидки в ₽'
    } else if (type === PromoCodeType.SUBSCRIPTION_DAYS) {
      const v = Number(subscriptionDays)
      if (!v || v <= 0) return 'Укажи количество дней'
      if (!subscriptionPlan.trim()) return 'Укажи planKey подписки'
    }
    return null
  }, [type, bonusTokens, discountPercent, discountRub, subscriptionDays, subscriptionPlan])

  const dateError = useMemo<string | null>(() => {
    if (startsAt && expiresAt) {
      if (new Date(startsAt) >= new Date(expiresAt)) {
        return 'Дата начала должна быть раньше даты окончания'
      }
    }
    return null
  }, [startsAt, expiresAt])

  const codeError = useMemo<string | null>(() => {
    if (isEdit) return null
    if (!code) return 'Введи код'
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return 'Код: 3–32 символа, A-Z 0-9 _ -'
    return null
  }, [code, isEdit])

  const canSubmit =
    !loading &&
    description.trim().length >= 3 &&
    !valueError &&
    !dateError &&
    !codeError

  const handle = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const body: AdminPromoUpsert = {
        description: description.trim(),
        type,
        applyTo,
        bonusTokens:
          type === PromoCodeType.BONUS_TOKENS ? Number(bonusTokens) || 0 : 0,
        discountPercent:
          type === PromoCodeType.DISCOUNT_PERCENT ? Number(discountPercent) || 0 : 0,
        discountRub:
          type === PromoCodeType.DISCOUNT_RUB ? Number(discountRub) || 0 : 0,
        subscriptionDays:
          type === PromoCodeType.SUBSCRIPTION_DAYS ? Number(subscriptionDays) || 0 : 0,
        subscriptionPlan:
          type === PromoCodeType.SUBSCRIPTION_DAYS
            ? subscriptionPlan.trim() || null
            : null,
        minPurchaseRub: Number(minPurchaseRub) || 0,
        applicablePlans: applicablePlansStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        applicablePackages: applicablePackagesStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        maxUses: maxUsesStr.trim() === '' ? null : Number(maxUsesStr),
        maxUsesPerUser: Math.max(1, Number(maxUsesPerUser) || 1),
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
        internalNote: internalNote.trim() || null,
      }

      if (!isEdit) {
        body.code = code
      }

      await onConfirm(body)
      onClose()
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          'Не удалось сохранить промокод',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-8 rounded-2xl border border-pink-500/30 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30">
            <Ticket className="w-5 h-5 text-pink-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">
              {isEdit ? 'Редактировать промокод' : 'Новый промокод'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEdit
                ? `Код: ${promo?.code} (нельзя изменить)`
                : 'Заполни параметры и сохрани'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Code + isActive */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1.5">
                Код {!isEdit && <span className="text-red-400">*</span>}
              </label>
              <input
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={isEdit}
                placeholder="WELCOME2025"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white font-mono uppercase placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50 disabled:opacity-60"
              />
              {codeError && (
                <div className="mt-1 text-[11px] text-red-400">{codeError}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Статус</label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                {isActive ? 'Активен' : 'Выключен'}
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Описание <span className="text-red-400">*</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Новогодняя акция 2025"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Тип промокода</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-pink-500/15 border-pink-500/50 text-pink-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">{opt.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Value fields */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            {type === PromoCodeType.BONUS_TOKENS && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Бонус-токены 🔥 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={bonusTokens}
                  onChange={(e) =>
                    setBonusTokens(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="500"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
                />
              </div>
            )}

            {type === PromoCodeType.DISCOUNT_PERCENT && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Процент скидки (1–100) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="20"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
                />
              </div>
            )}

            {type === PromoCodeType.DISCOUNT_RUB && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Скидка в ₽ <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={discountRub}
                  onChange={(e) =>
                    setDiscountRub(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="300"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
                />
              </div>
            )}

            {type === PromoCodeType.SUBSCRIPTION_DAYS && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Дней подписки <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={subscriptionDays}
                    onChange={(e) =>
                      setSubscriptionDays(e.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="30"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    planKey <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={subscriptionPlan}
                    onChange={(e) => setSubscriptionPlan(e.target.value.trim())}
                    placeholder="plus"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>
            )}

            {valueError && (
              <div className="text-[11px] text-red-400">{valueError}</div>
            )}
          </div>

          {/* Apply to */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              К чему применять
            </label>
            <select
              value={applyTo}
              onChange={(e) => setApplyTo(e.target.value as PromoApplyTo)}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
            >
              {APPLY_TO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1.5">
                Мин. сумма покупки, ₽
              </label>
              <input
                type="number"
                min="0"
                value={minPurchaseRub}
                onChange={(e) =>
                  setMinPurchaseRub(e.target.value.replace(/[^\d]/g, ''))
                }
                placeholder="0 (без ограничения)"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Применимые planKey (через запятую)
              </label>
              <input
                value={applicablePlansStr}
                onChange={(e) => setApplicablePlansStr(e.target.value)}
                placeholder="plus, max"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Применимые packageId
              </label>
              <input
                value={applicablePackagesStr}
                onChange={(e) => setApplicablePackagesStr(e.target.value)}
                placeholder="pack_500, pack_1000"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Макс. использований (пусто = ∞)
              </label>
              <input
                type="number"
                min="1"
                value={maxUsesStr}
                onChange={(e) =>
                  setMaxUsesStr(e.target.value.replace(/[^\d]/g, ''))
                }
                placeholder="∞"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Использований на юзера
              </label>
              <input
                type="number"
                min="1"
                value={maxUsesPerUser}
                onChange={(e) =>
                  setMaxUsesPerUser(e.target.value.replace(/[^\d]/g, ''))
                }
                placeholder="1"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Действует с
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Действует до
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
              />
            </div>
            {dateError && (
              <div className="col-span-2 text-[11px] text-red-400">{dateError}</div>
            )}
          </div>

          {/* Internal note */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Внутренняя заметка (видна только админам)
            </label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              placeholder="Для рекламной кампании Telegram Ads"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-pink-500/50 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-sm font-semibold text-white hover:from-pink-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : isEdit ? (
              'Сохранить'
            ) : (
              'Создать промокод'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}