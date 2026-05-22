'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { AdminModel, UpdateModelPayload } from '@/types/admin-model'

interface Props {
  model: AdminModel
  busy: boolean
  onClose: () => void
  onSave: (payload: UpdateModelPayload) => void
}

export function EditModelModal({ model, busy, onClose, onSave }: Props) {
  const [form, setForm] = useState<UpdateModelPayload>({
    displayName: model.displayName,
    name: model.name,
    description: model.description || '',
    icon: model.icon || '',
    type: model.type,
    isActive: model.isActive,
    isPremium: model.isPremium,
    supportsVision: model.supportsVision,
    sortOrder: model.sortOrder,
    tokenCost: model.tokenCost ?? 0,
    minTokenCost: model.minTokenCost,
    tokensPerDollar: model.tokensPerDollar,
    fixedCostPerGeneration: model.fixedCostPerGeneration,
    costPerMillionInputTokens: model.costPerMillionInputTokens,
    costPerMillionOutputTokens: model.costPerMillionOutputTokens,
  })

  const set = <K extends keyof UpdateModelPayload>(k: K, v: UpdateModelPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal title={`Редактирование: ${model.displayName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Display Name">
          <Input value={form.displayName || ''} onChange={v => set('displayName', v)} />
        </Field>
        <Field label="Name (internal)">
          <Input value={form.name || ''} onChange={v => set('name', v)} />
        </Field>

        <Field label="Slug (readonly)" full>
          <Input value={model.slug} readOnly />
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

        <Field label="Тип">
          <select
            value={form.type as string}
            onChange={(e) => set('type', e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option value="chat">chat</option>
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="audio">audio</option>
            <option value="embedding">embedding</option>
          </select>
        </Field>
        <Field label="Sort Order">
          <Input
            type="number"
            value={String(form.sortOrder ?? 0)}
            onChange={v => set('sortOrder', Number(v))}
          />
        </Field>

        <Field label="tokenCost (deprecated)">
          <Input
            type="number"
            value={String(form.tokenCost ?? 0)}
            onChange={v => set('tokenCost', Number(v))}
          />
        </Field>
        <Field label="minTokenCost">
          <Input
            type="number"
            value={String(form.minTokenCost ?? 0)}
            onChange={v => set('minTokenCost', Number(v))}
          />
        </Field>

        <Field label="$ / 1M Input tokens">
          <Input
            type="number"
            step="0.01"
            value={String(form.costPerMillionInputTokens ?? 0)}
            onChange={v => set('costPerMillionInputTokens', Number(v))}
          />
        </Field>
        <Field label="$ / 1M Output tokens">
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
          onClick={() => onSave(form)}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
        >
          {busy ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Shared little UI ──────────────────────────────────────────

export function Modal({
  title, onClose, children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label, full, children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

export function Input({
  value, onChange, type = 'text', readOnly, step,
}: {
  value: string
  onChange?: (v: string) => void
  type?: string
  readOnly?: boolean
  step?: string
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 ${
        readOnly ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    />
  )
}

export function Toggle({
  label, value, onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
    >
      <span
        className={`relative inline-block w-10 h-6 rounded-full transition ${
          value ? 'bg-emerald-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            value ? 'translate-x-4' : ''
          }`}
        />
      </span>
      {label}
    </button>
  )
}