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

// ─── Вспомогательная функция (вне компонента, без хуков) ───
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

  // ─── Store selectors (стабильные, без пересоздания объектов) ───
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const activeChatId = useChatStore((s) => s.activeChatId)

  // ─── Модели ───
  const storeModels = useModelsStore((s) => s.models)
  const allModels = storeModels.length > 0 ? storeModels : fallbackModels
  const textModels = useMemo(() => allModels.filter((m) => m.category === 'text'), [allModels])

  // ─── Резолв модели (один раз при маунте) ───
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

  // Текущая модель
  const currentModel = useMemo(
    () => allModels.find((m) => m.name === selectedModelName) || initialResolved,
    [allModels, selectedModelName, initialResolved],
  )
  const modelSlug = currentModel?.slug || 'gpt-4o'
  const modelCost = currentModel?.cost || 1

  useEffect(() => {
    console.log('🔍 DEBUG MODELS:', {
      selectedModelName,     // Что выбрано в UI
      currentModel,          // Объект модели
      modelSlug,            // Что отправляется на бэкенд
      allModels: allModels.slice(0, 3).map(m => ({ 
        name: m.name, 
        slug: m.slug 
      })),
    });
  }, [selectedModelName, currentModel, modelSlug]);

  // ─── Загрузка сообщений (один раз) ───
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
      .catch(() => {
        toast.error('Не удалось загрузить сообщения')
      })
      .finally(() => {
        setIsLoadingMessages(false)
      })
  }, [existingChatId])

  // ─── Scroll to bottom ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // ─── Telegram BackButton ───
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

  // ─── Auto-resize textarea ───
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

  // ─── Send message ───
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

    const fullText =
      text +
      (attachments.length > 0 ? `\n\n📎 ${attachments.map((a) => a.name).join(', ')}` : '')

    setInput('')
    setAttachments([])
    setShowAttachMenu(false)

    const store = useChatStore.getState()
    const currentActiveChatId = store.activeChatId
    const chatIdToSend =
      currentActiveChatId && !currentActiveChatId.startsWith('pending-')
        ? currentActiveChatId
        : null

    // Add user message
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

    console.log('📤 SENDING TO BACKEND:', {
      modelSlug,
      content: fullText.substring(0, 50) + '...',
      conversationId: chatIdToSend,
    });

    // Start SSE stream
    abortRef.current = streamChat(
      {
        conversationId: chatIdToSend || undefined,
        modelSlug,
        content: fullText,
      },
      {
        onConversation: (data) => {
          store.setActiveChatId(data.id) // теперь безопасно - просто меняет ID
        
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
        onToken: (token) => {
          store.appendStreamingContent(token)
        },
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

  // ─── Stop streaming ───
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
          name:
            type === 'image'
              ? `photo_${Math.floor(Math.random() * 1000)}.jpg`
              : `doc_${Math.floor(Math.random() * 1000)}.pdf`,
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
    <div className="chat-page">
      {/* Модель */}
      <div className="chat-page__model-bar fade-in fade-in--1">
        <button
          className="chat-model-selector"
          onClick={() => {
            if (!isStreaming) {
              setShowModelPicker(!showModelPicker)
              haptic('light')
            }
          }}
        >
          <MessageSquare size={14} />
          <span>{selectedModelName}</span>
          <span className="chat-model-selector__cost">{modelCost} 🔥</span>
          <ChevronDown
            size={14}
            className={`chat-model-selector__chevron ${
              showModelPicker ? 'chat-model-selector__chevron--open' : ''
            }`}
          />
        </button>

        {activeChatId && !activeChatId.startsWith('pending-') && (
          <button
            className="chat-page__favorite-btn"
            onClick={() => {
              haptic('light')
              toggleFavorite('conversation', activeChatId, selectedModelName)
            }}
          >
            <Star size={16} />
          </button>
        )}
      </div>

      {showModelPicker && (
        <div className="chat-model-dropdown fade-in">
          {textModels.map((m) => (
            <button
              key={m.id}
              className={`chat-model-option ${
                selectedModelName === m.name ? 'chat-model-option--active' : ''
              }`}
              onClick={() => {
                setSelectedModelName(m.name)
                setShowModelPicker(false)
                haptic('light')
              }}
            >
              <div className="chat-model-option__info">
                <span className="chat-model-option__name">{m.name}</span>
                <span className="chat-model-option__provider">{m.provider}</span>
              </div>
              <div className="chat-model-option__right">
                <span className="chat-model-option__cost">{m.cost} 🔥</span>
                {selectedModelName === m.name && (
                  <Check size={14} className="chat-model-option__check" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Сообщения */}
      <div className="chat-page__messages">
        {!hasMessages && !isStreaming && !isLoadingMessages && (
          <div className="chat-page__empty fade-in fade-in--2">
            <div className="chat-page__empty-icon">
              <MessageSquare size={36} strokeWidth={1.5} />
            </div>
            <div className="chat-page__empty-title">Чат с ИИ</div>
            <div className="chat-page__empty-text">
              Задайте вопрос, попросите помощь с кодом, текстом или переводом. ИИ готов помочь.
            </div>
            <button className="chat-page__example-btn" onClick={insertExample}>
              <Wand2 size={14} /> Пример промпта
            </button>
          </div>
        )}

        {isLoadingMessages && (
          <div className="chat-page__empty">
            <div className="chat-typing">
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--ai'}`}
          >
            {msg.role === 'assistant' && (
              <div className="chat-msg__model-tag">{msg.model || selectedModelName}</div>
            )}
            <div className="chat-msg__bubble">
              {msg.role === 'assistant' ? (
                <MessageContent content={msg.content} />
              ) : (
                <div className="chat-msg__text">{msg.content}</div>
              )}
            </div>
            <div className="chat-msg__footer">
              <span className="chat-msg__time">{formatTime(msg.createdAt)}</span>
              {msg.role === 'assistant' && (
                <div className="chat-msg__actions">
                  <button
                    className="chat-msg__action"
                    onClick={() => copyMessage(msg.id, msg.content)}
                  >
                    {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {msg.tokensUsed && (
                    <span className="chat-msg__tokens">{msg.tokensUsed} 🔥</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="chat-msg chat-msg--ai">
            <div className="chat-msg__model-tag">{selectedModelName}</div>
            <div className="chat-msg__bubble">
              {streamingContent ? (
                <div className="msg-streaming-cursor">
                  <MessageContent content={streamingContent} />
                </div>
              ) : (
                <div className="chat-typing">
                  <span className="chat-typing__dot" />
                  <span className="chat-typing__dot" />
                  <span className="chat-typing__dot" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Зона ввода */}
      <div className="chat-page__input-area">
        {attachments.length > 0 && (
          <div className="chat-page__attachments">
            {attachments.map((att) => (
              <div key={att.id} className="chat-attach-chip">
                {att.type === 'image' ? <Image size={12} /> : <FileText size={12} />}
                <span className="chat-attach-chip__name">{att.name}</span>
                <span className="chat-attach-chip__size">{att.size}</span>
                <button
                  className="chat-attach-chip__remove"
                  onClick={() => removeAttachment(att.id)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAttachMenu && (
          <div className="chat-page__attach-menu fade-in">
            <button className="chat-attach-menu__item" onClick={() => addAttachment('image')}>
              <Image size={16} /> Фото
            </button>
            <button className="chat-attach-menu__item" onClick={() => addAttachment('file')}>
              <FileText size={16} /> Файл
            </button>
            <button
              className="chat-attach-menu__item"
              onClick={() => {
                setShowAttachMenu(false)
                haptic('light')
              }}
            >
              <Mic size={16} /> Голос
            </button>
          </div>
        )}

        <div className="chat-input__row">
          <button
            className={`chat-input__attach ${showAttachMenu ? 'chat-input__attach--active' : ''}`}
            onClick={() => {
              setShowAttachMenu(!showAttachMenu)
              haptic('light')
            }}
          >
            <Paperclip size={18} />
          </button>

          <div className="chat-input__field-wrap">
            <textarea
              ref={inputRef}
              className="chat-input__field"
              placeholder="Написать сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>

          {isStreaming ? (
            <button className="chat-input__send chat-input__send--stop" onClick={stopStreaming}>
              <Square size={18} />
            </button>
          ) : (
            <button
              className="chat-input__send"
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