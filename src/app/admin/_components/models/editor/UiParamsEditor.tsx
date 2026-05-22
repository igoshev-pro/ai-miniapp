'use client'
import { Plus, Trash2 } from 'lucide-react'

export function UiParamsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const add = () => onChange([...(value ?? []), { key: '', label: '', type: 'select', options: [] }])
  const upd = (i: number, p: any) => onChange(value.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const del = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      {(value ?? []).map((p, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 bg-zinc-800/40 rounded p-3">
          <input className="col-span-3 bg-zinc-900 rounded px-2 py-1 text-sm text-white" placeholder="key (aspect_ratio)" value={p.key ?? ''} onChange={(e) => upd(i, { key: e.target.value })} />
          <input className="col-span-3 bg-zinc-900 rounded px-2 py-1 text-sm text-white" placeholder="label (Соотношение)" value={p.label ?? ''} onChange={(e) => upd(i, { label: e.target.value })} />
          <select className="col-span-2 bg-zinc-900 rounded px-2 py-1 text-sm text-white" value={p.type ?? 'select'} onChange={(e) => upd(i, { type: e.target.value })}>
            <option value="select">select</option>
            <option value="number">number</option>
            <option value="text">text</option>
            <option value="toggle">toggle</option>
          </select>
          <input className="col-span-3 bg-zinc-900 rounded px-2 py-1 text-sm text-white" placeholder="options: 16:9,9:16,1:1" value={Array.isArray(p.options) ? p.options.join(',') : ''} onChange={(e) => upd(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          <button onClick={() => del(i)} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={16} /></button>
        </div>
      ))}
      <button onClick={add} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 flex items-center gap-2"><Plus size={14} /> Добавить параметр</button>
    </div>
  )
}