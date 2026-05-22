'use client'
import { Plus, Trash2 } from 'lucide-react'

export function PricingMatrixEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const add = () => onChange([...(value ?? []), { match: {}, cost: 0 }])
  const upd = (i: number, p: any) => onChange(value.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const del = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Каждая строка = условие → стоимость в токенах. match — JSON, например {`{"resolution":"1080p","duration":10}`}</p>
      {(value ?? []).map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 bg-zinc-800/40 rounded p-3">
          <textarea
            className="col-span-8 bg-zinc-900 rounded px-2 py-1 text-xs font-mono text-white"
            rows={2}
            value={JSON.stringify(row.match ?? {}, null, 0)}
            onChange={(e) => { try { upd(i, { match: JSON.parse(e.target.value) }) } catch {} }}
          />
          <input
            type="number"
            className="col-span-3 bg-zinc-900 rounded px-2 py-1 text-sm text-white"
            placeholder="cost"
            value={row.cost ?? 0}
            onChange={(e) => upd(i, { cost: Number(e.target.value) })}
          />
          <button onClick={() => del(i)} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={16} /></button>
        </div>
      ))}
      <button onClick={add} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 flex items-center gap-2"><Plus size={14} /> Добавить правило</button>
    </div>
  )
}