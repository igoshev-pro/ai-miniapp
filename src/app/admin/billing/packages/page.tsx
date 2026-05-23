'use client'

import { useEffect, useState } from 'react'
import {
  Package, Plus, Loader2, Trash2, Edit3, Flame, Star, Trophy, X,
} from 'lucide-react'
import { adminBillingApi } from '@/lib/api/admin-billing'
import type { AdminTokenPackage } from '@/types/admin-billing'

export default function AdminPackagesPage() {
  const [items, setItems] = useState<AdminTokenPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminTokenPackage | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminBillingApi.listPackages()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id: string) => {
    const updated = await adminBillingApi.togglePackage(id)
    setItems((prev) => prev.map((p) => (p._id === id ? updated : p)))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пакет?')) return
    await adminBillingApi.deletePackage(id)
    setItems((prev) => prev.filter((p) => p._id !== id))
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <Package className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Пакеты спичек</h1>
            <p className="text-sm text-zinc-400">
              Всего: <span className="text-white font-semibold">{items.length}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Создать пакет
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="p-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-20 text-center text-zinc-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Пакетов пока нет</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium text-right">Спички 🔥</th>
                <th className="px-4 py-3 font-medium text-right">Цена ₽</th>
                <th className="px-4 py-3 font-medium text-right">₽/🔥</th>
                <th className="px-4 py-3 font-medium text-right">Бонус %</th>
                <th className="px-4 py-3 font-medium">Бейджи</th>
                <th className="px-4 py-3 font-medium">Активен</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((p) => (
                <tr key={p._id} className="hover:bg-zinc-900/60 transition-colors group">
                  <td className="px-4 py-3 text-xs text-zinc-500">{p.sortOrder}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{p.packageId}</td>
                  <td className="px-4 py-3 text-sm text-white">{p.label}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-orange-400">
                    {p.tokens.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-white">
                    {p.priceRub.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {(p.priceRub / p.tokens).toFixed(2)} ₽
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-400">
                    {p.bonusPercent > 0 ? `+${p.bonusPercent}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                          <Star className="w-3 h-3" /> Хит
                        </span>
                      )}
                      {p.best && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <Trophy className="w-3 h-3" /> Лучший
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(p._id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        p.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          p.isActive ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(editing || creating) && (
        <PackageModal
          pkg={editing}
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
function PackageModal({
  pkg, onClose, onSaved,
}: {
  pkg: AdminTokenPackage | null
  onClose: () => void
  onSaved: (p: AdminTokenPackage) => void
}) {
  const isEdit = !!pkg
  const [form, setForm] = useState<Partial<AdminTokenPackage>>(
    pkg || {
      packageId: '',
      label: '',
      tokens: 100,
      priceRub: 99,
      bonusPercent: 0,
      popular: false,
      best: false,
      isActive: true,
      sortOrder: 0,
    },
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const saved = isEdit
        ? await adminBillingApi.updatePackage(pkg._id, form)
        : await adminBillingApi.createPackage(form)
      onSaved(saved)
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? 'Редактировать пакет' : 'Новый пакет'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="ID пакета (packageId)">
            <input
              type="text"
              value={form.packageId || ''}
              onChange={(e) => setForm({ ...form, packageId: e.target.value })}
              disabled={isEdit}
              placeholder="pack_300"
              required
              className="input"
            />
          </Field>

          <Field label="Название">
            <input
              type="text"
              value={form.label || ''}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Спичек 🔥">
              <input
                type="number"
                min={1}
                value={form.tokens || 0}
                onChange={(e) => setForm({ ...form, tokens: +e.target.value })}
                required
                className="input"
              />
            </Field>
            <Field label="Цена ₽">
              <input
                type="number"
                min={0}
                value={form.priceRub || 0}
                onChange={(e) => setForm({ ...form, priceRub: +e.target.value })}
                required
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Бонус %">
              <input
                type="number"
                min={0}
                value={form.bonusPercent || 0}
                onChange={(e) => setForm({ ...form, bonusPercent: +e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Порядок сортировки">
              <input
                type="number"
                value={form.sortOrder || 0}
                onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Checkbox
              label="🔥 Популярный"
              checked={!!form.popular}
              onChange={(v) => setForm({ ...form, popular: v })}
            />
            <Checkbox
              label="🏆 Лучшая цена"
              checked={!!form.best}
              onChange={(v) => setForm({ ...form, best: v })}
            />
            <Checkbox
              label="Активен"
              checked={!!form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>

          {err && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {err}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
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
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.625rem 0.75rem;
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 0.625rem;
            color: white;
            font-size: 0.875rem;
            outline: none;
          }
          .input:focus { border-color: rgba(249, 115, 22, 0.5); }
          .input:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </form>
    </div>
  )
}

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
        className="w-4 h-4 rounded accent-orange-500"
      />
      {label}
    </label>
  )
}