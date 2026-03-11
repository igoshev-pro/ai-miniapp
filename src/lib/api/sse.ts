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
 *   data: {"messageId":"...","usage":{...},"tokensCost":3}
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
  onDone: (data: { messageId: string; tokensUsed?: number; usage?: Record<string, number> }) => void
  onError: (error: string) => void
}

export interface SSERequest {
  conversationId?: string
  modelSlug: string
  content: string
  imageUrls?: string[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export function streamChat(
  request: SSERequest,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController()
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('jwt') : null

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

        if (response.status === 402) {
          callbacks.onError('Недостаточно спичек для генерации')
          return
        }
        if (response.status === 429) {
          callbacks.onError('Слишком много запросов, подождите')
          return
        }

        callbacks.onError(
          (errorData as { message?: string }).message || `Ошибка сервера (${response.status})`,
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
            // Пустая строка = конец SSE блока, сброс
            currentEvent = ''
            continue
          }

          // Парсим "event: <name>"
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          // Парсим "data: <json>"
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
                  })
                  return

                case 'error':
                  callbacks.onError(data.message || 'Ошибка генерации')
                  return

                case 'done':
                  // Финальное событие, стрим завершён
                  return

                default:
                  // Fallback: если бекенд шлёт без event (legacy format)
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
              // Некорректный JSON — пропускаем
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