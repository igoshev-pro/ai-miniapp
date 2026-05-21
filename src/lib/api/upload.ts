// src/lib/api/upload.ts
/**
 * Upload изображений на бэкенд → S3 (Timeweb Cloud).
 * Эндпоинт: POST /api/v1/upload/image
 * Поддерживает прогресс загрузки через XHR.
 */

export interface UploadResult {
  url: string
  key: string
  size: number
  mimetype: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  signal?: AbortSignal
}

/**
 * Валидация файла на клиенте перед отправкой.
 */
export function validateImageFile(file: File): string | null {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Поддерживаются только JPG, PNG, WebP, GIF'
  }
  if (file.size > MAX_SIZE) {
    return `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Максимум 10 MB`
  }
  if (file.size === 0) {
    return 'Файл пустой'
  }
  return null
}

/**
 * Загружает одно изображение на сервер с прогрессом.
 */
export function uploadImage(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const validationError = validateImageFile(file)
    if (validationError) {
      reject(new Error(validationError))
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('jwt') : null

    if (!token) {
      reject(new Error('Не авторизован'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}/upload/image`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    // Прогресс загрузки
    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          options.onProgress!({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          if (response.success && response.data) {
            resolve(response.data)
          } else {
            reject(new Error(response.message || 'Ошибка загрузки'))
          }
        } catch {
          reject(new Error('Некорректный ответ сервера'))
        }
      } else {
        try {
          const errResp = JSON.parse(xhr.responseText)
          reject(new Error(errResp.message || `Ошибка ${xhr.status}`))
        } catch {
          reject(new Error(`Ошибка ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')))
    xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')))

    // Поддержка AbortSignal
    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort()
        reject(new Error('Загрузка отменена'))
        return
      }
      options.signal.addEventListener('abort', () => xhr.abort())
    }

    xhr.send(formData)
  })
}

/**
 * Загружает несколько изображений параллельно с прогрессом.
 */
export async function uploadImages(
  files: File[],
  onItemProgress?: (index: number, progress: UploadProgress) => void,
): Promise<UploadResult[]> {
  return Promise.all(
    files.map((file, index) =>
      uploadImage(file, {
        onProgress: onItemProgress ? (p) => onItemProgress(index, p) : undefined,
      }),
    ),
  )
}