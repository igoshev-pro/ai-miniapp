// src/lib/api/index.ts (обновлённый)

export { apiClient, isApiError, type ApiError } from './client'
export { ENDPOINTS } from './endpoints'
export { streamChat, type SSECallbacks, type SSERequest } from './sse'