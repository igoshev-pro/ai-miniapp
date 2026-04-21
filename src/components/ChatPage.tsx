'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  Paperclip,
  Send,
  Square,
  Image,
  FileText,
  Mic,
  X,
  Check,
  Copy,
  Wand2,
  MessageSquare,
  Star,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser, useModels, useFavorites } from '@/hooks'
import { useChatStore, type ChatMessage } from '@/stores/chat.store'
import { useModelsStore } from '@/stores/models.store'
import { apiClient, ENDPOINTS, streamChat, isApiError } from '@/lib/api'
import { useUserStore } from '@/stores/user.store'
import { MessageContent } from '@/components/ui/MessageContent'
import { allModels as fallbackModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

interface Attachment {
  id: string
  name: string
  type: 'image' | 'file'
  size: string
}

const examplePrompts = [
  'Объясни квантовые вычисления простыми словами',
  'Напиши стихотворение о закате над морем',
  'Помоги составить план тренировок на неделю',
  'Переведи на английский: "Искусственный интеллект меняет мир"',
  'Придумай 5 идей для мобильного приложения',
]

interface Props {
  initialModel?: string
  chatId?: string
  onBack?: () => void
}

function getModels() {
  const storeModels = useModelsStore.getState().models
  return storeModels.length > 0 ? storeModels : fallbackModels
}

function resolveModelStatic(nameOrSlug: string | undefined) {
  const models = getModels()
  const textModels = models.filter((m) => m.category === 'text')
  if (!nameOrSlug) return textModels[0] || models[0]
  return (
    models.find((m) => m.name === nameOrSlug) ||
    models.find((m) => m.slug === nameOrSlug) ||
    textModels[0] ||
    models[0]
  )
}

function getModelName(slug: string): string {
  const models = getModels()
  return models.find((m) => m.slug === slug)?.name || slug
}

export function ChatPage({ initialModel, chatId: existingChatId, onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { toggle: toggleFavorite } = useFavorites()

  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const activeChatId = useChatStore((s) => s.activeChatId)

  const storeModels = useModelsStore((s) => s.models)
  const allModels = storeModels.length > 0 ? storeModels : fallbackModels
  const textModels = useMemo(() => allModels.filter((m) => m.category === 'text'), [allModels])

  const initialResolved = useMemo(() => resolveModelStatic(initialModel), [initialModel])

  const [input, setInput] = useState('')
  const [selectedModelName, setSelectedModelName] = useState(initialResolved?.name || 'ChatGPT 4o')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const didLoadRef = useRef(false)

  const currentModel = useMemo(
    () => allModels.find((m) => m.name === selectedModelName) || initialResolved,
    [allModels, selectedModelName, initialResolved],
  )
  const modelSlug = currentModel?.slug || 'gpt-4o'
  const modelCost = currentModel?.cost || 1

  // ─── Загрузка сообщений ───
  useEffect(() => {
    if (!existingChatId || didLoadRef.current) return
    didLoadRef.current = true
    setIsLoadingMessages(true)
    const store = useChatStore.getState()
    store.switchChat(existingChatId)
    apiClient
      .get(ENDPOINTS.CHAT_MESSAGES(existingChatId), { params: { page: 1, limit: 50 } })
      .then(({ data }: any) => {
        const msgs = (data.data?.messages || [])
          .filter((m: any) => !m.isStreaming && !m.isError)
          .map((msg: any): ChatMessage => ({
            id: msg._id,
            chatId: msg.conversationId,
            role: msg.role === 'system' ? 'assistant' : msg.role,
            content: msg.content,
            model: msg.modelSlug ? getModelName(msg.modelSlug) : undefined,
            tokensUsed: msg.tokensCost || msg.usage?.totalTokens,
            createdAt: msg.createdAt,
          }))
        store.setMessages(msgs)
      })
      .catch(() => toast.error('Не удалось загрузить сообщения'))
      .finally(() => setIsLoadingMessages(false))
  }, [existingChatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (!webApp?.BackButton || !onBack) return
    webApp.BackButton.show()
    const handler = () => onBack()
    webApp.BackButton.onClick(handler)
    return () => {
      webApp.BackButton.offClick(handler)
      webApp.BackButton.hide()
    }
  }, [webApp, onBack])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  function formatTime(dateStr?: string) {
    const d = dateStr ? new Date(dateStr) : new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && attachments.length === 0) return
    if (isStreaming) return
    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }
    haptic('medium')
    const fullText = text + (attachments.length > 0 ? `\n\n📎 ${attachments.map((a) => a.name).join(', ')}` : '')
    setInput('')
    setAttachments([])
    setShowAttachMenu(false)
    const store = useChatStore.getState()
    const currentActiveChatId = store.activeChatId
    const chatIdToSend = currentActiveChatId && !currentActiveChatId.startsWith('pending-') ? currentActiveChatId : null
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      chatId: chatIdToSend || 'pending',
      role: 'user',
      content: fullText,
      createdAt: new Date().toISOString(),
    }
    store.addMessage(userMessage)
    store.setStreaming(true)
    store.setStreamingContent('')
    abortRef.current = streamChat(
      { conversationId: chatIdToSend || undefined, modelSlug, content: fullText },
      {
        onConversation: (data) => {
          store.setActiveChatId(data.id)
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
        onMessageStart: () => {},
        onToken: (token) => store.appendStreamingContent(token),
        onDone: (data) => {
          const finalContent = useChatStore.getState().streamingContent
          const finalChatId = useChatStore.getState().activeChatId
          const assistantMessage: ChatMessage = {
            id: data.messageId || 'msg-' + Date.now(),
            chatId: finalChatId || 'pending',
            role: 'assistant',
            content: finalContent,
            model: getModelName(modelSlug),
            tokensUsed: data.tokensUsed,
            createdAt: new Date().toISOString(),
          }
          store.addMessage(assistantMessage)
          store.resetStreaming()
          if (data.tokensUsed) {
            const userState = useUserStore.getState()
            if (userState.user) {
              const newBonus = Math.max(0, userState.user.bonusTokens - data.tokensUsed)
              const usedFromBonus = userState.user.bonusTokens - newBonus
              const usedFromMain = data.tokensUsed - usedFromBonus
              const newMain = Math.max(0, userState.user.tokenBalance - usedFromMain)
              userState.updateBalance(newMain, newBonus)
            }
          }
          hapticNotification('success')
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
  }, [input, attachments, isStreaming, balance, modelCost, modelSlug, haptic, hapticNotification])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    const store = useChatStore.getState()
    const currentContent = store.streamingContent
    if (currentContent.trim()) {
      store.addMessage({
        id: 'stopped-' + Date.now(),
        chatId: store.activeChatId || '',
        role: 'assistant',
        content: currentContent,
        createdAt: new Date().toISOString(),
      })
    }
    store.resetStreaming()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = useCallback(
    (id: string, content: string) => {
      navigator.clipboard.writeText(content).catch(() => {})
      setCopiedId(id)
      haptic('light')
      setTimeout(() => setCopiedId(null), 2000)
    },
    [haptic],
  )

  const addAttachment = useCallback(
    (type: 'image' | 'file') => {
      haptic('light')
      setAttachments((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: type === 'image' ? `photo_${Math.floor(Math.random() * 1000)}.jpg` : `doc_${Math.floor(Math.random() * 1000)}.pdf`,
          type,
          size: type === 'image' ? '2.4 MB' : '156 KB',
        },
      ])
      setShowAttachMenu(false)
    },
    [haptic],
  )

  const removeAttachment = useCallback(
    (id: string) => {
      haptic('light')
      setAttachments((prev) => prev.filter((a) => a.id !== id))
    },
    [haptic],
  )

  const insertExample = useCallback(() => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }, [haptic])

  const hasMessages = messages.length > 0

  return (
    <div
      className="
        chat-page
        relative z-[1] flex flex-col
        h-[calc(100vh-var(--header-height)-74px-var(--safe-bottom))]
        h-[calc(var(--tg-viewport-stable-height,100dvh)-var(--header-height)-74px-var(--safe-bottom))]
      "
    >
      {/* ── Model bar ── */}
      <div
        className="
          chat-page__model-bar
          fade-in fade-in--1
          fixed top-[calc(var(--header-height)+var(--safe-area-top,0px))]
          left-0 right-0 z-40
          flex items-center gap-2
          px-4 pt-2.5 pb-1.5
          bg-[rgba(8,8,10,0.95)]
          backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]
          border-b border-white/[0.04]
        "
      >
        <button
          className="
            chat-model-selector
            inline-flex items-center gap-1.5
            py-[7px] px-3.5
            rounded-[var(--radius-xs)]
            border border-[var(--border-glass)]
            bg-[var(--bg-glass)]
            backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
            text-white text-[13px] font-semibold
            cursor-pointer transition-all duration-200
            active:scale-[0.97]
            font-[inherit]
          "
          onClick={() => {
            if (!isStreaming) {
              setShowModelPicker(!showModelPicker)
              haptic('light')
            }
          }}
        >
          <MessageSquare size={14} className="text-[var(--gray-500)]" />
          <span>{selectedModelName}</span>
          <span className="text-[11px] text-white/40 ml-1">
            {modelCost % 1 === 0 ? modelCost : modelCost.toFixed(2)} 🔥
          </span>
          <ChevronDown
            size={14}
            className={`
              text-[var(--gray-500)] transition-transform duration-200
              ${showModelPicker ? 'rotate-180' : ''}
            `}
          />
        </button>

        {activeChatId && !activeChatId.startsWith('pending-') && (
          <button
            className="
              chat-page__favorite-btn
              w-9 h-9 rounded-[9px]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              text-[var(--gray-500)]
              flex items-center justify-center
              cursor-pointer transition-all duration-150
              shrink-0 [-webkit-tap-highlight-color:transparent]
              active:scale-[0.9] active:text-[var(--accent-yellow)]
            "
            onClick={() => {
              haptic('light')
              toggleFavorite('conversation', activeChatId, selectedModelName)
            }}
          >
            <Star size={16} />
          </button>
        )}
      </div>

      {/* ── Model dropdown ── */}
      {showModelPicker && (
        <div
          className="
            chat-model-dropdown
            fade-in
            fixed top-[calc(var(--header-height)+var(--safe-area-top,0px)+46px)]
            left-4 right-4 z-[39]
            rounded-[var(--radius-sm)]
            border border-[var(--border-glass)]
            bg-[var(--bg-glass-heavy)]
            backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
            overflow-hidden max-h-[400px] overflow-y-auto
          "
        >
          {textModels.map((m) => (
            <button
              key={m.id}
              className={`
                flex items-center justify-between w-full
                py-[11px] px-3.5
                border-none bg-transparent
                text-[var(--gray-400)] text-[13px]
                cursor-pointer transition-[background] duration-150
                font-[inherit] text-left
                border-b border-[var(--border)]
                last:border-b-0
                active:bg-white/[0.04]
                ${selectedModelName === m.name ? 'text-white' : ''}
              `}
              onClick={() => {
                setSelectedModelName(m.name)
                setShowModelPicker(false)
                haptic('light')
              }}
            >
              <div className="flex flex-col gap-[1px]">
                <span className="font-semibold">{m.name}</span>
                <span className="text-[11px] text-[var(--gray-600)]">{m.provider}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/40">
                  {m.cost % 1 === 0 ? m.cost : m.cost.toFixed(2)} 🔥
                </span>
                {selectedModelName === m.name && (
                  <Check size={14} className="text-[var(--accent-yellow)]" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="
          chat-page__messages
          flex-1 overflow-y-auto
          px-4 pb-[70px] pt-[52px]
          flex flex-col gap-3.5
          overscroll-y-contain [-webkit-overflow-scrolling:touch]
          pt-[calc(var(--header-height)+40px)]
        "
      >
        {/* Empty state */}
        {!hasMessages && !isStreaming && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center flex-1 fade-in fade-in--2">
            <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/15 mb-1">
              <MessageSquare size={36} strokeWidth={1.5} />
            </div>
            <div className="text-[17px] font-semibold text-white/60">Чат с ИИ</div>
            <div className="text-[13px] text-white/30 max-w-[280px] leading-[1.5]">
              Задайте вопрос, попросите помощь с кодом, текстом или переводом. ИИ готов помочь.
            </div>
            <button
              className="
                flex items-center gap-1.5
                bg-white/[0.06] border border-white/[0.08]
                rounded-[10px] py-2.5 px-5
                text-white/50 text-[13px]
                cursor-pointer mt-2 transition-all duration-150
                [-webkit-tap-highlight-color:transparent] font-[inherit]
                active:bg-white/10
              "
              onClick={insertExample}
            >
              <Wand2 size={14} /> Пример промпта
            </button>
          </div>
        )}

        {/* Loading messages */}
        {isLoadingMessages && (
          <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center flex-1">
            <div className="flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite_0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite_0.3s]" />
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`
              flex flex-col max-w-[85%] animate-[fadeIn_0.3s_ease-out]
              ${msg.role === 'user'
                ? 'self-end items-end'
                : 'self-start items-start'
              }
            `}
          >
            {msg.role === 'assistant' && (
              <div className="text-[10px] font-semibold text-[var(--gray-600)] mb-1 pl-0.5">
                {msg.model || selectedModelName}
              </div>
            )}

            <div
              className={`
                py-2.5 px-3.5 rounded-[var(--radius-sm)] leading-[1.55] text-[13.5px]
                ${msg.role === 'user'
                  ? 'bg-[var(--accent-yellow)] text-[#0a0a0a] rounded-br-[4px]'
                  : 'bg-[var(--bg-glass)] backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)] border border-[var(--border-glass)] text-[var(--gray-200)] rounded-bl-[4px]'
                }
              `}
            >
              {msg.role === 'assistant' ? (
                <MessageContent content={msg.content} />
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 px-0.5">
              <span className="text-[10px] text-[var(--gray-600)]">
                {formatTime(msg.createdAt)}
              </span>
              {msg.role === 'assistant' && (
                <div className="flex gap-1">
                  <button
                    className="
                      w-6 h-6 rounded-[6px] border-none
                      bg-white/[0.04] text-[var(--gray-600)]
                      flex items-center justify-center
                      cursor-pointer transition-all duration-150
                      active:scale-[0.88] active:bg-white/[0.08] active:text-[var(--gray-400)]
                    "
                    onClick={() => copyMessage(msg.id, msg.content)}
                  >
                    {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {msg.tokensUsed && (
                    <span className="text-[10px] text-white/30 ml-1">{msg.tokensUsed} 🔥</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && (
          <div className="flex flex-col max-w-[85%] self-start items-start animate-[fadeIn_0.3s_ease-out]">
            <div className="text-[10px] font-semibold text-[var(--gray-600)] mb-1 pl-0.5">
              {selectedModelName}
            </div>
            <div
              className="
                py-2.5 px-3.5 rounded-[var(--radius-sm)] leading-[1.55] text-[13.5px]
                bg-[var(--bg-glass)] backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
                border border-[var(--border-glass)] text-[var(--gray-200)] rounded-bl-[4px]
              "
            >
              {streamingContent ? (
                <div className="msg-streaming-cursor">
                  <MessageContent content={streamingContent} />
                </div>
              ) : (
                <div className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite_0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-500)] animate-[typingBounce_1.2s_ease-in-out_infinite_0.3s]" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        className="
          chat-page__input-area
          shrink-0 flex flex-col gap-2
          px-4 pt-2 pb-2.5
          border-t border-[var(--border-glass)]
          fixed bottom-[calc(59px+var(--safe-bottom))]
          left-0 right-0 z-50
          bg-[var(--bg-glass-heavy)]
          backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
        "
      >
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="
                  flex items-center gap-[5px]
                  py-1.5 px-2.5
                  rounded-[var(--radius-xs)]
                  bg-[var(--bg-glass)] border border-[var(--border-glass)]
                  text-[var(--gray-400)] text-[11px]
                  shrink-0
                "
              >
                {att.type === 'image' ? <Image size={12} /> : <FileText size={12} />}
                <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {att.name}
                </span>
                <span className="text-[var(--gray-600)] text-[10px]">{att.size}</span>
                <button
                  className="
                    w-4 h-4 rounded-[4px] border-none
                    bg-white/[0.06] text-[var(--gray-500)]
                    flex items-center justify-center
                    cursor-pointer ml-0.5
                    active:bg-[rgba(239,68,68,0.2)] active:text-[var(--accent-red)]
                  "
                  onClick={() => removeAttachment(att.id)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Attach menu */}
        {showAttachMenu && (
          <div className="flex gap-1.5 fade-in">
            <button
              className="
                flex items-center gap-1.5
                py-2 px-3.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[12px] font-medium
                cursor-pointer transition-all duration-150
                font-[inherit]
                active:scale-[0.96] active:bg-[var(--bg-card-hover)]
              "
              onClick={() => addAttachment('image')}
            >
              <Image size={16} /> Фото
            </button>
            <button
              className="
                flex items-center gap-1.5
                py-2 px-3.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[12px] font-medium
                cursor-pointer transition-all duration-150
                font-[inherit]
                active:scale-[0.96] active:bg-[var(--bg-card-hover)]
              "
              onClick={() => addAttachment('file')}
            >
              <FileText size={16} /> Файл
            </button>
            <button
              className="
                flex items-center gap-1.5
                py-2 px-3.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[12px] font-medium
                cursor-pointer transition-all duration-150
                font-[inherit]
                active:scale-[0.96] active:bg-[var(--bg-card-hover)]
              "
              onClick={() => {
                setShowAttachMenu(false)
                haptic('light')
              }}
            >
              <Mic size={16} /> Голос
            </button>
          </div>
        )}

                {/* Input row */}
        <div className="flex items-center gap-2">
          <button
            className={`
              w-[38px] h-[38px] rounded-[10px] border-none
              flex items-center justify-center
              cursor-pointer transition-all duration-150
              shrink-0
              ${showAttachMenu
                ? 'bg-[rgba(250,204,21,0.1)] text-[var(--accent-yellow)]'
                : 'bg-white/[0.04] text-[var(--gray-500)]'
              }
              active:scale-[0.92]
            `}
            onClick={() => {
              setShowAttachMenu(!showAttachMenu)
              haptic('light')
            }}
          >
            <Paperclip size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              className="
                w-full py-[9px] px-3.5
                rounded-[var(--radius-sm)]
                border border-[var(--border-glass)]
                bg-white/[0.03]
                text-white text-[14px] font-[inherit]
                outline-none resize-none leading-[1.4]
                max-h-[120px]
                transition-[border-color] duration-200
                placeholder:text-[var(--gray-600)]
                focus:border-[rgba(250,204,21,0.2)]
              "
              placeholder="Написать сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>

          {isStreaming ? (
            <button
              className="
                w-[38px] h-[38px] rounded-[10px] border-none
                !bg-[var(--accent-red)]
                text-[var(--accent-yellow)]
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0
                active:scale-[0.92]
              "
              onClick={stopStreaming}
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              className="
                w-[38px] h-[38px] rounded-[10px] border-none
                bg-white/[0.04] text-[var(--accent-yellow)]
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0
                active:scale-[0.92]
                disabled:cursor-default disabled:opacity-50
              "
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}