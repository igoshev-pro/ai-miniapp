'use client'

import { useState } from 'react'
import { Pencil, Trash2, X, Star, Eye, Globe, Wrench, Flame} from 'lucide-react'
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
            <th
              className="px-4 py-3 text-right"
              title="Минимальная стоимость списания за запрос, в спичках"
            >
              Мин. <Flame size={13} className="inline-block align-[-2px]" />
            </th>
            <th
              className="px-4 py-3 text-right"
              title="Цена для клиента за 1M входных токенов, в спичках"
            >
              <Flame size={13} className="inline-block align-[-2px]" /> / 1M In
            </th>
            <th
              className="px-4 py-3 text-right"
              title="Цена для клиента за 1M выходных токенов, в спичках"
            >
              <Flame size={13} className="inline-block align-[-2px]" /> / 1M Out
            </th>
            <th
              className="px-4 py-3 text-right"
              title="Себестоимость у провайдера за 1M токенов (input / output), в долларах"
            >
              $ провайдер (In/Out)
            </th>
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
  // Минимальная цена для отображения «от X 🔥»
  const minCost =
    m.preview?.minCostInTokens ??
    m.minTokenCost ??
    m.tokenCost ??
    0

  // 🔥 Цена за 1M токенов В СПИЧКАХ (именно по этим полям идёт списание)
  const priceInSpichkiInput =
    (m as any).pricePerMillionInputTokens ??
    m.costPerMillionInputTokens ?? // fallback на legacy если новое не задано
    0

  const priceInSpichkiOutput =
    (m as any).pricePerMillionOutputTokens ??
    m.costPerMillionOutputTokens ??
    0

  // $ Себестоимость провайдера (для контроля маржи)
  const providerCostInput = (m as any).providerCostPerMillionInput ?? 0
  const providerCostOutput = (m as any).providerCostPerMillionOutput ?? 0

  const [editingCost, setEditingCost] = useState(false)
  const [costValue, setCostValue] = useState(String(minCost))

  const commitCost = () => {
    const num = Number(costValue)
    setEditingCost(false)
    if (!Number.isFinite(num) || num < 0) {
      setCostValue(String(minCost))
      return
    }
    if (num !== minCost) onInlineTokenCost(num)
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
        <div className="flex gap-1 justify-center text-xs flex-wrap">
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
          {(m.capabilities?.includes('web_search') ||
            m.capabilities?.includes('web') ||
            m.supportsWebSearch) && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400" title="Интернет">
              <Globe size={12} className="inline" />
            </span>
          )}
          {m.capabilities?.includes('function_calling') && (
            <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400" title="Function calling">
              <Wrench size={12} className="inline" />
            </span>
          )}
        </div>
      </td>

      {/* Inline цена (min, в спичках) */}
      <td className="px-4 py-3 text-right">
        {editingCost ? (
          <input
            autoFocus
            type="number"
            min={0}
            step="0.01"
            value={costValue}
            onChange={(e) => setCostValue(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCost()
              if (e.key === 'Escape') {
                setCostValue(String(minCost))
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
            title={`avg: ${m.preview?.avgCostInTokens ?? '—'} · max: ${m.preview?.maxCostInTokens ?? '—'} спичек`}
          >
            от {minCost} <Flame size={13} className="inline-block align-[-2px]" />
          </button>
        )}
      </td>

      {/* <Flame size={13} className="inline-block align-[-2px]" /> / 1M Input (цена для клиента в спичках) */}
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {priceInSpichkiInput.toFixed(2)} <Flame size={13} className="inline-block align-[-2px]" />
      </td>

      {/* <Flame size={13} className="inline-block align-[-2px]" /> / 1M Output (цена для клиента в спичках) */}
      <td className="px-4 py-3 text-right text-white tabular-nums">
        {priceInSpichkiOutput.toFixed(2)} <Flame size={13} className="inline-block align-[-2px]" />
      </td>

      {/* $ провайдер — себестоимость, для контроля маржи */}
      <td className="px-4 py-3 text-right text-zinc-500 tabular-nums text-xs">
        {providerCostInput > 0 || providerCostOutput > 0 ? (
          <>
            ${providerCostInput.toFixed(2)} / ${providerCostOutput.toFixed(2)}
          </>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
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