'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useChat } from '@/hooks'
import { useUser } from '@/hooks'
import { MessageContent } from '@/components/ui/MessageContent'
import { allModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

interface Attachment {
  id: string
  name: string
  type: 'image' | 'file'
  size: string
}

const textModels = allModels.filter((m) => m.category === 'text')

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

export function ChatPage({ initialModel, chatId: existingChatId, onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const {
    messages,
    messagesLoaded,
    isStreaming,
    streamingContent,
    activeChatId,
    sendMessage: sendChatMessage,
    stopStreaming,
    createChat,
    loadMessages,
  } = useChat()

  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(initialModel || 'ChatGPT 4o')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const currentModel = textModels.find((m) => m.name === selectedModel)
  const modelSlug = currentModel?.slug || 'gpt-4o'
  const modelCost = currentModel?.cost || 1

  useEffect(() => {
    if (existingChatId) {
      loadMessages(existingChatId)
    }
  }, [existingChatId, loadMessages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      const handler = () => { if (onBack) onBack() }
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

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
    if (isStreaming || isInitializing) return

    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')

    const fullText = text +
      (attachments.length > 0 ? `\n\n📎 ${attachments.map((a) => a.name).join(', ')}` : '')

    setInput('')
    setAttachments([])
    setShowAttachMenu(false)

    let chatId = activeChatId

    if (!chatId) {
      setIsInitializing(true)
      const newChat = await createChat(modelSlug)
      setIsInitializing(false)
      if (!newChat) return
      chatId = newChat.id
    }

    await sendChatMessage(chatId, modelSlug, fullText)
    hapticNotification('success')
  }, [
    input, attachments, isStreaming, isInitializing, balance, modelCost,
    activeChatId, modelSlug, haptic, hapticNotification,
    createChat, sendChatMessage,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopiedId(id)
    haptic('light')
    setTimeout(() => setCopiedId(null), 2000)
  }, [haptic])

  const addAttachment = useCallback((type: 'image' | 'file') => {
    haptic('light')
    setAttachments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: type === 'image'
          ? `photo_${Math.floor(Math.random() * 1000)}.jpg`
          : `doc_${Math.floor(Math.random() * 1000)}.pdf`,
        type,
        size: type === 'image' ? '2.4 MB' : '156 KB',
      },
    ])
    setShowAttachMenu(false)
  }, [haptic])

  const removeAttachment = useCallback((id: string) => {
    haptic('light')
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [haptic])

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
          <span>{selectedModel}</span>
          <span className="chat-model-selector__cost">{modelCost} 🔥</span>
          <ChevronDown
            size={14}
            className={`chat-model-selector__chevron ${
              showModelPicker ? 'chat-model-selector__chevron--open' : ''
            }`}
          />
        </button>
      </div>

      {showModelPicker && (
        <div className="chat-model-dropdown fade-in">
          {textModels.map((m) => (
            <button
              key={m.id}
              className={`chat-model-option ${
                selectedModel === m.name ? 'chat-model-option--active' : ''
              }`}
              onClick={() => {
                setSelectedModel(m.name)
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
                {selectedModel === m.name && (
                  <Check size={14} className="chat-model-option__check" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Сообщения */}
      <div className="chat-page__messages">
        {/* Empty state для нового чата */}
        {!hasMessages && !isStreaming && (
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

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${
              msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--ai'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="chat-msg__model-tag">{msg.model || selectedModel}</div>
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
            <div className="chat-msg__model-tag">{selectedModel}</div>
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
                <button className="chat-attach-chip__remove" onClick={() => removeAttachment(att.id)}>
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
              onClick={() => { setShowAttachMenu(false); haptic('light') }}
            >
              <Mic size={16} /> Голос
            </button>
          </div>
        )}

        <div className="chat-input__row">
          <button
            className={`chat-input__attach ${showAttachMenu ? 'chat-input__attach--active' : ''}`}
            onClick={() => { setShowAttachMenu(!showAttachMenu); haptic('light') }}
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
              disabled={isInitializing}
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
              disabled={(!input.trim() && attachments.length === 0) || isInitializing}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}