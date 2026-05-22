'use client'

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { UIParameter, UIParamOption, UIParamType } from '@/types/admin-model'

interface Props {
  value: UIParameter[]
  onChange: (v: UIParameter[]) => void
}

const PARAM_TYPES: UIParamType[] = ['select', 'number', 'boolean', 'text', 'slider']

export function UIParametersEditor({ value, onChange }: Props) {
  const add = () => {
    onChange([
      ...value,
      {
        key: `param_${value.length + 1}`,
        label: 'Новый параметр',
        type: 'select',
        affectsPrice: false,
        defaultValue: '',
        options: [],
      },
    ])
  }

  const update = (i: number, patch: Partial<UIParameter>) => {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  const remove = (i: number) => {
    if (!confirm('Удалить параметр?')) return
    onChange(value.filter((_, idx) => idx !== i))
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="p-8 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
          Параметров нет. Добавьте первый.
        </div>
      )}

      {value.map((p, i) => (
        <ParameterCard
          key={i}
          param={p}
          onChange={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMoveUp={() => move(i, -1)}
          onMoveDown={() => move(i, 1)}
          isFirst={i === 0}
          isLast={i === value.length - 1}
        />
      ))}

      <button
        onClick={add}
        className="w-full py-3 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-indigo-400 flex items-center justify-center gap-2 transition"
      >
        <Plus size={16} /> Добавить параметр
      </button>
    </div>
  )
}

// ─── Карточка параметра ───────────────────────────────────────

function ParameterCard({
  param, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  param: UIParameter
  onChange: (p: Partial<UIParameter>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [open, setOpen] = useState(true)

  const addOption = () => {
    onChange({
      options: [...(param.options || []), { value: '', label: 'Опция' }],
    })
  }

  const updateOption = (i: number, patch: Partial<UIParamOption>) => {
    onChange({
      options: (param.options || []).map((o, idx) =>
        idx === i ? { ...o, ...patch } : o,
      ),
    })
  }

  const removeOption = (i: number) => {
    onChange({ options: (param.options || []).filter((_, idx) => idx !== i) })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header строки */}
      <div className="flex items-center gap-2 p-3 bg-zinc-800/50">
        <button
          onClick={() => setOpen(!open)}
          className="p-1 text-zinc-400 hover:text-white"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex-1">
          <div className="text-white font-medium">{param.label || '(без названия)'}</div>
          <div className="text-xs text-zinc-500 font-mono">
            {param.key} · {param.type}
            {param.affectsPrice && ' · 💰 влияет на цену'}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-red-900/50 text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Базовые поля */}
          <div className="grid grid-cols-2 gap-3">
            <FieldMini label="Key (внутренний)">
              <input
                value={param.key}
                onChange={(e) => onChange({ key: e.target.value })}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white font-mono text-sm"
              />
            </FieldMini>
            <FieldMini label="Label (видит юзер)">
              <input
                value={param.label}
                onChange={(e) => onChange({ label: e.target.value })}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
              />
            </FieldMini>

            <FieldMini label="Тип">
              <select
                value={param.type}
                onChange={(e) => onChange({ type: e.target.value as UIParamType })}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
              >
                {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldMini>

            <FieldMini label="Default value">
              <input
                value={String(param.defaultValue ?? '')}
                onChange={(e) => onChange({ defaultValue: e.target.value })}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
              />
            </FieldMini>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={param.affectsPrice}
              onChange={(e) => onChange({ affectsPrice: e.target.checked })}
            />
            💰 Влияет на цену (попадёт в pricingMatrix.conditions)
          </label>

          {/* Min/Max/Step для number и slider */}
          {(param.type === 'number' || param.type === 'slider') && (
            <div className="grid grid-cols-3 gap-3">
              <FieldMini label="Min">
                <input
                  type="number"
                  value={param.min ?? ''}
                  onChange={(e) => onChange({ min: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                />
              </FieldMini>
              <FieldMini label="Max">
                <input
                  type="number"
                  value={param.max ?? ''}
                  onChange={(e) => onChange({ max: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                />
              </FieldMini>
              <FieldMini label="Step">
                <input
                  type="number"
                  value={param.step ?? ''}
                  onChange={(e) => onChange({ step: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                />
              </FieldMini>
            </div>
          )}

          {/* Options для select */}
          {param.type === 'select' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase">Опции</div>
              {(param.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="value"
                    value={String(opt.value)}
                    onChange={(e) => updateOption(i, { value: e.target.value })}
                    className="w-32 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-mono"
                  />
                  <input
                    placeholder="label"
                    value={opt.label}
                    onChange={(e) => updateOption(i, { label: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="p-2 rounded hover:bg-red-900/50 text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus size={14} /> Добавить опцию
              </button>
            </div>
          )}

         <FieldMini label="Описание (для подсказки в UI)">
            <input
              value={param.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
            />
          </FieldMini>
        </div>
      )}
    </div>
  )
}

// ─── Маленькое поле-обёртка ───────────────────────────────────

function FieldMini({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      {children}
    </div>
  )
}