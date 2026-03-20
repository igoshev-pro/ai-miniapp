// src/lib/ws/socket.ts

import { io, Socket } from 'socket.io-client'

const WS_URL = 'https://spichki.tw1.ru'

let socket: Socket | null = null
let pendingSubscriptions: Set<string> = new Set()
let listenersRegistered = false

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/generation`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  s.auth = { token }

  // Регистрируем системные обработчики только один раз
  if (!listenersRegistered) {
    listenersRegistered = true

    s.on('connect', () => {
      console.log('[WS] Connected to /generation, socketId:', s.id)

      // Отправляем все отложенные подписки
      if (pendingSubscriptions.size > 0) {
        console.log('[WS] Sending pending subscriptions:', [...pendingSubscriptions])
        pendingSubscriptions.forEach((generationId) => {
          s.emit('generation:subscribe', { generationId })
        })
      }
    })

    s.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
    })

    s.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message)
    })

    // Логируем ВСЕ входящие события для отладки
    s.onAny((event, ...args) => {
      console.log('[WS] Event received:', event, args)
    })
  }

  if (!s.connected) {
    s.connect()
  }

  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    if (socket.connected) {
      socket.disconnect()
    }
  }
  socket = null
  listenersRegistered = false
  pendingSubscriptions.clear()
}

// Подписка с очередью — если сокет не подключён, подписка отложится
export function subscribeToGeneration(generationId: string) {
  pendingSubscriptions.add(generationId)

  const s = getSocket()
  if (s.connected) {
    console.log('[WS] Subscribing to:', generationId)
    s.emit('generation:subscribe', { generationId })
  } else {
    console.log('[WS] Socket not connected, queued subscription for:', generationId)
  }
}

export function unsubscribeFromGeneration(generationId: string) {
  pendingSubscriptions.delete(generationId)

  const s = getSocket()
  if (s.connected) {
    s.emit('generation:unsubscribe', { generationId })
  }
}

// --- Типы событий ---

export interface GenerationStatusEvent {
  generationId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface GenerationProgressEvent {
  generationId: string
  progress: number
  eta?: number
  status: 'processing'
}

export interface GenerationCompletedEvent {
  generationId: string
  status: 'completed'
  resultUrls: string[]
  resultContent?: string
  responseTimeMs?: number
}

export interface GenerationFailedEvent {
  generationId: string
  status: 'failed'
  errorMessage: string
  refunded: boolean
}

export const WS_EVENTS = {
  STATUS: 'generation:status',
  PROGRESS: 'generation:progress',
  COMPLETED: 'generation:completed',
  FAILED: 'generation:failed',
  SUBSCRIBE: 'generation:subscribe',
  UNSUBSCRIBE: 'generation:unsubscribe',
} as const