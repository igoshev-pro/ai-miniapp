'use client'

import { ChevronRight } from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useModels } from '@/hooks'

interface Props {
  onViewAll: () => void
  onCategoryTap: (categoryId: string) => void
}

export function Categories({ onViewAll, onCategoryTap }: Props) {
  const { haptic } = useTelegram()
  const { models, categories } = useModels()

  const categoriesData = [
    { id: 'text', title: 'Текстовые ИИ', description: 'ChatGPT, Claude, Gemini и другие', coverUrl: '/covers/text.webp' },
    { id: 'image', title: 'Генерация картинок', description: 'Midjourney, DALL-E, Flux и другие', coverUrl: '/covers/image.webp' },
    { id: 'video', title: 'Генерация видео', description: 'Sora, Kling, Runway и другие', coverUrl: '/covers/video.webp' },
    { id: 'audio', title: 'Генерация аудио', description: 'Suno, ElevenLabs', coverUrl: '/covers/audio.webp' },
  ].map((c) => ({
    ...c,
    modelCount: models.filter((m) => m.category === c.id).length,
  }))

  const totalModels = categoriesData.reduce((sum, c) => sum + c.modelCount, 0)

  return (
    <div className="fade-in fade-in--3">
      {/* Section title */}
      <div className="flex items-center gap-2 text-[17px] font-bold text-[var(--text-primary)] mb-3">
        Модели ИИ
        <span className="text-[10px] py-[3px] px-2 rounded-[20px] bg-white/5 text-[var(--gray-500)] font-semibold tracking-wide">
          {totalModels} моделей
        </span>
        <span
          className="
            ml-auto text-[12px] text-[var(--accent-yellow)] font-semibold
            cursor-pointer flex items-center gap-0.5
            select-none [-webkit-tap-highlight-color:transparent]
          "
          onClick={() => {
            haptic('light')
            onViewAll()
          }}
          role="button"
          tabIndex={0}
        >
          Все <ChevronRight size={12} />
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5 -mb-1">
        {categoriesData.map((cat) => (
          <div
            key={cat.id}
            className="
              category-card
              p-0 rounded-[var(--radius)] overflow-hidden
              bg-[var(--bg-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              border border-white/[0.08]
              cursor-pointer
              transition-all duration-200
              active:scale-[0.97] active:bg-[var(--bg-card-hover)]
              flex flex-col relative
            "
            onClick={() => {
              haptic('light')
              onCategoryTap(cat.id)
            }}
            role="button"
            tabIndex={0}
          >
            {/* Cover */}
            <div className="relative overflow-hidden w-full pt-[100%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.coverUrl}
                alt={cat.title}
                className="
                  absolute inset-0 w-full h-full object-cover
                  transition-opacity duration-300
                "
                loading="lazy"
              />
              {/* Gradient overlay on cover */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[60%] pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, var(--bg-glass), transparent)',
                }}
              />
            </div>

            {/* Body */}
            <div className="p-3.5 pb-4 flex flex-col gap-2.5 flex-1">
              <div className="text-[14px] font-bold text-[var(--accent-red)]">
                {cat.title}
              </div>
              <div className="text-[11px] text-[var(--gray-500)] leading-[1.5]">
                {cat.description}
              </div>
              <div className="text-[10px] text-[var(--gray-500)] py-[3px] px-2 bg-white/[0.04] rounded w-fit whitespace-nowrap">
                {cat.modelCount}{' '}
                {cat.modelCount === 1
                  ? 'модель'
                  : cat.modelCount < 5
                    ? 'модели'
                    : 'моделей'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}