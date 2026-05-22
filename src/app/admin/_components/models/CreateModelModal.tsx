'use client'

import { useState } from 'react'
import type { CreateModelPayload, GenerationType } from '@/types/admin-model'
import { Modal, Field, Input, Toggle } from './EditModelModal'

interface Props {
  busy: boolean
  onClose: () => void
  onCreate: (payload: CreateModelPayload) => void
}

export function CreateModelModal({ busy, onClose, onCreate }: Props) {
  const [form, setForm] = useState<CreateModelPayload>({
    slug: '',
    name: '',
    displayName: '',
    description: '',
    icon: '',
    type: 'chat' as GenerationType,
    isActive: true,
    isPremium: false,
    supportsVision: false,
    sortOrder: 0,
    tokenCost: 0,
    minTokenCost: 1,
    tokensPerDollar: 30,
    fixedCostPerGeneration: 0,
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
  })

  const set = <K extends keyof CreateModelPayload>(k: K, v: CreateModelPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const canSubmit =
    form.slug.trim().length > 1 &&
    form.name.trim().length > 0 &&
    form.displayName.trim().length > 0

  return (
    <Modal title="Создание новой модели" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug * (уникальный)">
          <Input
            value={form.slug}
            onChange={(v) =>
              set('slug', v.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))
            }
          />
        </Field>
        <Field label="Тип *">
          <select
            value={form.type as string}
            onChange={(e) => set('type', e.target.value as GenerationType)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option value="chat">chat</option>
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="audio">audio</option>
            <option value="embedding">embedding</option>
          </select>
        </Field>

        <Field label="Display Name *">
          <Input value={form.displayName} onChange={v => set('displayName', v)} />
        </Field>
        <Field label="Name (internal) *">
          <Input value={form.name} onChange={v => set('name', v)} />
        </Field>

        <Field label="Описание" full>
          <textarea
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
        </Field>

        <Field label="Icon URL" full>
          <Input value={form.icon || ''} onChange={v => set('icon', v)} />
        </Field>

        <Field label="Sort Order">
          <Input
            type="number"
            value={String(form.sortOrder ?? 0)}
            onChange={v => set('sortOrder', Number(v))}
          />
        </Field>
        <Field label="tokenCost (legacy)">
          <Input
            type="number"
            value={String(form.tokenCost ?? 0)}
            onChange={v => set('tokenCost', Number(v))}
          />
        </Field>

        <Field label="$ / 1M Input">
          <Input
            type="number"
            step="0.01"
            value={String(form.costPerMillionInputTokens ?? 0)}
            onChange={v => set('costPerMillionInputTokens', Number(v))}
          />
        </Field>
        <Field label="$ / 1M Output">
          <Input
            type="number"
            step="0.01"
            value={String(form.costPerMillionOutputTokens ?? 0)}
            onChange={v => set('costPerMillionOutputTokens', Number(v))}
          />
        </Field>

        <Field label="Fixed cost ($ / gen)">
          <Input
            type="number"
            step="0.001"
            value={String(form.fixedCostPerGeneration ?? 0)}
            onChange={v => set('fixedCostPerGeneration', Number(v))}
          />
        </Field>
        <Field label="Tokens per $">
          <Input
            type="number"
            value={String(form.tokensPerDollar ?? 30)}
            onChange={v => set('tokensPerDollar', Number(v))}
          />
        </Field>

        <Field label="Min token cost">
          <Input
            type="number"
            value={String(form.minTokenCost ?? 1)}
            onChange={v => set('minTokenCost', Number(v))}
          />
        </Field>

        <Field label="Флаги" full>
          <div className="flex flex-wrap gap-4">
            <Toggle label="isActive" value={!!form.isActive} onChange={v => set('isActive', v)} />
            <Toggle label="isPremium" value={!!form.isPremium} onChange={v => set('isPremium', v)} />
            <Toggle label="supportsVision" value={!!form.supportsVision} onChange={v => set('supportsVision', v)} />
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-800">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
        >
          Отмена
        </button>
        <button
          onClick={() => onCreate(form)}
          disabled={!canSubmit || busy}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Создание...' : 'Создать модель'}
        </button>
      </div>
    </Modal>
  )
}