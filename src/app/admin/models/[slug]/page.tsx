'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'
import type { AdminModel, UpdateModelPayload } from '@/types/admin-model'
import { useModelActions } from '@/hooks/useAdminModels'
import { UIParametersEditor } from '../../_components/models/UIParametersEditor'

interface ApiEnvelope<T> { success: boolean; data: T }

export default function ModelEditorPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const { update, busy } = useModelActions()

  const [model, setModel] = useState<AdminModel | null>(null)
  const [draft, setDraft] = useState<UpdateModelPayload>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ui' | 'pricing' | 'caps' | 'json'>('ui')

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<AdminModel>>(
          ENDPOINTS.ADMIN_MODEL(slug),
        )
        setModel(data.data)
        setDraft({
          uiParameters: data.data.uiParameters || [],
          pricingMatrix: data.data.pricingMatrix || [],
          inputCapabilities: data.data.inputCapabilities || {},
          defaultParams: data.data.defaultParams || {},
        })
      } catch (e) {
        toast.error(isApiError(e) ? e.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  const handleSave = async () => {
    const result = await update(slug, draft)
    if (result) setModel(result)
  }

  if (loading) return <div className="p-12 text-zinc-500">Загрузка...</div>
  if (!model) return <div className="p-12 text-red-400">Модель не найдена</div>

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/models')}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{model.displayName}</h1>
            <p className="text-sm text-zinc-500">
              {model.slug} · {model.type}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {busy ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {([
          ['ui', '🎛 UI Параметры'],
          ['pricing', '💰 Матрица цен'],
          ['caps', '📎 Capabilities'],
          ['json', '{ } Сырой JSON'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm border-b-2 transition ${
              tab === k
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'ui' && (
          <UIParametersEditor
            value={draft.uiParameters || []}
            onChange={(v) => setDraft(p => ({ ...p, uiParameters: v }))}
          />
        )}
        {tab === 'pricing' && (
          <div className="text-zinc-500 p-8 text-center bg-zinc-900 rounded-xl border border-zinc-800">
            PricingMatrixEditor — в следующем сообщении
          </div>
        )}
        {tab === 'caps' && (
          <div className="text-zinc-500 p-8 text-center bg-zinc-900 rounded-xl border border-zinc-800">
            InputCapabilitiesEditor — в следующем сообщении
          </div>
        )}
        {tab === 'json' && (
          <JsonEditor draft={draft} onChange={setDraft} />
        )}
      </div>
    </div>
  )
}

// ─── Раздел: Сырой JSON (fallback на всё) ─────────────────────

function JsonEditor({
  draft, onChange,
}: {
  draft: UpdateModelPayload
  onChange: (v: UpdateModelPayload) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(draft, null, 2))
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          try {
            const parsed = JSON.parse(e.target.value)
            onChange(parsed)
            setErr(null)
          } catch (er: any) {
            setErr(er.message)
          }
        }}
        rows={28}
        className="w-full font-mono text-sm p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200"
      />
      {err && <div className="text-red-400 text-sm">{err}</div>}
    </div>
  )
}