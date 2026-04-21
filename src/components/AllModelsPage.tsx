'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Image,
  Video,
  Music,
  ChevronRight,
  Search,
  Star,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useFavorites } from '@/hooks'
import { useModels } from '@/hooks'
import type { ModelItem } from '@/lib/data'

const categoryIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare size={13} />,
  image: <Image size={13} />,
  video: <Video size={13} />,
  audio: <Music size={13} />,
}

const modelIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare size={16} />,
  image: <Image size={16} />,
  video: <Video size={16} />,
  audio: <Music size={16} />,
}

const categoryLabels: Record<string, string> = {
  text: 'Текстовые ИИ',
  image: 'ИИ для изображений',
  video: 'ИИ для видео',
  audio: 'ИИ для аудио',
}

interface Props {
  onBack: () => void
  initialCategory?: string | null
  onModelTap?: (modelName: string, category: string) => void
}

export function AllModelsPage({ onBack, initialCategory, onModelTap }: Props) {
  const { haptic } = useTelegram()
  const { toggle: toggleFavorite } = useFavorites()
  const { models: allModels, categories: modelCategories } = useModels()
  const [activeFilter, setActiveFilter] = useState<string | null>(initialCategory ?? null)
  const [search, setSearch] = useState('')

  const filteredModels = allModels.filter((m) => {
    const matchCategory = activeFilter ? m.category === activeFilter : true
    const matchSearch = search
      ? m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase())
      : true
    return matchCategory && matchSearch
  })

  const grouped = activeFilter
    ? [{ category: activeFilter, models: filteredModels }]
    : (['text', 'image', 'video', 'audio'] as const)
        .map((cat) => ({
          category: cat,
          models: filteredModels.filter((m) => m.category === cat),
        }))
        .filter((g) => g.models.length > 0)

  return (
    <div className="models-page">
      {/* Sticky header — оставляем CSS-класс для fixed позиционирования и адаптива */}
      <div className="models-page__sticky">
        {/* Header row */}
        <div className="flex items-center gap-2.5 pb-2.5 fade-in fade-in--1">
          <h1 className="text-lg font-bold text-white">Все модели</h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 font-semibold">
            {allModels.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2.5 fade-in fade-in--1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Найти модель..."
            className="
              w-full py-2.5 pr-3 pl-[38px] rounded-xl
              border border-white/[0.08] bg-white/[0.04]
              text-white text-[13px] font-[inherit]
              outline-none transition-[border-color] duration-200
              placeholder:text-neutral-600
              focus:border-yellow-400/20
            "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div
          className="
            flex gap-1.5 overflow-x-auto pb-3
            scrollbar-none fade-in fade-in--2
          "
        >
          <button
            className={`
              shrink-0 flex items-center gap-[5px]
              py-[7px] px-3.5 rounded-lg
              border text-xs font-medium
              cursor-pointer transition-all duration-200
              font-[inherit] whitespace-nowrap
              active:scale-[0.96]
              ${
                activeFilter === null
                  ? 'bg-yellow-400 text-[#0a0a0a] border-transparent font-bold [&_svg]:text-[#0a0a0a]'
                  : 'bg-[var(--bg-glass)] backdrop-blur-[20px] border-white/[0.08] text-neutral-500'
              }
            `}
            onClick={() => {
              setActiveFilter(null)
              haptic('light')
            }}
          >
            Все
          </button>
          {modelCategories.map((cat) => (
            <button
              key={cat.id}
              className={`
                shrink-0 flex items-center gap-[5px]
                py-[7px] px-3.5 rounded-lg
                border text-xs font-medium
                cursor-pointer transition-all duration-200
                font-[inherit] whitespace-nowrap
                active:scale-[0.96]
                ${
                  activeFilter === cat.id
                    ? 'bg-yellow-400 text-[#0a0a0a] border-transparent font-bold [&_svg]:text-[#0a0a0a]'
                    : 'bg-[var(--bg-glass)] backdrop-blur-[20px] border-white/[0.08] text-neutral-500'
                }
              `}
              onClick={() => {
                setActiveFilter(activeFilter === cat.id ? null : cat.id)
                haptic('light')
              }}
            >
              {categoryIcons[cat.id]}
              {cat.label}
              <span
                className={`text-[10px] ${
                  activeFilter === cat.id ? 'opacity-60' : 'opacity-70'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List — оставляем CSS-класс для padding-top (148px) и адаптива */}
      <div className="models-page__list fade-in fade-in--3">
        {grouped.map((group) => (
          <div key={group.category} className="mb-1">
            <div className="text-xs font-semibold text-neutral-600 py-2 uppercase tracking-wide">
              {categoryLabels[group.category]}
            </div>
            {group.models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onTap={() => {
                  haptic('light')
                  onModelTap?.(model.name, model.category)
                }}
                onFavorite={() => {
                  haptic('light')
                  toggleFavorite('model', model.slug, model.name)
                }}
              />
            ))}
          </div>
        ))}

        {filteredModels.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 py-15 px-5 text-neutral-600 text-center text-sm">
            <Search size={24} />
            <span>Ничего не найдено</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelCard({
  model,
  onTap,
  onFavorite,
}: {
  model: ModelItem
  onTap: () => void
  onFavorite: () => void
}) {
  const { isFavorite } = useFavorites()
  const fav = isFavorite('model', model.slug)

  return (
    <div
      className="
        flex items-center gap-2.5
        py-[11px] px-3 rounded-xl
        bg-[var(--bg-glass)] backdrop-blur-[20px]
        border border-white/[0.08]
        mb-1.5 cursor-pointer
        transition-all duration-200
        active:scale-[0.98] active:bg-white/[0.07]
        lg:hover:bg-white/[0.07] lg:hover:translate-x-0.5
        lg:py-3.5 lg:px-4 lg:rounded-[14px] lg:mb-2
      "
      onClick={onTap}
      role="button"
      tabIndex={0}
    >
      {/* Icon */}
      <div
        className="
          w-9 h-9 rounded-[9px] shrink-0
          flex items-center justify-center
          bg-white/[0.04] text-neutral-500
          lg:w-10 lg:h-10
        "
      >
        {modelIcons[model.category]}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white lg:text-[15px]">
            {model.name}
          </span>
          <span
            className="
              text-[11px] font-semibold text-yellow-400
              bg-yellow-400/[0.08] px-[7px] py-px
              rounded-[5px] whitespace-nowrap shrink-0
              tracking-[0.2px]
            "
          >
            {model.hasVariants ? 'от ' : ''}
            {model.cost % 1 === 0 ? model.cost : model.cost.toFixed(2)} 🔥
          </span>
        </div>
        <div
          className="
            flex items-center gap-1 mt-0.5
            text-[11px] text-neutral-500
            whitespace-nowrap overflow-hidden
            lg:text-xs
          "
        >
          <span className="text-neutral-400 font-medium shrink-0">
            {model.provider}
          </span>
          <span className="text-neutral-600 shrink-0">·</span>
          <span className="overflow-hidden text-ellipsis">
            {model.description}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className={`
            w-8 h-8 rounded-lg border-none bg-transparent
            flex items-center justify-center
            cursor-pointer transition-all duration-150
            active:scale-[0.85]
            ${
              fav
                ? 'text-yellow-400 [&_svg]:fill-yellow-400'
                : 'text-white/25'
            }
          `}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite()
          }}
          aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star size={14} />
        </button>
        <div className="text-white/15 flex items-center">
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  )
}