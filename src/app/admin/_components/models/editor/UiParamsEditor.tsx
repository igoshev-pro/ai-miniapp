'use client'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

type Option = { value: string; label: string }
type UiParam = {
  key: string
  label: string
  type: 'select' | 'number' | 'text' | 'toggle'
  options?: Option[]
  defaultValue?: any
  affectsPrice?: boolean
}

export function UiParamsEditor({ value, onChange }: { value: UiParam[]; onChange: (v: UiParam[]) => void }) {
  const list = value ?? []
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true })

  const add = () => onChange([...list, { key: '', label: '', type: 'select', options: [], affectsPrice: false }])
  const upd = (i: number, p: Partial<UiParam>) => onChange(list.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const del = (i: number) => onChange(list.filter((_, idx) => idx !== i))

  const addOption = (i: number) => upd(i, { options: [...(list[i].options ?? []), { value: '', label: '' }] })
  const updOption = (i: number, oi: number, p: Partial<Option>) =>
    upd(i, { options: (list[i].options ?? []).map((o, idx) => idx === oi ? { ...o, ...p } : o) })
  const delOption = (i: number, oi: number) =>
    upd(i, { options: (list[i].options ?? []).filter((_, idx) => idx !== oi) })

  return (
    <div className="space-y-3">
      {list.map((p, i) => (
        <div key={i} className="bg-zinc-800/40 rounded-lg border border-zinc-700/50">
          {/* header */}
          <div className="flex items-center gap-2 p-3">
            <button onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))} className="text-zinc-400 hover:text-white">
              {open[i] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
            </button>
            <div className="flex-1 text-sm">
              <span className="text-white font-medium">{p.label || '—'}</span>
              <span className="text-zinc-500 ml-2 text-xs">{p.key}</span>
              {p.affectsPrice && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">влияет на цену</span>}
            </div>
            <button onClick={() => del(i)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
          </div>

          {open[i] && (
            <div className="p-3 pt-0 space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <Field label="Key" className="col-span-3">
                  <input className={inp} value={p.key ?? ''} onChange={(e) => upd(i, { key: e.target.value })}/>
                </Field>
                <Field label="Label" className="col-span-4">
                  <input className={inp} value={p.label ?? ''} onChange={(e) => upd(i, { label: e.target.value })}/>
                </Field>
                <Field label="Тип" className="col-span-2">
                  <select className={inp} value={p.type ?? 'select'} onChange={(e) => upd(i, { type: e.target.value as any })}>
                    <option value="select">select</option>
                    <option value="number">number</option>
                    <option value="text">text</option>
                    <option value="toggle">toggle</option>
                  </select>
                </Field>
                <Field label="Default" className="col-span-2">
                  <input className={inp} value={p.defaultValue ?? ''} onChange={(e) => upd(i, { defaultValue: e.target.value })}/>
                </Field>
                <Field label="$" className="col-span-1">
                  <label className="flex items-center justify-center h-[30px]">
                    <input type="checkbox" checked={!!p.affectsPrice} onChange={(e) => upd(i, { affectsPrice: e.target.checked })}/>
                  </label>
                </Field>
              </div>

              {p.type === 'select' && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">Опции</div>
                  {(p.options ?? []).map((o, oi) => (
                    <div key={oi} className="grid grid-cols-12 gap-2">
                      <input className={`${inp} col-span-4`} placeholder="value (turbo)" value={o.value} onChange={(e) => updOption(i, oi, { value: e.target.value })}/>
                      <input className={`${inp} col-span-7`} placeholder="label (Турбо режим)" value={o.label} onChange={(e) => updOption(i, oi, { label: e.target.value })}/>
                      <button onClick={() => delOption(i, oi)} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  <button onClick={() => addOption(i)} className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1">
                    <Plus size={12}/> Опция
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <button onClick={add} className="px-3 py-2 bg-indigo-600/80 hover:bg-indigo-500 rounded text-sm text-white flex items-center gap-2">
        <Plus size={14}/> Добавить параметр
      </button>
    </div>
  )
}

const inp = 'w-full bg-zinc-900 rounded px-2 py-1.5 text-sm text-white border border-zinc-700 focus:border-indigo-500 outline-none'
function Field({ label, children, className = '' }: any) {
  return (
    <div className={className}>
      <div className="text-[10px] text-zinc-500 uppercase mb-1">{label}</div>
      {children}
    </div>
  )
}