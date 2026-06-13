// src/lib/api/sse.ts

import { useAuthStore } from '@/stores/auth.store'

/**
 * SSE стриминг через fetch + ReadableStream
 * Бэкенд: POST /chat/stream → SSE
 *
 * Формат событий от бэкенда (named events):
 *   event: conversation
 *   data: {"id":"...","title":"Новый чат"}
 *
 *   event: message_start
 *   data: {"messageId":"..."}
 *
 *   event: text_delta
 *   data: {"content":"chunk"}
 *
 *   event: message_end
 *   data: {
 *     "messageId":"...",
 *     "usage":{...},
 *     "tokensCost":3,
 *     "newTokenBalance":47,   ← актуальный баланс с сервера после списания
 *     "newBonusTokens":0,
 *     "newCashbackBalance":5
 *   }
 *
 *   event: error
 *   data: {"message":"..."}
 *
 *   event: done
 *   data: {}
 */

export interface SSECallbacks {
  onConversation?: (data: { id: string; title: string }) => void
  onMessageStart?: (data: { messageId: string }) => void
  onToken: (token: string) => void
  onDone: (data: {
    messageId: string
    tokensUsed?: number
    usage?: Record<string, number>
    // ✅ Актуальные балансы с сервера — присутствуют только при успешной генерации.
    // Если undefined — сервер не смог прочитать баланс (редкий случай),
    // фронт должен сделать отдельный запрос /users/me или пропустить обновление.
    newTokenBalance?: number
    newBonusTokens?: number
    newCashbackBalance?: number
  }) => void
  onError: (error: string) => void
}

export interface ChatAttachment {
  url: string
  filename: string
  mimeType?: string
  text?: string
}

export interface SSERequest {
  conversationId?: string
  modelSlug: string
  content: string
  imageUrls?: string[]
  attachments?: ChatAttachment[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export function streamChat(
  request: SSERequest,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController()
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  // Токен из Zustand-стора (persist) — безопасно вызывать вне React
  const token = useAuthStore.getState().token

  fetch(`${baseUrl}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          useAuthStore.getState().clearToken()
          callbacks.onError('Сессия истекла, войдите снова')
          return
        }
        if (response.status === 402) {
          callbacks.onError('Недостаточно спичек для генерации')
          return
        }
        if (response.status === 429) {
          callbacks.onError('Слишком много запросов, подождите')
          return
        }

        callbacks.onError(
          (errorData as { message?: string }).message ||
            `Ошибка сервера (${response.status})`,
        )
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError('Стриминг не поддерживается')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''
      let messageId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed) {
            // Пустая строка = конец SSE-события, сбрасываем тип
            currentEvent = ''
            continue
          }

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue

            try {
              const data = JSON.parse(jsonStr)

              switch (currentEvent) {
                case 'conversation':
                  callbacks.onConversation?.(data)
                  break

                case 'message_start':
                  messageId = data.messageId || ''
                  callbacks.onMessageStart?.(data)
                  break

                case 'text_delta':
                  callbacks.onToken(data.content || '')
                  break

                case 'message_end':
                  callbacks.onDone({
                    messageId: data.messageId || messageId,
                    tokensUsed: data.tokensCost || data.usage?.totalTokens,
                    usage: data.usage,
                    // ✅ Пробрасываем актуальные балансы с сервера.
                    // Могут быть undefined если сервер не смог прочитать (сеть, БД).
                    newTokenBalance: data.newTokenBalance,
                    newBonusTokens: data.newBonusTokens,
                    newCashbackBalance: data.newCashbackBalance,
                  })
                  return

                case 'error':
                  callbacks.onError(data.message || 'Ошибка генерации')
                  return

                case 'done':
                  return

                default:
                  // Fallback: legacy формат без named events
                  if (data.type === 'token') {
                    callbacks.onToken(data.content || '')
                  } else if (data.type === 'done') {
                    callbacks.onDone({
                      messageId: data.messageId || messageId,
                      tokensUsed: data.tokensUsed,
                    })
                    return
                  } else if (data.type === 'error') {
                    callbacks.onError(data.message || 'Ошибка')
                    return
                  }
                  break
              }
            } catch {
              // Некорректный JSON — пропускаем чанк
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return
      callbacks.onError('Ошибка соединения')
    })

  return controller
}