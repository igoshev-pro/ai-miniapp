'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Flame } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { formatCost, groupModelsByFamily } from '@/lib/data'

interface FamilyModel {
  slug: string
  name: string
  cost?: number
}

interface Props<T extends FamilyModel> {
  models: T[]
  renderModel: (model: T) => ReactNode
  /** Семейство с выбранной моделью раскрыто сразу и подсвечено. */
  isSelected?: (model: T) => boolean
  /** dropdown — строки в пикере модели, cards — карточки на «Все модели». */
  variant?: 'dropdown' | 'cards'
  /** Раскрыть все семейства (например, пока идёт поиск). */
  expandAll?: boolean
}

function pluralModels(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} модель`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} модели`
  return `${n} моделей`
}

// Список моделей, свёрнутый по семействам (GPT, Claude, Seedance…).
// Семейство из одной модели показывается сразу моделью, без заголовка.
export function ModelFamilyGroups<T extends FamilyModel>({
  models,
  renderModel,
  isSelected,
  variant = 'dropdown',
  expandAll = false,
}: Props<T>) {
  const { haptic } = useTelegram()
  const groups = useMemo(() => groupModelsByFamily(models), [models])

  const [open, setOpen] = useState<Set<string>>(() => {
    const selected = isSelected
      ? groups.find((g) => g.models.some(isSelected))
      : undefined
    return new Set(selected ? [selected.family] : [])
  })

  const toggle = (family: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
    haptic('light')
  }

  const isCards = variant === 'cards'

  return (
    <>
      {groups.map((group) => {
        if (group.models.length === 1) {
          const only = group.models[0]
          return <div key={only.slug} className="contents">{renderModel(only)}</div>
        }

        const isOpen = expandAll || open.has(group.family)
        const hasSelected = !!isSelected && group.models.some(isSelected)
        const costs = group.models
          .map((m) => m.cost)
          .filter((c): c is number => typeof c === 'number' && c >= 0)
        const minCost = costs.length ? Math.min(...costs) : undefined

        return (
          <div
            key={group.family}
            className={isCards ? '' : 'border-b border-[var(--border)] last:border-b-0'}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(group.family)}
              className={
                isCards
                  ? `
                    flex items-center justify-between gap-2.5 w-full
                    py-[11px] px-3 rounded-xl mb-1.5
                    bg-[var(--bg-glass)] backdrop-blur-[20px]
                    border border-white/[0.08]
                    cursor-pointer font-[inherit] text-left
                    transition-all duration-200
                    active:scale-[0.98] active:bg-white/[0.07]
                    lg:hover:bg-white/[0.07]
                    lg:py-3.5 lg:px-4 lg:rounded-[14px] lg:mb-2
                  `
                  : `
                    flex items-center justify-between gap-2 w-full
                    py-[11px] px-3.5
                    border-none bg-transparent
                    text-[13px] cursor-pointer font-[inherit] text-left
                    transition-[background] duration-150
                    active:bg-white/[0.04]
                  `
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`
                    font-bold truncate
                    ${isCards ? 'text-sm text-white lg:text-[15px]' : ''}
                    ${!isCards && (hasSelected || isOpen) ? 'text-white' : ''}
                    ${!isCards && !(hasSelected || isOpen) ? 'text-[var(--gray-400)]' : ''}
                  `}
                >
                  {group.family}
                </span>
                <span className="text-[11px] text-[var(--gray-600)] shrink-0">
                  {pluralModels(group.models.length)}
                </span>
                {hasSelected && !isOpen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {minCost !== undefined && !isOpen && (
                  <span className="text-[11px] text-white/40">
                    от {formatCost(minCost)}{' '}
                    <Flame size={12} className="inline-block align-[-2px]" />
                  </span>
                )}
                <ChevronDown
                  size={14}
                  className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {isOpen && (
              <div
                className={
                  isCards
                    ? 'pl-3 ml-2 border-l border-white/[0.08] mb-1.5'
                    : 'pl-3 bg-black/20 border-t border-[var(--border)]'
                }
              >
                {group.models.map((m) => (
                  <div key={m.slug} className="contents">{renderModel(m)}</div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
