'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useAdminModels, useModelActions } from '@/hooks/useAdminModels'
import type { AdminModel } from '@/types/admin-model'

import { UiParamsEditor }      from '../../_components/models/editor/UiParamsEditor'
import { PricingMatrixEditor } from '../../_components/models/editor/PricingMatrixEditor'
import { CapabilitiesEditor }  from '../../_components/models/editor/CapabilitiesEditor'
import { RawJsonEditor }       from '../../_components/models/editor/RawJsonEditor'

type Tab = 'ui' | 'pricing' | 'caps' | 'json'

export default function ModelEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { items, loading, patchLocal } = useAdminModels()
  const actions = useModelActions()

  const model = useMemo<AdminModel | undefined>(
    () => items.find((m: any) => m.slug === slug),
    [items, slug],
  )

  const [tab, setTab] = useState<Tab>('ui')
  const [draft, setDraft] = useState<Partial<AdminModel>>({})

  useEffect(() => { if (model) setDraft(model) }, [model])

  const patch = (p: Partial<AdminModel>) => setDraft((d) => ({ ...d, ...p }))

  const save = async () => {
    if (!model) return
    const res = await actions.update(model.slug, draft)
    if (res) patchLocal(model.slug, res as any)
  }

  if (loading && !model) {
    return <div className="p-10 flex items-center gap-2 text-zinc-400"><Loader2 className="animate-spin" size={18}/> Загрузка…</div>
  }
  if (!model) {
    return (
      <div className="p-10 space-y-3">
        <div className="text-red-400">Модель «{slug}» не найдена в списке.</div>
        <button onClick={() => router.push('/admin/models')} className="px-3 py-2 rounded bg-zinc-800 text-zinc-200">← К списку</button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ui',      label: '🎛 UI параметры' },
    { id: 'pricing', label: '💰 Матрица цен' },
    { id: 'caps',    label: '📎 Capabilities' },
    { id: 'json',    label: '{ } JSON' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/models')} className="p-2 rounded hover:bg-zinc-800 text-zinc-300">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{(model as any).title || model.slug}</h1>
            <p className="text-xs text-zinc-500">{model.slug} · {(model as any).provider}</p>
          </div>
        </div>
        <button onClick={save} disabled={actions.busy}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2">
          <Save size={16}/> Сохранить
        </button>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 transition ${tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
        {tab === 'ui'      && <UiParamsEditor      value={(draft as any).uiParameters ?? []}      onChange={(v) => patch({ uiParameters: v } as any)} />}
        {tab === 'pricing' && (
  <PricingMatrixEditor
    value={(draft as any).pricingMatrix ?? []}
    onChange={(v) => patch({ pricingMatrix: v } as any)}
    uiParameters={(draft as any).uiParameters ?? []}
  />
)}
        {tab === 'caps'    && <CapabilitiesEditor  value={(draft as any).inputCapabilities ?? {}} onChange={(v) => patch({ inputCapabilities: v } as any)} />}
        {tab === 'json'    && <RawJsonEditor       value={draft}                                   onChange={setDraft} />}
      </div>
    </div>
  )
}