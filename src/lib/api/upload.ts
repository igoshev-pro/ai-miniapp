/**
 * Upload изображений на бэкенд → S3 (Timeweb Cloud).
 * Эндпоинт: POST /api/v1/upload/image
 * Поддерживает прогресс загрузки через XHR.
 */
import { useAuthStore } from '@/stores/auth.store'

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
    return `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(
      1,
    )} MB). Максимум 10 MB`
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

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
    // ✅ Токен из Zustand-стора
    const token = useAuthStore.getState().token

    if (!token) {
      reject(new Error('Не авторизован'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}/upload/image`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

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
        // Очищаем токен при 401
        if (xhr.status === 401) {
          useAuthStore.getState().clearToken()
        }
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
        onProgress: onItemProgress
          ? (p) => onItemProgress(index, p)
          : undefined,
      }),
    ),
  )
}

// ─── ДОКУМЕНТЫ ──────────────────────────────────────────

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',   // 🆕
  'text/x-markdown', // 🆕 (некоторые браузеры)
]
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.md', '.markdown']
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20 MB

export function validateDocumentFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  const okMime = DOCUMENT_MIME_TYPES.includes(file.type)
  const okExt = DOCUMENT_EXTENSIONS.includes(ext)
  if (!okMime && !okExt) {
    return 'Поддерживаются: PDF, Word, Excel, TXT, CSV, Markdown' // 🆕
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Максимум 20 MB`
  }
  if (file.size === 0) {
    return 'Файл пустой'
  }
  return null
}

export interface UploadDocumentResult {
  url: string
  key: string
  filename: string
  size: number
  mimetype: string
  hasText: boolean
  textLength: number
  extractedText: string
}

export function uploadDocument(
  file: File,
  options: UploadOptions = {},
): Promise<UploadDocumentResult> {
  return new Promise((resolve, reject) => {
    const validationError = validateDocumentFile(file)
    if (validationError) {
      reject(new Error(validationError))
      return
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
    const token = useAuthStore.getState().token

    if (!token) {
      reject(new Error('Не авторизован'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}/upload/document`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

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
          const data = response.success ? response.data : response
          if (data && data.url) {
            resolve({
              url: data.url,
              key: data.key || '',
              filename: data.filename || file.name,
              size: data.size || file.size,
              mimetype: data.mimetype || file.type,
              hasText: !!data.hasText,
              textLength: data.textLength || 0,
              extractedText: data.extractedText || '',
            })
          } else {
            reject(new Error(response.message || 'Ошибка загрузки'))
          }
        } catch {
          reject(new Error('Некорректный ответ сервера'))
        }
      } else {
        if (xhr.status === 401) {
          useAuthStore.getState().clearToken()
        }
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