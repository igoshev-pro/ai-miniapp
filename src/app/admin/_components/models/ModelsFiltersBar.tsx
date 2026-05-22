'use client'

import { Search } from 'lucide-react'
import type { ModelsFilters } from '@/types/admin-model'

interface Props {
  filters: ModelsFilters
  onChange: (f: ModelsFilters) => void
}

const TYPE_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: 'chat', label: 'Чат' },
  { value: 'image', label: 'Изображения' },
  { value: 'video', label: 'Видео' },
  { value: 'audio', label: 'Аудио' },
  { value: 'embedding', label: 'Embeddings' },
]

export function ModelsFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="relative flex-1 min-w-[240px]">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Поиск по slug / name / displayName..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <select
        value={filters.type || ''}
        onChange={(e) => onChange({ ...filters, type: e.target.value || undefined })}
        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
      >
        {TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.isActive || ''}
        onChange={(e) =>
          onChange({ ...filters, isActive: (e.target.value as any) || undefined })
        }
        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
      >
        <option value="">Все</option>
        <option value="true">✅ Только активные</option>
        <option value="false">🚫 Только выключенные</option>
      </select>

      <select
        value={filters.isPremium || ''}
        onChange={(e) =>
          onChange({ ...filters, isPremium: (e.target.value as any) || undefined })
        }
        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
      >
        <option value="">Все</option>
        <option value="true">⭐ Premium</option>
        <option value="false">Free</option>
      </select>
    </div>
  )
}