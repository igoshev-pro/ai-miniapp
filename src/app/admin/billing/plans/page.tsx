'use client'

import { useEffect, useState } from 'react'
import {
  Crown, Plus, Loader2, Trash2, Edit3, Star, Lock, Unlock,
  Sparkles, X, Zap, Rocket, Diamond, ChevronDown,
} from 'lucide-react'
import { adminBillingApi } from '@/lib/api/admin-billing'
import type {
  AdminSubscriptionPlan,
  FreeModelAccess,
  PlanFeatures,
} from '@/types/admin-billing'

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
  Diamond: <Diamond className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
}

export default function AdminPlansPage() {
  const [items, setItems] = useState<AdminSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminSubscriptionPlan | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminBillingApi.listPlans()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id: string) => {
    const updated = await adminBillingApi.togglePlan(id)
    setItems((prev) => prev.map((p) => (p._id === id ? updated : p)))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тариф?')) return
    await adminBillingApi.deletePlan(id)
    setItems((prev) => prev.filter((p) => p._id !== id))
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Тарифы</h1>
            <p className="text-sm text-zinc-400">
              Всего: <span className="text-white font-semibold">{items.length}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Создать тариф
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-20 text-center text-zinc-500 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Тарифов пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {items.map((p) => (
            <PlanCard
              key={p._id}
              plan={p}
              onEdit={() => setEditing(p)}
              onToggle={() => handleToggle(p._id)}
              onDelete={() => handleDelete(p._id)}
            />
          ))}
        </div>
      )}

      {(editing || creating) && (
        <PlanModal
          plan={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={(saved) => {
            if (editing) {
              setItems((prev) => prev.map((p) => (p._id === saved._id ? saved : p)))
            } else {
              setItems((prev) => [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder))
            }
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function PlanCard({
  plan, onEdit, onToggle, onDelete,
}: {
  plan: AdminSubscriptionPlan
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const icon = ICON_MAP[plan.icon] || <Zap className="w-5 h-5" />
  return (
    <div
      className="relative rounded-2xl border bg-zinc-900/30 p-5 transition-colors group"
      style={{
        borderColor: plan.isActive ? `${plan.color}40` : '#27272a',
      }}
    >
      {plan.isPopular && (
        <div
          className="absolute -top-2 right-4 flex items-center gap-1 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-md"
          style={{ background: plan.color }}
        >
          <Sparkles className="w-2.5 h-2.5" /> Популярный
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `${plan.color}15`,
              color: plan.color,
            }}
          >
            {icon}
          </div>
          <div>
            <div className="text-base font-bold text-white">{plan.name}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-mono">
              {plan.planKey}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            plan.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              plan.isActive ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Price */}
      <div className="mb-3">
        <span className="text-2xl font-extrabold text-white">
          {plan.priceRub.toLocaleString('ru-RU')}
        </span>
        <span className="text-sm text-zinc-500"> ₽/мес</span>
      </div>

      {/* Tokens */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800 mb-3">
        <Sparkles className="w-3.5 h-3.5" style={{ color: plan.color }} />
        <span className="text-sm font-bold text-white">
          {plan.tokensPerMonth.toLocaleString('ru-RU')}
        </span>
        <span className="text-xs text-zinc-500">спичек/мес</span>
        {plan.bonusTokens > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
            +{plan.bonusTokens}
          </span>
        )}
      </div>

      {/* Access */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
        {plan.modelsAccess === 'full' ? (
          <><Unlock className="w-3 h-3 text-emerald-400" /> Полный доступ</>
        ) : (
          <><Lock className="w-3 h-3 text-zinc-500" /> Ограниченное</>
        )}
        <span className="mx-1 text-zinc-700">·</span>
        <span className="text-zinc-500">{plan.freeModels.length} free моделей</span>
      </div>

      {/* Capabilities preview */}
      <div className="space-y-1 mb-4">
        {plan.capabilities.slice(0, 3).map((c, i) => (
          <div key={i} className="text-[11px] text-zinc-500 truncate">• {c}</div>
        ))}
        {plan.capabilities.length > 3 && (
          <div className="text-[11px] text-zinc-600">
            …и ещё {plan.capabilities.length - 3}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium"
        >
          <Edit3 className="w-3 h-3" /> Редактировать
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function PlanModal({
  plan, onClose, onSaved,
}: {
  plan: AdminSubscriptionPlan | null
  onClose: () => void
  onSaved: (p: AdminSubscriptionPlan) => void
}) {
  const isEdit = !!plan
  const [form, setForm] = useState<Partial<AdminSubscriptionPlan>>(
    plan || {
      planKey: '',
      name: '',
      description: '',
      priceRub: 0,
      tokensPerMonth: 0,
      bonusTokens: 0,
      modelsAccess: 'limited',
      freeModels: [],
      capabilities: [],
      color: '#60a5fa',
      icon: 'Zap',
      isPopular: false,
      isActive: true,
      sortOrder: 0,
      features: {
        maxDailyGenerations: 50,
        priorityQueue: false,
        exclusiveModels: false,
        noWatermark: false,
        maxContextMessages: 20,
      },
    },
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'main' | 'features' | 'models' | 'caps'>('main')

  const update = (patch: Partial<AdminSubscriptionPlan>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const updateFeatures = (patch: Partial<PlanFeatures>) =>
    setForm((prev) => ({
      ...prev,
      features: { ...(prev.features as PlanFeatures), ...patch },
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const saved = isEdit
        ? await adminBillingApi.updatePlan(plan!._id, form)
        : await adminBillingApi.createPlan(form)
      onSaved(saved)
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // Free models helpers
  const addFreeModel = () => {
    update({
      freeModels: [
        ...(form.freeModels || []),
        { modelSlug: '', displayName: '', hourlyLimit: 10, dailyLimit: 60 },
      ],
    })
  }
  const updateFreeModel = (i: number, patch: Partial<FreeModelAccess>) => {
    const next = [...(form.freeModels || [])]
    next[i] = { ...next[i], ...patch }
    update({ freeModels: next })
  }
  const removeFreeModel = (i: number) => {
    update({ freeModels: (form.freeModels || []).filter((_, idx) => idx !== i) })
  }

  // Capabilities helpers
  const addCap = () => update({ capabilities: [...(form.capabilities || []), ''] })
  const updateCap = (i: number, v: string) => {
    const next = [...(form.capabilities || [])]
    next[i] = v
    update({ capabilities: next })
  }
  const removeCap = (i: number) => {
    update({ capabilities: (form.capabilities || []).filter((_, idx) => idx !== i) })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? `Редактировать: ${plan!.name}` : 'Новый тариф'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-5">
          {([
            ['main', 'Основное'],
            ['features', 'Возможности'],
            ['models', `Free-модели (${form.freeModels?.length || 0})`],
            ['caps', `Описание (${form.capabilities?.length || 0})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'main' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ключ (planKey)">
                  <input
                    type="text"
                    value={form.planKey || ''}
                    onChange={(e) => update({ planKey: e.target.value.toLowerCase() })}
                    disabled={isEdit}
                    placeholder="basic / plus / max"
                    required
                    className="input"
                  />
                </Field>
                <Field label="Название">
                  <input
                    type="text"
                    value={form.name || ''}
                    onChange={(e) => update({ name: e.target.value })}
                    required
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Описание">
                <input
                  type="text"
                  value={form.description || ''}
                  onChange={(e) => update({ description: e.target.value })}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Цена ₽/мес">
                  <input
                    type="number"
                    min={0}
                    value={form.priceRub || 0}
                    onChange={(e) => update({ priceRub: +e.target.value })}
                    required
                    className="input"
                  />
                </Field>
                <Field label="Токенов/мес">
                  <input
                    type="number"
                    min={0}
                    value={form.tokensPerMonth || 0}
                    onChange={(e) => update({ tokensPerMonth: +e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Бонус токенов">
                  <input
                    type="number"
                    min={0}
                    value={form.bonusTokens || 0}
                    onChange={(e) => update({ bonusTokens: +e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Доступ к моделям">
                  <select
                    value={form.modelsAccess || 'limited'}
                    onChange={(e) => update({ modelsAccess: e.target.value as any })}
                    className="input"
                  >
                    <option value="limited">Ограниченный</option>
                    <option value="full">Полный</option>
                  </select>
                </Field>
                <Field label="Иконка">
                  <select
                    value={form.icon || 'Zap'}
                    onChange={(e) => update({ icon: e.target.value })}
                    className="input"
                  >
                    {Object.keys(ICON_MAP).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Цвет">
                  <input
                    type="color"
                    value={form.color || '#60a5fa'}
                    onChange={(e) => update({ color: e.target.value })}
                    className="input h-[38px] p-1"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Порядок сортировки">
                  <input
                    type="number"
                    value={form.sortOrder || 0}
                    onChange={(e) => update({ sortOrder: +e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="flex items-end gap-4 pb-2">
                  <Checkbox
                    label="🔥 Популярный"
                    checked={!!form.isPopular}
                    onChange={(v) => update({ isPopular: v })}
                  />
                  <Checkbox
                    label="Активен"
                    checked={!!form.isActive}
                    onChange={(v) => update({ isActive: v })}
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'features' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Макс. генераций/день">
                <input
                  type="number"
                  min={0}
                  value={form.features?.maxDailyGenerations || 0}
                  onChange={(e) => updateFeatures({ maxDailyGenerations: +e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Макс. контекст (сообщ.)">
                <input
                  type="number"
                  min={0}
                  value={form.features?.maxContextMessages || 0}
                  onChange={(e) => updateFeatures({ maxContextMessages: +e.target.value })}
                  className="input"
                />
              </Field>
              <div className="col-span-2 flex flex-col gap-2 pt-2">
                <Checkbox
                  label="⚡ Приоритетная очередь"
                  checked={!!form.features?.priorityQueue}
                  onChange={(v) => updateFeatures({ priorityQueue: v })}
                />
                <Checkbox
                  label="💎 Эксклюзивные модели"
                  checked={!!form.features?.exclusiveModels}
                  onChange={(v) => updateFeatures({ exclusiveModels: v })}
                />
                <Checkbox
                  label="🚫 Без вотермарок"
                  checked={!!form.features?.noWatermark}
                  onChange={(v) => updateFeatures({ noWatermark: v })}
                />
              </div>
            </div>
          )}

          {tab === 'models' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 mb-2">
                Бесплатный доступ к моделям. Оставь лимиты пустыми для «безлимит».
              </div>
              {(form.freeModels || []).map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_90px_90px_32px] gap-2 items-center p-2 rounded-lg bg-zinc-900/40 border border-zinc-800"
                >
                  <input
                    type="text"
                    placeholder="model-slug"
                    value={m.modelSlug}
                    onChange={(e) => updateFreeModel(i, { modelSlug: e.target.value })}
                    className="input text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Отображаемое имя"
                    value={m.displayName}
                    onChange={(e) => updateFreeModel(i, { displayName: e.target.value })}
                    className="input text-xs"
                  />
                  <input
                    type="number"
                    placeholder="/час"
                    value={m.hourlyLimit ?? ''}
                    onChange={(e) =>
                      updateFreeModel(i, {
                        hourlyLimit: e.target.value === '' ? null : +e.target.value,
                      })
                    }
                    className="input text-xs"
                  />
                  <input
                    type="number"
                    placeholder="/сутки"
                    value={m.dailyLimit ?? ''}
                    onChange={(e) =>
                      updateFreeModel(i, {
                        dailyLimit: e.target.value === '' ? null : +e.target.value,
                      })
                    }
                    className="input text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeFreeModel(i)}
                    className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFreeModel}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600"
              >
                <Plus className="w-4 h-4" /> Добавить модель
              </button>
            </div>
          )}

          {tab === 'caps' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 mb-2">
                Список преимуществ, который видит пользователь на карточке тарифа.
              </div>
              {(form.capabilities || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateCap(i, e.target.value)}
                    placeholder="Например: Генерация 100 изображений"
                    className="input flex-1"
                  />
                                   <button
                    type="button"
                    onClick={() => removeCap(i)}
                    className="p-2 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCap}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600"
              >
                <Plus className="w-4 h-4" /> Добавить пункт
              </button>
            </div>
          )}

          {err && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.15s;
          }
          .input:focus { border-color: rgba(245, 158, 11, 0.5); }
          .input:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Checkbox({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-amber-500"
      />
      {label}
    </label>
  )
}