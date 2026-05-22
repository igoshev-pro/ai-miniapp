'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X, Star, Eye } from 'lucide-react'
import type { AdminModel } from '@/types/admin-model'

interface Props {
  items: AdminModel[]
  loading: boolean
  busy: boolean
  onEdit: (m: AdminModel) => void
  onToggle: (slug: string) => void
  onInlineTokenCost: (slug: string, value: number) => void
  onDelete: (slug: string, hard: boolean) => void
}

export function ModelsTable({
  items, loading, busy, onEdit, onToggle, onInlineTokenCost, onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
        Загрузка...
      </div>
    )
  }
  if (!items.length) {
    return (
      <div className="p-12 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
        Моделей не найдено
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Модель</th>
            <th className="px-4 py-3 text-left">Тип</th>
            <th className="px-4 py-3 text-center">Флаги</th>
            <th className="px-4 py-3 text-right">TokenCost</th>
            <th className="px-4 py-3 text-right">$ / 1M In</th>
            <th className="px-4 py-3 text-right">$ / 1M Out</th>
            <th className="px-4 py-3 text-center">Order</th>
            <th className="px-4 py-3 text-center">Active</th>
            <th className="px-4 py-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map(m => (
            <Row
              key={m._id}
              model={m}
              busy={busy}
              onEdit={() => onEdit(m)}
              onToggle={() => onToggle(m.slug)}
              onInlineTokenCost={(v) => onInlineTokenCost(m.slug, v)}
              onDelete={(hard) => onDelete(m.slug, hard)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────

function Row({
  model: m, busy, onEdit, onToggle, onInlineTokenCost, onDelete,
}: {
  model: AdminModel
  busy: boolean
  onEdit: () => void
  onToggle: () => void
  onInlineTokenCost: (v: number) => void
  onDelete: (hard: boolean) => void
}) {
  const [editingCost, setEditingCost] = useState(false)
  const [costValue, setCostValue] = useState(String(m.tokenCost ?? 0))

  const commitCost = () => {
    const num = Number(costValue)
    setEditingCost(false)
    if (!Number.isFinite(num) || num < 0) {
      setCostValue(String(m.tokenCost ?? 0))
      return
    }
    if (num !== (m.tokenCost ?? 0)) onInlineTokenCost(num)
  }

  return (
    <tr className="border-t border-zinc-800 hover:bg-zinc-800/30">
      {/* Модель */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {m.icon ? (
            <img src={m.icon} alt="" className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-xs">
              {m.displayName?.[0] || '?'}
            </div>
          )}
          <div>
            <div className="text-white font-medium">{m.displayName}</div>
            <div className="text-xs text-zinc-500">{m.slug}</div>
          </div>
        </div>
      </td>

      {/* Тип */}
      <td className="px-4 py-3">
        <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
          {m.type}
        </span>
      </td>

      {/* Флаги */}
      <td className="px-4 py-3 text-center">
        <div className="flex gap-1 justify-center text-xs">
          {m.isPremium && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400" title="Premium">
              <Star size={12} className="inline" />
            </span>
          )}
          {m.supportsVision && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400" title="Vision">
              <Eye size={12} className="inline" />
            </span>
          )}
        </div>
      </td>

      {/* Inline tokenCost */}
      <td className="px-4 py-3 text-right">
        {editingCost ? (
          <input
            autoFocus
            type="number"
            min={0}
            value={costValue}
            onChange={(e) => setCostValue(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCost()
              if (e.key === 'Escape') {
                setCostValue(String(m.tokenCost ?? 0))
                setEditingCost(false)
              }
            }}
            className="w-20 px-2 py-1 bg-zinc-800 border border-indigo-500 rounded text-right text-white"
          />
        ) : (
          <button
            onClick={() => setEditingCost(true)}
            className="text-white hover:text-indigo-400 hover:underline tabular-nums"
            disabled={busy}
          >
            {m.tokenCost ?? '—'}
          </button>
        )}
      </td>

      {/* Стоимости */}
      <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
        ${m.costPerMillionInputTokens?.toFixed(2) ?? '0.00'}
      </td>
      <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
        ${m.costPerMillionOutputTokens?.toFixed(2) ?? '0.00'}
      </td>

      {/* Order */}
      <td className="px-4 py-3 text-center text-zinc-400 tabular-nums">
        {m.sortOrder}
      </td>

      {/* Toggle isActive */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={onToggle}
          disabled={busy}
          className={`relative w-10 h-6 rounded-full transition ${
            m.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              m.isActive ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end">
          <button
            onClick={onEdit}
            disabled={busy}
            className="p-2 rounded hover:bg-zinc-700 text-zinc-300"
            title="Редактировать"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Деактивировать модель "${m.displayName}"?`)) onDelete(false)
            }}
            disabled={busy}
            className="p-2 rounded hover:bg-zinc-700 text-zinc-300"
            title="Soft delete (isActive = false)"
          >
            <X size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm(`УДАЛИТЬ НАВСЕГДА модель "${m.displayName}"?\nЭто действие нельзя отменить.`)) {
                onDelete(true)
              }
            }}
            disabled={busy}
            className="p-2 rounded hover:bg-red-900/50 text-red-400"
            title="Hard delete (из БД)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}