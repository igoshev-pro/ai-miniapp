// src/lib/ws/socket.ts

import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/generation`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  s.auth = { token }
  if (!s.connected) {
    s.connect()
  }

  s.on('connect', () => {
    console.log('[WS] Connected to /generation')
  })

  s.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
  })

  s.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message)
  })

  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
  socket = null
}

// Подписка на конкретную генерацию
export function subscribeToGeneration(generationId: string) {
  const s = getSocket()
  if (s.connected) {
    s.emit('generation:subscribe', { generationId })
  }
}

export function unsubscribeFromGeneration(generationId: string) {
  const s = getSocket()
  if (s.connected) {
    s.emit('generation:unsubscribe', { generationId })
  }
}

// --- Типы событий (точно по бэкенду) ---

// generation:status
export interface GenerationStatusEvent {
  generationId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

// generation:progress
export interface GenerationProgressEvent {
  generationId: string
  progress: number  // 0-100
  eta?: number       // секунды до завершения
  status: 'processing'
}

// generation:completed
export interface GenerationCompletedEvent {
  generationId: string
  status: 'completed'
  resultUrls: string[]
  resultContent?: string
  responseTimeMs?: number
}

// generation:failed
export interface GenerationFailedEvent {
  generationId: string
  status: 'failed'
  errorMessage: string
  refunded: boolean
}

// Названия событий — точно как на бэкенде
export const WS_EVENTS = {
  // От сервера к клиенту
  STATUS: 'generation:status',
  PROGRESS: 'generation:progress',
  COMPLETED: 'generation:completed',
  FAILED: 'generation:failed',

  // От клиента к серверу
  SUBSCRIBE: 'generation:subscribe',
  UNSUBSCRIBE: 'generation:unsubscribe',
} as const