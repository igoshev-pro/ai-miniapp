// src/hooks/useChat.ts

'use client'

import { useCallback, useRef } from 'react'
import { apiClient, ENDPOINTS, streamChat, isApiError } from '@/lib/api'
import { useChatStore, type Chat, type ChatMessage } from '@/stores/chat.store'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'

interface CreateChatResponse {
  chat: Chat
}

interface MessagesResponse {
  messages: ChatMessage[]
}

interface ChatsListResponse {
  chats: Chat[]
}

export function useChat() {
  const store = useChatStore()
  const { user, updateBalance } = useUserStore()
  const abortRef = useRef<AbortController | null>(null)

  // Загрузить список чатов
  const loadChats = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ChatsListResponse>(ENDPOINTS.CHAT_LIST)
      store.setChats(data.chats)
    } catch (err) {
      console.error('[useChat] loadChats failed:', err)
      toast.error('Не удалось загрузить чаты')
    }
  }, [store])

  // Создать новый чат
  const createChat = useCallback(async (modelSlug: string): Promise<Chat | null> => {
    try {
      const { data } = await apiClient.post<CreateChatResponse>(ENDPOINTS.CHAT_CREATE, {
        model: modelSlug,
      })
      store.addChat(data.chat)
      store.setActiveChatId(data.chat.id)
      return data.chat
    } catch (err) {
      console.error('[useChat] createChat failed:', err)
      toast.error('Не удалось создать чат')
      return null
    }
  }, [store])

  // Загрузить сообщения чата
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      store.setActiveChatId(chatId)
      const { data } = await apiClient.get<MessagesResponse>(ENDPOINTS.CHAT_MESSAGES(chatId))
      store.setMessages(data.messages)
    } catch (err) {
      console.error('[useChat] loadMessages failed:', err)
      toast.error('Не удалось загрузить сообщения')
    }
  }, [store])

  // Отправить сообщение + получить SSE стрим
  const sendMessage = useCallback(async (
    chatId: string,
    model: string,
    content: string,
  ) => {
    // Проверка баланса на клиенте (грубая)
    if (user && user.totalBalance <= 0) {
      toast.warning('Недостаточно спичек. Пополните баланс!')
      return
    }

    // Добавляем сообщение пользователя в UI
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      chatId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    store.addMessage(userMessage)
    store.setStreaming(true)
    store.setStreamingContent('')

    // Запускаем SSE стрим
    abortRef.current = streamChat(
      { chatId, model, message: content },
      {
        onToken: (token) => {
          store.appendStreamingContent(token)
        },

        onDone: (data) => {
          // Добавляем финальное сообщение ассистента
          const assistantMessage: ChatMessage = {
            id: data.messageId,
            chatId,
            role: 'assistant',
            content: useChatStore.getState().streamingContent,
            model,
            tokensUsed: data.tokensUsed,
            createdAt: new Date().toISOString(),
          }
          store.addMessage(assistantMessage)
          store.resetStreaming()

          // Обновляем баланс
          if (data.tokensUsed && user) {
            const newBonus = Math.max(0, user.bonusTokens - data.tokensUsed)
            const usedFromBonus = user.bonusTokens - newBonus
            const usedFromMain = data.tokensUsed - usedFromBonus
            const newMain = Math.max(0, user.tokenBalance - usedFromMain)
            updateBalance(newMain, newBonus)
          }
        },

        onError: (error) => {
          store.resetStreaming()

          if (error.includes('спичек')) {
            toast.warning(error)
          } else {
            toast.error(error)
          }
        },
      },
    )
  }, [store, user, updateBalance])

  // Остановить стриминг
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null

    // Сохраняем то что уже пришло как сообщение
    const currentContent = useChatStore.getState().streamingContent
    if (currentContent.trim()) {
      const assistantMessage: ChatMessage = {
        id: 'stopped-' + Date.now(),
        chatId: store.activeChatId || '',
        role: 'assistant',
        content: currentContent,
        createdAt: new Date().toISOString(),
      }
      store.addMessage(assistantMessage)
    }
    store.resetStreaming()
  }, [store])

  // Удалить чат
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await apiClient.delete(`${ENDPOINTS.CHAT_LIST}/${chatId}`)
      store.removeChat(chatId)
      toast.success('Чат удалён')
    } catch {
      toast.error('Не удалось удалить чат')
    }
  }, [store])

  return {
    // Данные
    chats: store.chats,
    chatsLoaded: store.chatsLoaded,
    activeChatId: store.activeChatId,
    messages: store.messages,
    messagesLoaded: store.messagesLoaded,
    isStreaming: store.isStreaming,
    streamingContent: store.streamingContent,

    // Действия
    loadChats,
    createChat,
    loadMessages,
    sendMessage,
    stopStreaming,
    deleteChat,
  }
}