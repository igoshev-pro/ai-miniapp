'use client'
import { Plus, Trash2, Flame} from 'lucide-react'
import { PricingSimulator } from '../PricingSimulator'
type Row = {
  conditions: Record<string, any>
  costInTokens: number
  costInDollars?: number
  label?: string
}

export function PricingMatrixEditor({
  value,
  onChange,
  uiParameters,
}: {
  value: Row[]
  onChange: (v: Row[]) => void
  uiParameters: any[]
}) {
  const list = value ?? []

  const add = () => onChange([...list, { conditions: {}, costInTokens: 0, costInDollars: 0, label: '' }])
  const upd = (i: number, p: Partial<Row>) => onChange(list.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const del = (i: number) => onChange(list.filter((_, idx) => idx !== i))

  const updCondKey = (i: number, oldKey: string, newKey: string) => {
    const c = { ...list[i].conditions }
    const v = c[oldKey]
    delete c[oldKey]
    if (newKey) c[newKey] = v
    upd(i, { conditions: c })
  }
  const updCondVal = (i: number, key: string, val: string) =>
    upd(i, { conditions: { ...list[i].conditions, [key]: val } })
  const addCond = (i: number) =>
    upd(i, { conditions: { ...list[i].conditions, '': '' } })
  const delCond = (i: number, key: string) => {
    const c = { ...list[i].conditions }; delete c[key]
    upd(i, { conditions: c })
  }

  return (
    <div className="space-y-5">
      {/* 🆕 Симулятор сверху */}
      <PricingSimulator uiParameters={uiParameters} pricingMatrix={list} />

      <div className="border-t border-zinc-800 pt-5 space-y-5">
        <p className="text-xs text-zinc-500">
          Каждая строка — правило. <b>conditions</b> — какие значения параметров должны совпасть, <b>costInTokens</b> — итоговая цена.
        </p>

        {list.map((row, i) => (
          <div key={i} className="bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                className={`${inp} max-w-xs`}
                placeholder="Метка (Турбо режим)"
                value={row.label ?? ''}
                onChange={(e) => upd(i, { label: e.target.value })}
              />
              <button onClick={() => del(i)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
            </div>

            {/* conditions */}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase mb-1">Условия</div>
              <div className="space-y-2">
                {Object.entries(row.conditions ?? {}).map(([k, v], ki) => (
                  <div key={ki} className="grid grid-cols-12 gap-2">
                    <input className={`${inp} col-span-4`} placeholder="ключ (mode)" defaultValue={k} onBlur={(e) => updCondKey(i, k, e.target.value)}/>
                    <input className={`${inp} col-span-7`} placeholder="значение (turbo)" value={String(v ?? '')} onChange={(e) => updCondVal(i, k, e.target.value)}/>
                    <button onClick={() => delCond(i, k)} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => addCond(i)} className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1">
                  <Plus size={12}/> Условие
                </button>
              </div>
            </div>

            {/* cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase mb-1"><Flame size={13} className="inline-block align-[-2px]" /> Токены</div>
                <input type="number" className={inp} value={row.costInTokens ?? 0} onChange={(e) => upd(i, { costInTokens: Number(e.target.value) })}/>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase mb-1">$ Долларов</div>
                <input type="number" step="0.001" className={inp} value={row.costInDollars ?? 0} onChange={(e) => upd(i, { costInDollars: Number(e.target.value) })}/>
              </div>
            </div>
          </div>
        ))}

        <button onClick={add} className="px-3 py-2 bg-indigo-600/80 hover:bg-indigo-500 rounded text-sm text-white flex items-center gap-2">
          <Plus size={14}/> Добавить правило
        </button>
      </div>
    </div>
  )
}

const inp = 'w-full bg-zinc-900 rounded px-2 py-1.5 text-sm text-white border border-zinc-700 focus:border-indigo-500 outline-none'