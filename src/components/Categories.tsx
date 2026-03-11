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
      <div className="section-title">
        Модели ИИ
        <span className="section-title__badge">{totalModels} моделей</span>
        <span
          className="section-title__link"
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

      <div className="categories-grid">
        {categoriesData.map((cat) => (
          <div
            key={cat.id}
            className="category-card"
            onClick={() => {
              haptic('light')
              onCategoryTap(cat.id)
            }}
            role="button"
            tabIndex={0}
          >
            <div className="category-card__cover-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.coverUrl}
                alt={cat.title}
                className="category-card__cover"
                loading="lazy"
              />
            </div>

            <div className="category-card__body">
              <div className="category-card__title">{cat.title}</div>
              <div className="category-card__desc">{cat.description}</div>
              <div className="category-card__count">
                {cat.modelCount} {cat.modelCount === 1 ? 'модель' : cat.modelCount < 5 ? 'модели' : 'моделей'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}