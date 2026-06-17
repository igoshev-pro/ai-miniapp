// src/app/admin/category-covers/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  adminCategoryCoversApi,
  type CategoryCoversMap,
} from '@/lib/api/admin-category-covers'

type CategoryId = 'text' | 'image' | 'video' | 'audio'

interface CategoryMeta {
  id: CategoryId
  title: string
  description: string
  fallback: string
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'text',
    title: 'Текстовые ИИ',
    description: 'ChatGPT, Claude, Gemini и другие',
    fallback: '/covers/text.webp',
  },
  {
    id: 'image',
    title: 'Генерация картинок',
    description: 'Midjourney, DALL-E, Flux и другие',
    fallback: '/covers/image.webp',
  },
  {
    id: 'video',
    title: 'Генерация видео',
    description: 'Sora, Kling, Runway и другие',
    fallback: '/covers/video.webp',
  },
  {
    id: 'audio',
    title: 'Генерация аудио',
    description: 'Suno, ElevenLabs',
    fallback: '/covers/audio.webp',
  },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export default function CategoryCoversPage() {
  const [covers, setCovers] = useState<CategoryCoversMap | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<CategoryId | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<CategoryId | null>(null)

  const fileInputs = useRef<Record<CategoryId, HTMLInputElement | null>>({
    text: null,
    image: null,
    video: null,
    audio: null,
  })

  // Загрузка существующих обложек
  useEffect(() => {
    let cancelled = false
    adminCategoryCoversApi
      .list()
      .then((data) => {
        if (!cancelled) setCovers(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[CategoryCovers] load failed:', err)
          setError('Не удалось загрузить обложки')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleFileSelect = async (
    categoryId: CategoryId,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Сброс input — чтобы можно было загрузить тот же файл повторно
    e.target.value = ''

    // ─── Валидация на фронте ───────────────────────────────
    if (!ALLOWED_MIME.includes(file.type)) {
      setError(`Неподдерживаемый формат: ${file.type}. Разрешены PNG, JPEG, WebP`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)} MB. Максимум 10 MB`)
      return
    }

    setError(null)
    setSuccessId(null)
    setUploadingId(categoryId)
    setProgress(0)

    try {
      const updated = await adminCategoryCoversApi.upload(
        categoryId,
        file,
        (percent) => setProgress(percent),
      )

      // Обновляем локально без полного перезапроса
      setCovers((prev) => ({
        ...(prev ?? ({} as CategoryCoversMap)),
        [categoryId]: updated,
      }))

      setSuccessId(categoryId)
      setTimeout(() => setSuccessId(null), 2500)
    } catch (err: any) {
      console.error('[CategoryCovers] upload failed:', err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Не удалось загрузить изображение'
      setError(msg)
    } finally {
      setUploadingId(null)
      setProgress(0)
    }
  }

  const openFileDialog = (categoryId: CategoryId) => {
    fileInputs.current[categoryId]?.click()
  }

  // ─── Loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <ImageIcon className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Обложки категорий</h1>
            <p className="text-sm text-zinc-400">
              Изображения для 4 типов нейросетей на главной странице
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-red-300">Ошибка</div>
            <div className="text-sm text-red-400/80 mt-0.5">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400/60 hover:text-red-400 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
        <strong className="text-zinc-200">Требования:</strong> PNG / JPEG / WebP, до 10 MB.
        Рекомендуемое соотношение сторон — квадрат (1:1).
        Изменения применяются <strong className="text-zinc-200">мгновенно</strong> для всех пользователей.
      </div>

      {/* Grid 2×2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CATEGORIES.map((cat) => {
          const currentUrl = covers?.[cat.id]?.imageUrl || cat.fallback
          const isUploading = uploadingId === cat.id
          const isSuccess = successId === cat.id
          const isCustom = !!covers?.[cat.id]?.imageUrl

          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col"
            >
              {/* Cover preview */}
              <div className="relative w-full pt-[60%] bg-zinc-950 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUrl}
                  alt={cat.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Upload overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                    <div className="text-sm text-white font-medium">
                      Загрузка... {progress}%
                    </div>
                    <div className="w-32 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success indicator */}
                {isSuccess && (
                  <div className="absolute top-3 right-3 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 px-2.5 py-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">
                      Обновлено
                    </span>
                  </div>
                )}

                {/* Source badge */}
                {!isUploading && (
                  <div className="absolute top-3 left-3">
                    <span
                      className={`
                        text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded
                        ${isCustom
                          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                          : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                        }
                      `}
                    >
                      {isCustom ? 'Кастомная' : 'Дефолтная'}
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div>
                  <div className="text-base font-bold text-white">{cat.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{cat.description}</div>
                </div>

                <div className="text-[10px] text-zinc-600 font-mono break-all">
                  ID: {cat.id}
                </div>

                {/* Upload button */}
                <input
                  ref={(el) => {
                    fileInputs.current[cat.id] = el
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileSelect(cat.id, e)}
                />
                <button
                  onClick={() => openFileDialog(cat.id)}
                  disabled={isUploading}
                  className="
                    mt-auto flex items-center justify-center gap-2
                    px-4 py-2.5 rounded-xl
                    bg-gradient-to-r from-orange-500/20 to-red-500/20
                    border border-orange-500/30
                    text-sm font-medium text-orange-300
                    hover:from-orange-500/30 hover:to-red-500/30
                    hover:border-orange-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Загрузка...' : 'Загрузить новое изображение'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-8 text-center text-xs text-zinc-600">
        После загрузки новой картинки старая удаляется из S3 автоматически
      </div>
    </div>
  )
}