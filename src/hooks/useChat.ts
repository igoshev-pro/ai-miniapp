'use client'

import { useCallback, useRef } from 'react'
import { apiClient, ENDPOINTS, streamChat, isApiError } from '@/lib/api'
import { useChatStore, type Chat, type ChatMessage } from '@/stores/chat.store'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'
import { useModelsStore } from '@/stores/models.store'
import { allModels as fallbackModels } from '@/lib/data'

/**
 * Бекенд возвращает conversations в формате:
 * { success: true, data: { conversations: [...], total, page, pages } }
 */
interface ConversationsResponse {
  success: boolean
  data: {
    conversations: BackendConversation[]
    total: number
    page: number
    pages: number
  }
}

interface BackendConversation {
  _id: string
  userId: string
  modelSlug: string
  title: string
  isPinned: boolean
  isArchived: boolean
  messageCount: number
  totalTokensUsed: number
  systemPrompt?: string
  settings?: Record<string, unknown>
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Бекенд возвращает messages в формате:
 * { success: true, data: { messages: [...], total, page, pages } }
 */
interface MessagesResponse {
  success: boolean
  data: {
    messages: BackendMessage[]
    total: number
    page: number
    pages: number
  }
}

interface BackendMessage {
  _id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  imageUrls?: string[]
  modelSlug?: string
  providerSlug?: string
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number }
  responseTimeMs?: number
  tokensCost?: number
  isError?: boolean
  errorMessage?: string
  isStreaming?: boolean
  createdAt: string
  updatedAt: string
}

function getModelName(slug: string): string {
  const storeModels = useModelsStore.getState().models
  const models = storeModels.length > 0 ? storeModels : fallbackModels
  const found = models.find((m) => m.slug === slug)
  return found?.name || slug
}

// Маппинг slug → категория (для отображения иконок)
function slugToCategory(slug: string): 'text' | 'image' | 'video' | 'audio' {
  // Все чаты — текстовые
  return 'text'
}

function mapConversationToChat(conv: BackendConversation): Chat {
  return {
    id: conv._id,
    title: conv.title || 'Новый чат',
    model: getModelName(conv.modelSlug),
    modelSlug: conv.modelSlug,
    category: slugToCategory(conv.modelSlug),
    lastMessage: undefined, // Бекенд не возвращает — заполнится при загрузке сообщений
    messageCount: conv.messageCount,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt || conv.lastMessageAt || conv.createdAt,
  }
}

function mapBackendMessage(msg: BackendMessage): ChatMessage {
  return {
    id: msg._id,
    chatId: msg.conversationId,
    role: msg.role === 'system' ? 'assistant' : msg.role,
    content: msg.content,
    model: msg.modelSlug ? (getModelName(msg.modelSlug)) : undefined,
    tokensUsed: msg.tokensCost || msg.usage?.totalTokens,
    createdAt: msg.createdAt,
  }
}

export function useChat() {
  const store = useChatStore()
  const { user, updateBalance } = useUserStore()
  const abortRef = useRef<AbortController | null>(null)

  // Загрузить список чатов
  const loadChats = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ConversationsResponse>(
        ENDPOINTS.CHAT_CONVERSATIONS,
        { params: { page: 1, limit: 50 } },
      )

      const chats = (data.data?.conversations || []).map(mapConversationToChat)
      store.setChats(chats)
    } catch (err) {
      console.error('[useChat] loadChats failed:', err)
      // Не показываем ошибку если просто нет чатов
      store.setChats([])
    }
  }, [store])

  // Загрузить сообщения чата
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      store.setActiveChatId(chatId)
      const { data } = await apiClient.get<MessagesResponse>(
        ENDPOINTS.CHAT_MESSAGES(chatId),
        { params: { page: 1, limit: 50 } },
      )

      const messages = (data.data?.messages || [])
        .filter((m) => !m.isStreaming && !m.isError) // фильтруем незавершённые
        .map(mapBackendMessage)

      store.setMessages(messages)
    } catch (err) {
      console.error('[useChat] loadMessages failed:', err)
      toast.error('Не удалось загрузить сообщения')
    }
  }, [store])

  // Отправить сообщение + получить SSE стрим
  // chatId может быть null — тогда бекенд создаст новый чат
  const sendMessage = useCallback(async (
    chatId: string | null,
    modelSlug: string,
    content: string,
  ) => {
    // Проверка баланса на клиенте (грубая)
    if (user && user.totalBalance <= 0) {
      toast.warning('Недостаточно спичек. Пополните баланс!')
      return
    }

    // Добавляем сообщение пользователя в UI
    const tempChatId = chatId || 'pending'
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      chatId: tempChatId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    store.addMessage(userMessage)
    store.setStreaming(true)
    store.setStreamingContent('')

    // Запускаем SSE стрим
    abortRef.current = streamChat(
      {
        conversationId: chatId || undefined,
        modelSlug,
        content,
      },
      {
        onConversation: (data) => {
          // Бекенд создал/вернул conversation
          store.setActiveChatId(data.id)

          // Добавляем новый чат в список если его нет
          const exists = useChatStore.getState().chats.find((c) => c.id === data.id)
          if (!exists) {
            store.addChat({
              id: data.id,
              title: data.title || 'Новый чат',
              model: getModelName(modelSlug),
              modelSlug,
              category: 'text',
              messageCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        },

        onMessageStart: (_data) => {
          // Можно использовать messageId если нужно
        },

        onToken: (token) => {
          store.appendStreamingContent(token)
        },

        onDone: (data) => {
          // Добавляем финальное сообщение ассистента
          const assistantMessage: ChatMessage = {
            id: data.messageId || 'msg-' + Date.now(),
            chatId: useChatStore.getState().activeChatId || tempChatId,
            role: 'assistant',
            content: useChatStore.getState().streamingContent,
            model: getModelName(modelSlug),
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

          if (error.includes('спичек') || error.includes('баланс')) {
            toast.warning(error)
          } else {
            toast.error(error)
          }
        },
      },
    )
  }, [store, user, updateBalance])

  // Создать чат — теперь не нужен отдельный endpoint,
  // бекенд создаёт чат при первом сообщении.
  // Оставляем для совместимости с ChatPage, но просто возвращаем фейковый объект
  const createChat = useCallback(async (modelSlug: string): Promise<Chat | null> => {
    // Бекенд создаёт чат при первом sendMessage/streamMessage,
    // поэтому мы просто возвращаем заготовку.
    // Реальный ID придёт в SSE event "conversation".
    const tempChat: Chat = {
      id: 'pending-' + Date.now(),
      title: 'Новый чат',
      model: getModelName(modelSlug),
      modelSlug,
      category: 'text',
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.setActiveChatId(tempChat.id)
    return tempChat
  }, [store])

  // Остановить стриминг
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null

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
      await apiClient.delete(ENDPOINTS.CHAT_DELETE(chatId))
      store.removeChat(chatId)
      toast.success('Чат удалён')
    } catch {
      toast.error('Не удалось удалить чат')
    }
  }, [store])

  return {
    chats: store.chats,
    chatsLoaded: store.chatsLoaded,
    activeChatId: store.activeChatId,
    messages: store.messages,
    messagesLoaded: store.messagesLoaded,
    isStreaming: store.isStreaming,
    streamingContent: store.streamingContent,

    loadChats,
    createChat,
    loadMessages,
    sendMessage,
    stopStreaming,
    deleteChat,
  }
}