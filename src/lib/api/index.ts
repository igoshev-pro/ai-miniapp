// src/lib/api/index.ts
export { apiClient, isApiError, type ApiError } from './client'
export { ENDPOINTS } from './endpoints'
export { streamChat, type SSECallbacks, type SSERequest } from './sse'
export {
  uploadImage,
  uploadImages,
  validateImageFile,
  uploadDocument,        // 🆕
  validateDocumentFile,  // 🆕
  type UploadResult,
  type UploadProgress,
  type UploadOptions,
} from './upload'
export type { UploadDocumentResult } from './upload'  // 🆕