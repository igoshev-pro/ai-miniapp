import { create } from 'zustand'

export interface ChatMessage {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  tokensUsed?: number
  createdAt: string
}

export interface Chat {
  id: string
  title: string
  model: string
  modelSlug: string
  category: 'text' | 'image' | 'video' | 'audio'
  lastMessage?: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface ChatState {
  chats: Chat[]
  chatsLoaded: boolean
  activeChatId: string | null
  messages: ChatMessage[]
  messagesLoaded: boolean
  isStreaming: boolean
  streamingContent: string

  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  removeChat: (chatId: string) => void

  // Просто обновляет ID, сообщения НЕ трогает
  setActiveChatId: (chatId: string | null) => void
  // Переход на существующий чат из истории - сбрасывает сообщения чтобы загрузить новые
  switchChat: (chatId: string) => void
  // Новый чат - полный сброс
  switchToNewChat: () => void

  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: string, content: string) => void

  setStreaming: (v: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
  resetStreaming: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  chatsLoaded: false,
  activeChatId: null,
  messages: [],
  messagesLoaded: false,
  isStreaming: false,
  streamingContent: '',

  setChats: (chats) => set({ chats, chatsLoaded: true }),
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
  removeChat: (chatId) => set((s) => ({
    chats: s.chats.filter((c) => c.id !== chatId),
  })),

  // Только обновляет ID - используется в onConversation при стриминге
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),

  // Открыть чат из истории - сбрасывает сообщения чтобы загрузить с сервера
  switchChat: (chatId) => set({
    activeChatId: chatId,
    messages: [],
    messagesLoaded: false,
    isStreaming: false,
    streamingContent: '',
  }),

  // Кнопка + новый чат - полный сброс
  switchToNewChat: () => set({
    activeChatId: null,
    messages: [],
    messagesLoaded: false,
    isStreaming: false,
    streamingContent: '',
  }),

  setMessages: (messages) => set({ messages, messagesLoaded: true }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateMessage: (messageId, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, content } : m
      ),
    })),

  setStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  resetStreaming: () => set({ isStreaming: false, streamingContent: '' }),
}))