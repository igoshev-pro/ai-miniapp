// src/stores/chat.store.ts

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
  // Список чатов
  chats: Chat[]
  chatsLoaded: boolean

  // Активный чат
  activeChatId: string | null
  messages: ChatMessage[]
  messagesLoaded: boolean

  // Стриминг
  isStreaming: boolean
  streamingContent: string

  // Actions
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  removeChat: (chatId: string) => void

  setActiveChatId: (chatId: string | null) => void
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

  setActiveChatId: (chatId) => set({ activeChatId: chatId, messages: [], messagesLoaded: false }),
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