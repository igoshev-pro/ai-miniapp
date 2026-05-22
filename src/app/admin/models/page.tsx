'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw } from 'lucide-react'
import type { AdminModel } from '@/types/admin-model'
import { ModelsFiltersBar } from '../_components/models/ModelsFiltersBar'
import { useAdminModels, useModelActions } from '@/hooks/useAdminModels'
import { ModelsTable } from '../_components/models/ModelsTable'
import { CreateModelModal } from '../_components/models/CreateModelModal'

export default function AdminModelsPage() {
  const router = useRouter()
  const {
    items, total, loading, filters, setFilters,
    refetch, patchLocal, removeLocal, addLocal,
  } = useAdminModels()

  const actions = useModelActions()
  const [creating, setCreating] = useState(false)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Модели</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Всего: {total} · Активных: {items.filter((m: any) => m.isActive).length}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-2 transition"
          >
            <RefreshCw size={16} /> Обновить
          </button>
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition"
          >
            <Plus size={16} /> Новая модель
          </button>
        </div>
      </div>

      <ModelsFiltersBar filters={filters} onChange={setFilters} />

      <ModelsTable
        items={items}
        loading={loading}
        busy={actions.busy}
        // 🆕 теперь редактирование = переход на полную страницу
        onEdit={(m: AdminModel) => router.push(`/admin/models/${m.slug}`)}
        onToggle={async (slug: any) => {
          const cur = items.find((m: any) => m.slug === slug)
          if (!cur) return
          patchLocal(slug, { isActive: !cur.isActive })
          const res = await actions.toggle(slug)
          if (!res) patchLocal(slug, { isActive: cur.isActive })
        }}
        onInlineTokenCost={async (slug: any, value: any) => {
          const cur = items.find((m: any) => m.slug === slug)
          if (!cur) return
          patchLocal(slug, { tokenCost: value })
          const res = await actions.update(slug, { tokenCost: value })
          if (!res) patchLocal(slug, { tokenCost: cur.tokenCost })
        }}
        onDelete={async (slug: any, hard: any) => {
          const ok = await actions.remove(slug, hard)
          if (!ok) return
          if (hard) removeLocal(slug)
          else patchLocal(slug, { isActive: false })
        }}
      />

      {creating && (
        <CreateModelModal
          busy={actions.busy}
          onClose={() => setCreating(false)}
          onCreate={async (payload: any) => {
            const res = await actions.create(payload)
            if (res) {
              addLocal(res)
              router.push(`/admin/models/${res.slug}`)   // 🆕 сразу в редактор
            }
          }}
        />
      )}
    </div>
  )
}