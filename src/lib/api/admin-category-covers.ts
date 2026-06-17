// src/lib/api/admin-category-covers.ts
import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export interface CategoryCover {
  categoryId: 'text' | 'image' | 'video' | 'audio'
  imageUrl: string
  updatedAt?: string
}

export type CategoryCoversMap = Record<
  'text' | 'image' | 'video' | 'audio',
  CategoryCover | null
>

export const adminCategoryCoversApi = {
  /**
   * Получить все 4 обложки (с админ-токеном).
   */
  async list(): Promise<CategoryCoversMap> {
    const { data } = await apiClient.get<ApiEnvelope<CategoryCoversMap>>(
      ENDPOINTS.ADMIN_CATEGORY_COVERS,
    )
    return data.data
  },

  /**
   * Загрузить новую картинку для категории.
   * Возвращает обновлённую запись.
   */
  async upload(
    categoryId: 'text' | 'image' | 'video' | 'audio',
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<CategoryCover> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await apiClient.put<ApiEnvelope<CategoryCover>>(
      ENDPOINTS.ADMIN_CATEGORY_COVER(categoryId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        },
      },
    )
    return data.data
  },
}