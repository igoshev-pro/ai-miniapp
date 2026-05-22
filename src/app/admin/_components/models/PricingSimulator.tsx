'use client'
import { useMemo, useState, useEffect } from 'react'
import { Zap, DollarSign, Target } from 'lucide-react'

type Option = { value: string; label: string }
type UiParam = {
  key: string
  label: string
  type: 'select' | 'number' | 'text' | 'toggle'
  options?: Option[]
  defaultValue?: any
}
type Row = {
  conditions: Record<string, any>
  costInTokens: number
  costInDollars?: number
  label?: string
}

export function PricingSimulator({
  uiParameters,
  pricingMatrix,
}: {
  uiParameters: UiParam[]
  pricingMatrix: Row[]
}) {
  const params = uiParameters ?? []
  const matrix = pricingMatrix ?? []

  const [values, setValues] = useState<Record<string, any>>({})

  // init defaults
  useEffect(() => {
    const init: Record<string, any> = {}
    params.forEach((p) => {
      init[p.key] = p.defaultValue ?? p.options?.[0]?.value ?? ''
    })
    setValues(init)
  }, [JSON.stringify(params)])

  // match
  const matched = useMemo(() => {
    const hits = matrix
      .map((row, idx) => {
        const conds = Object.entries(row.conditions ?? {})
        if (conds.length === 0) return { row, idx, score: 0, ok: true }
        const ok = conds.every(([k, v]) => String(values[k] ?? '') === String(v ?? ''))
        return { row, idx, score: conds.length, ok }
      })
      .filter((x) => x.ok)
      .sort((a, b) => b.score - a.score)
    return hits[0] ?? null
  }, [matrix, values])

  if (params.length === 0) {
    return (
      <div className="text-sm text-zinc-500 p-4 bg-zinc-800/30 rounded border border-zinc-700/40">
        Сначала добавьте UI параметры — потом тут можно будет симулировать.
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900/40 border border-indigo-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-indigo-300">
        <Target size={16} />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Симулятор цены</h3>
      </div>

      {/* params */}
      <div className="grid grid-cols-2 gap-3">
        {params.map((p) => (
          <div key={p.key}>
            <label className="text-[10px] text-zinc-500 uppercase block mb-1">{p.label || p.key}</label>
            {p.type === 'select' ? (
              <select
                className={inp}
                value={values[p.key] ?? ''}
                onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.value }))}
              >
                {(p.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label || o.value}</option>
                ))}
              </select>
            ) : p.type === 'toggle' ? (
              <input
                type="checkbox"
                checked={!!values[p.key]}
                onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.checked }))}
                className="scale-125 mt-1"
              />
            ) : p.type === 'number' ? (
              <input
                type="number"
                className={inp}
                value={values[p.key] ?? 0}
                onChange={(e) => setValues((s) => ({ ...s, [p.key]: Number(e.target.value) }))}
              />
            ) : (
              <input
                className={inp}
                value={values[p.key] ?? ''}
                onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* result */}
      <div className="border-t border-indigo-500/20 pt-4">
        {matched ? (
          <div className="space-y-2">
            <div className="text-xs text-zinc-400">
              Сработало правило: <span className="text-indigo-300 font-mono">#{matched.idx + 1} {matched.row.label && `· ${matched.row.label}`}</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                <Zap className="text-amber-400" size={20} />
                <div>
                  <div className="text-[10px] uppercase text-amber-300/70">Спишется с юзера</div>
                  <div className="text-xl font-bold text-amber-200">{matched.row.costInTokens} 🔥</div>
                </div>
              </div>
              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                <DollarSign className="text-emerald-400" size={20} />
                <div>
                  <div className="text-[10px] uppercase text-emerald-300/70">Себестоимость</div>
                  <div className="text-xl font-bold text-emerald-200">${matched.row.costInDollars ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
            ⚠️ Ни одно правило не подошло под текущие параметры — нужно добавить fallback (правило без условий).
          </div>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full bg-zinc-900 rounded px-2 py-1.5 text-sm text-white border border-zinc-700 focus:border-indigo-500 outline-none'