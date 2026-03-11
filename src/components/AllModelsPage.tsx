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
import { allModels, modelCategories, type ModelItem } from '@/lib/data'

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
      <div className="models-page__sticky">
        <div className="models-page__header fade-in fade-in--1">
          <div className="models-page__title">Все модели</div>
          <div className="models-page__count">{allModels.length}</div>
        </div>

        <div className="models-page__search fade-in fade-in--1">
          <Search size={16} className="models-page__search-icon" />
          <input
            type="text"
            placeholder="Найти модель..."
            className="models-page__search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="models-page__filters fade-in fade-in--2">
          <button
            className={`models-filter ${activeFilter === null ? 'models-filter--active' : ''}`}
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
              className={`models-filter ${activeFilter === cat.id ? 'models-filter--active' : ''}`}
              onClick={() => {
                setActiveFilter(activeFilter === cat.id ? null : cat.id)
                haptic('light')
              }}
            >
              {categoryIcons[cat.id]}
              {cat.label}
              <span className="models-filter__count">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="models-page__list fade-in fade-in--3">
        {grouped.map((group) => (
          <div key={group.category} className="models-group">
            <div className="models-group__label">{categoryLabels[group.category]}</div>
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
          <div className="models-page__empty">
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
    <div className="model-row" onClick={onTap} role="button" tabIndex={0}>
      <div className="model-row__icon">{modelIcons[model.category]}</div>
      <div className="model-row__body">
        <div className="model-row__name">{model.name}</div>
        <div className="model-row__meta">
          <span className="model-row__provider">{model.provider}</span>
          <span className="model-row__dot">·</span>
          <span className="model-row__desc">{model.description}</span>
        </div>
      </div>
      <div className="model-row__actions">
        <button
          className={`model-row__star ${fav ? 'model-row__star--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite()
          }}
          aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star size={14} />
        </button>
        <div className="model-row__arrow">
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  )
}