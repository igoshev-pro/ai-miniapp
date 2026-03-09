// src/lib/api/sse.ts

/**
 * SSE стриминг через fetch + ReadableStream
 * Бэкенд отправляет: POST /chat/stream → SSE (Server-Sent Events)
 *
 * Формат событий от бэкенда:
 * data: {"type":"token","content":"Привет"}
 * data: {"type":"done","messageId":"...","tokensUsed":3}
 * data: {"type":"error","message":"..."}
 */

export interface SSECallbacks {
  onToken: (token: string) => void
  onDone: (data: { messageId: string; tokensUsed?: number }) => void
  onError: (error: string) => void
}

export interface SSERequest {
  chatId: string
  model: string
  message: string
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
          (errorData as { message?: string }).message || `Ошибка сервера (${response.status})`
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6) // убираем "data: "
          if (jsonStr === '[DONE]') {
            return
          }

          try {
            const event = JSON.parse(jsonStr)

            switch (event.type) {
              case 'token':
                callbacks.onToken(event.content || '')
                break
              case 'done':
                callbacks.onDone({
                  messageId: event.messageId,
                  tokensUsed: event.tokensUsed,
                })
                return
              case 'error':
                callbacks.onError(event.message || 'Ошибка генерации')
                return
            }
          } catch {
            // некорректный JSON — пропускаем
          }
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return // отмена пользователем
      callbacks.onError('Ошибка соединения')
    })

  return controller
}