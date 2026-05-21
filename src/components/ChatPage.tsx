'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  Paperclip,
  Send,
  Square,
  Image as ImageIcon,
  Mic,
  X,
  Check,
  Copy,
  Wand2,
  MessageSquare,
  Star,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useUser, useFavorites } from '@/hooks'
import { useChatStore, type ChatMessage } from '@/stores/chat.store'
import { useModelsStore } from '@/stores/models.store'
import {
  apiClient,
  ENDPOINTS,
  streamChat,
  uploadImage,
  validateImageFile,
} from '@/lib/api'
import { useUserStore } from '@/stores/user.store'
import { MessageContent } from '@/components/ui/MessageContent'
import { allModels as fallbackModels } from '@/lib/data'
import { toast } from '@/stores/toast.store'

// ─── Типы для прикреплённых изображений ───
interface ImageAttachment {
  id: string
  file: File
  previewUrl: string         // blob: URL для локального превью
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number           // 0..100
  remoteUrl?: string         // URL после загрузки на S3
  errorMessage?: string
  abortController?: AbortController
}

const MAX_IMAGES = 10

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
  const { toggle: toggleFavorite, isFavorite } = useFavorites()

  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const activeChatId = useChatStore((s) => s.activeChatId)

  const storeModels = useModelsStore((s) => s.models)
  const allModels = storeModels.length > 0 ? storeModels : fallbackModels
  const textModels = useMemo(
    () => allModels.filter((m) => m.category === 'text'),
    [allModels],
  )

  const initialResolved = useMemo(
    () => resolveModelStatic(initialModel),
    [initialModel],
  )

  const [input, setInput] = useState('')
  const [selectedModelName, setSelectedModelName] = useState(
    initialResolved?.name || 'ChatGPT 4o',
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const didLoadRef = useRef(false)

  const currentModel = useMemo(
    () =>
      allModels.find((m) => m.name === selectedModelName) || initialResolved,
    [allModels, selectedModelName, initialResolved],
  )
  const modelSlug = currentModel?.slug || 'gpt-4o'
  const modelCost = currentModel?.cost || 1
  // 🆕 Поддержка vision у текущей модели
  const supportsVision = currentModel?.supportsVision ?? false

  const isCurrentChatFavorite = useMemo(() => {
    if (!activeChatId || activeChatId.startsWith('pending-')) return false
    return isFavorite('conversation', activeChatId)
  }, [activeChatId, isFavorite])

  // ─── Загрузка сообщений ───
  useEffect(() => {
    if (!existingChatId || didLoadRef.current) return
    didLoadRef.current = true
    setIsLoadingMessages(true)
    const store = useChatStore.getState()
    store.switchChat(existingChatId)
    apiClient
      .get(ENDPOINTS.CHAT_MESSAGES(existingChatId), {
        params: { page: 1, limit: 50 },
      })
      .then(({ data }: any) => {
        const msgs = (data.data?.messages || [])
          .filter((m: any) => !m.isStreaming && !m.isError)
          .map(
            (msg: any): ChatMessage => ({
              id: msg._id,
              chatId: msg.conversationId,
              role: msg.role === 'system' ? 'assistant' : msg.role,
              content: msg.content,
              imageUrls: Array.isArray(msg.imageUrls) ? msg.imageUrls : undefined,
              model: msg.modelSlug ? getModelName(msg.modelSlug) : undefined,
              tokensUsed: msg.tokensCost || msg.usage?.totalTokens,
              createdAt: msg.createdAt,
            }),
          )
        store.setMessages(msgs)
      })
      .catch(() => toast.error('Не удалось загрузить сообщения'))
      .finally(() => setIsLoadingMessages(false))
  }, [existingChatId])

  // Автоскролл вниз
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTop = el.scrollHeight
    }
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
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  // 🆕 Очистка blob URL при размонтировании
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatTime(dateStr?: string) {
    const d = dateStr ? new Date(dateStr) : new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  // ─── Работа с картинками ───────────────────────────────────

  const startUpload = useCallback((attachment: ImageAttachment) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === attachment.id
          ? { ...img, status: 'uploading', progress: 0 }
          : img,
      ),
    )

    const ctrl = new AbortController()

    uploadImage(attachment.file, {
      signal: ctrl.signal,
      onProgress: (p) => {
        setImages((prev) =>
          prev.map((img) =>
            img.id === attachment.id ? { ...img, progress: p.percent } : img,
          ),
        )
      },
    })
      .then((result) => {
        setImages((prev) =>
          prev.map((img) =>
            img.id === attachment.id
              ? {
                  ...img,
                  status: 'done',
                  progress: 100,
                  remoteUrl: result.url,
                }
              : img,
          ),
        )
      })
      .catch((err: Error) => {
        if (err.message === 'Загрузка отменена') return
        setImages((prev) =>
          prev.map((img) =>
            img.id === attachment.id
              ? { ...img, status: 'error', errorMessage: err.message }
              : img,
          ),
        )
        toast.error(err.message || 'Ошибка загрузки изображения')
        hapticNotification('error')
      })

    // сохраняем abort controller
    setImages((prev) =>
      prev.map((img) =>
        img.id === attachment.id ? { ...img, abortController: ctrl } : img,
      ),
    )
  }, [hapticNotification])

  const handleFilesSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const files = Array.from(fileList)
      const currentCount = images.length
      const available = MAX_IMAGES - currentCount

      if (available <= 0) {
        toast.warning(`Максимум ${MAX_IMAGES} изображений`)
        hapticNotification('error')
        return
      }

      const toProcess = files.slice(0, available)
      if (files.length > available) {
        toast.warning(`Добавлено ${available} из ${files.length}. Лимит ${MAX_IMAGES}.`)
      }

      const newAttachments: ImageAttachment[] = []
      for (const file of toProcess) {
        const validationError = validateImageFile(file)
        if (validationError) {
          toast.error(`${file.name}: ${validationError}`)
          continue
        }
        newAttachments.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
        })
      }

      if (newAttachments.length === 0) return

      setImages((prev) => [...prev, ...newAttachments])
      haptic('light')

      // Запускаем загрузку каждого
      newAttachments.forEach((att) => startUpload(att))
    },
    [images.length, haptic, hapticNotification, startUpload],
  )

  const removeImage = useCallback((id: string) => {
    haptic('light')
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target) {
        // отменяем загрузку если идёт
        target.abortController?.abort()
        if (target.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl)
        }
      }
      return prev.filter((img) => img.id !== id)
    })
  }, [haptic])

  const retryImage = useCallback(
    (id: string) => {
      const target = images.find((img) => img.id === id)
      if (!target) return
      haptic('light')
      startUpload(target)
    },
    [images, haptic, startUpload],
  )

  const openFilePicker = useCallback(() => {
    haptic('light')
    setShowAttachMenu(false)
    fileInputRef.current?.click()
  }, [haptic])

  // ─── Отправка сообщения ────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim()
    const hasImages = images.length > 0

    if (!text && !hasImages) return
    if (isStreaming) return

    // 🆕 Проверка vision-совместимости
    if (hasImages && !supportsVision) {
      toast.warning(
        `Модель "${selectedModelName}" не поддерживает изображения. Выберите GPT-4o, Claude, Gemini или Grok.`,
      )
      hapticNotification('error')
      return
    }

    // 🆕 Дождаться завершения загрузки всех картинок
    const stillUploading = images.some((img) => img.status === 'uploading' || img.status === 'pending')
    if (stillUploading) {
      toast.warning('Дождитесь загрузки всех изображений')
      return
    }

    // 🆕 Если есть ошибки загрузки — не отправляем
    const hasErrors = images.some((img) => img.status === 'error')
    if (hasErrors) {
      toast.error('Удалите или повторите загрузку проблемных изображений')
      hapticNotification('error')
      return
    }

    if (balance < modelCost) {
      toast.warning(`Недостаточно спичек. Нужно ${modelCost}, у вас ${balance}`)
      hapticNotification('error')
      return
    }

    haptic('medium')

        // 🆕 Собираем URL загруженных картинок
    const imageUrls = images
      .filter((img) => img.status === 'done' && img.remoteUrl)
      .map((img) => img.remoteUrl!) as string[]

    // Очищаем blob URLs и стейт картинок
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl)
      }
    })

    setInput('')
    setImages([])
    setShowAttachMenu(false)

    const store = useChatStore.getState()
    const currentActiveChatId = store.activeChatId
    const chatIdToSend =
      currentActiveChatId && !currentActiveChatId.startsWith('pending-')
        ? currentActiveChatId
        : null

    // Сообщение пользователя (с картинками если есть)
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      chatId: chatIdToSend || 'pending',
      role: 'user',
      content: text,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      createdAt: new Date().toISOString(),
    }
    store.addMessage(userMessage)
    store.setStreaming(true)
    store.setStreamingContent('')

    abortRef.current = streamChat(
      {
        conversationId: chatIdToSend || undefined,
        modelSlug,
        content: text,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
      {
        onConversation: (data) => {
          store.setActiveChatId(data.id)
          const exists = useChatStore
            .getState()
            .chats.find((c) => c.id === data.id)
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
              const newBonus = Math.max(
                0,
                userState.user.bonusTokens - data.tokensUsed,
              )
              const usedFromBonus = userState.user.bonusTokens - newBonus
              const usedFromMain = data.tokensUsed - usedFromBonus
              const newMain = Math.max(
                0,
                userState.user.tokenBalance - usedFromMain,
              )
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
  }, [
    input,
    images,
    isStreaming,
    balance,
    modelCost,
    modelSlug,
    supportsVision,
    selectedModelName,
    haptic,
    hapticNotification,
  ])

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

  const insertExample = useCallback(() => {
    setInput(examplePrompts[Math.floor(Math.random() * examplePrompts.length)])
    haptic('light')
  }, [haptic])

  const hasMessages = messages.length > 0

  // 🆕 Состояние кнопки Send
  const canSend = useMemo(() => {
    if (isStreaming) return false
    if (!input.trim() && images.length === 0) return false
    // Если есть картинки — все должны быть загружены
    if (images.length > 0) {
      const allDone = images.every((img) => img.status === 'done')
      if (!allDone) return false
    }
    return true
  }, [isStreaming, input, images])

  return (
    <div
      className="
      fs-page
        fixed inset-0 z-[5] flex flex-col
        bg-[var(--bg-primary,#08080a)]
        pt-[calc(var(--header-height)+var(--safe-area-top,0px))]
      "
    >
      {/* Скрытый file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files)
          // сбрасываем input чтобы можно было выбрать тот же файл снова
          e.target.value = ''
        }}
      />

      {/* ── Model bar ── */}
      <div
        className="
        fs-page__bar
          shrink-0 relative z-40
          flex items-center gap-2
          px-4 pt-2.5 pb-1.5
          bg-[rgba(8,8,10,0.95)]
          backdrop-blur-[24px] [-webkit-backdrop-filter:blur(24px)]
          border-b border-white/[0.04]
        "
      >
        <button
          className="
            flex-1 min-w-0
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
          <MessageSquare size={14} className="text-[var(--gray-500)] shrink-0" />
          <span className="truncate">{selectedModelName}</span>
          <span className="text-[11px] text-white/40 ml-auto shrink-0">
            {modelCost % 1 === 0 ? modelCost : modelCost.toFixed(2)} 🔥
          </span>
          <ChevronDown
            size={14}
            className={`
              text-[var(--gray-500)] transition-transform duration-200 shrink-0
              ${showModelPicker ? 'rotate-180' : ''}
            `}
          />
        </button>

        {activeChatId && !activeChatId.startsWith('pending-') && (
          <button
            className={`
              w-9 h-9 rounded-[9px]
              border border-[var(--border-glass)]
              backdrop-blur-[20px] [-webkit-backdrop-filter:var(--blur)]
              flex items-center justify-center
              cursor-pointer transition-all duration-150
              shrink-0 [-webkit-tap-highlight-color:transparent]
              active:scale-[0.9]
              ${
                isCurrentChatFavorite
                  ? 'bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.3)] text-[var(--accent-yellow)]'
                  : 'bg-[var(--bg-glass)] text-[var(--gray-500)]'
              }
            `}
            onClick={() => {
              haptic('light')
              toggleFavorite('conversation', activeChatId, selectedModelName)
            }}
          >
            <Star size={16} fill={isCurrentChatFavorite ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* Model dropdown */}
        {showModelPicker && (
          <div
            className="
              fade-in
              absolute top-[calc(100%+2px)] left-4 right-4 z-50
              rounded-[var(--radius-sm)]
              border border-[var(--border-glass)]
              bg-[var(--bg-glass-heavy)]
              backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
              overflow-hidden max-h-[400px] overflow-y-auto
            "
          >
            {textModels.map((m) => {
              const mVision = m.supportsVision
              return (
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
                    <span className="font-semibold flex items-center gap-1.5">
                      {m.name}
                      {mVision && (
                        <span className="text-[9px] px-1 py-px rounded bg-[rgba(250,204,21,0.12)] text-[var(--accent-yellow)] font-bold">
                          👁
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-[var(--gray-600)]">
                      {m.provider}
                    </span>
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
              )
            })}
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div
  ref={messagesContainerRef}
  className="
    fs-page__scroll
    flex-1 min-h-0 overflow-y-auto
    overscroll-contain [-webkit-overflow-scrolling:touch]
  "
>
        <div className="flex flex-col gap-3.5 px-4 py-3">
          {/* Empty state */}
          {!hasMessages && !isStreaming && !isLoadingMessages && (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center fade-in fade-in--2">
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
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-[60px] text-center">
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
                ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}
              `}
            >
              {msg.role === 'assistant' && (
                <div className="text-[10px] font-semibold text-[var(--gray-600)] mb-1 pl-0.5">
                  {msg.model || selectedModelName}
                </div>
              )}

              {/* 🆕 Превью картинок в user-сообщении СВЕРХУ */}
              {msg.role === 'user' && msg.imageUrls && msg.imageUrls.length > 0 && (
                <div
                  className={`
                    grid gap-1 mb-1
                    ${msg.imageUrls.length === 1 ? 'grid-cols-1' : ''}
                    ${msg.imageUrls.length === 2 ? 'grid-cols-2' : ''}
                    ${msg.imageUrls.length >= 3 ? 'grid-cols-3' : ''}
                    ${msg.content ? 'rounded-[var(--radius-sm)] rounded-br-[4px] overflow-hidden' : ''}
                  `}
                  style={{
                    maxWidth: msg.imageUrls.length === 1 ? 240 : 280,
                  }}
                >
                  {msg.imageUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-square overflow-hidden bg-black/30 rounded-[8px]"
                    >
                      <img
                        src={url}
                        alt={`attachment-${i}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Текстовый «пузырь» (показываем только если есть текст) */}
              {msg.content && (
                <div
                  className={`
                    py-2.5 px-3.5 rounded-[var(--radius-sm)] leading-[1.55] text-[13.5px]
                    ${
                      msg.role === 'user'
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
              )}

              <div className="flex items-center gap-2 mt-1 px-0.5">
                <span className="text-[10px] text-[var(--gray-600)]">
                  {formatTime(msg.createdAt)}
                </span>
                {msg.role === 'assistant' && msg.content && (
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
                      <span className="text-[10px] text-white/30 ml-1">
                        {msg.tokensUsed} 🔥
                      </span>
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
      </div>

      {/* ── Input area ── */}
      <div
        className="
        fs-page__input
          shrink-0 flex flex-col gap-2
          px-2.5 pt-2.5 pb-4
          mb-[calc(59px+var(--safe-bottom))]
          border-t border-[var(--border-glass)]
          bg-[var(--bg-glass-heavy)]
          backdrop-blur-[40px] [-webkit-backdrop-filter:var(--blur-heavy)]
        "
      >
        {/* 🆕 Превью загружаемых картинок (Вариант A) */}
        {images.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] pb-0.5">
            {images.map((img) => (
              <div
                key={img.id}
                className="
                  relative shrink-0
                  w-[60px] h-[60px] rounded-[10px]
                  overflow-hidden
                  bg-black/30
                  border border-[var(--border-glass)]
                "
              >
                <img
                  src={img.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />

                {/* Overlay: загрузка */}
                {img.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Loader2 size={16} className="text-white animate-spin" />
                      <span className="text-[9px] text-white font-semibold">
                        {img.progress}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlay: pending (ожидание старта) */}
                {img.status === 'pending' && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <Loader2 size={16} className="text-white/80 animate-spin" />
                  </div>
                )}

                {/* Overlay: ошибка */}
                {img.status === 'error' && (
                  <button
                    onClick={() => retryImage(img.id)}
                    className="absolute inset-0 bg-[rgba(239,68,68,0.7)] flex items-center justify-center cursor-pointer"
                    title={img.errorMessage || 'Ошибка'}
                  >
                    <AlertCircle size={20} className="text-white" />
                  </button>
                )}

                {/* Success checkmark (быстро мигает) */}
                {img.status === 'done' && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[var(--accent-yellow)] flex items-center justify-center">
                    <Check size={10} className="text-[#0a0a0a]" strokeWidth={3} />
                  </div>
                )}

                {/* Кнопка удалить (всегда поверх) */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="
                    absolute top-0.5 right-0.5
                    w-[18px] h-[18px] rounded-full
                    bg-black/70 hover:bg-black/90
                    flex items-center justify-center
                    cursor-pointer
                    [-webkit-tap-highlight-color:transparent]
                    active:scale-[0.85]
                  "
                >
                  <X size={11} className="text-white" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

                {/* 🆕 Подсказка для не-vision модели когда есть картинки */}
        {images.length > 0 && !supportsVision && (
          <div
            className="
              flex items-center gap-1.5
              py-1.5 px-2.5
              rounded-[var(--radius-xs)]
              bg-[rgba(239,68,68,0.08)]
              border border-[rgba(239,68,68,0.2)]
              text-[var(--accent-red)] text-[11px]
            "
          >
            <AlertCircle size={12} className="shrink-0" />
            <span className="leading-tight">
              Модель «{selectedModelName}» не поддерживает изображения. Выберите модель со
              значком 👁
            </span>
          </div>
        )}

        {/* Attach menu */}
        {showAttachMenu && (
          <div className="flex gap-1.5 fade-in">
            <button
              className={`
                flex items-center gap-1.5
                py-2 px-3.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-400)] text-[12px] font-medium
                cursor-pointer transition-all duration-150
                font-[inherit]
                active:scale-[0.96] active:bg-[var(--bg-card-hover)]
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
              onClick={openFilePicker}
              disabled={images.length >= MAX_IMAGES}
            >
              <ImageIcon size={16} /> Фото
              {images.length > 0 && (
                <span className="text-[10px] text-[var(--gray-600)] ml-0.5">
                  {images.length}/{MAX_IMAGES}
                </span>
              )}
            </button>
            <button
              className="
                flex items-center gap-1.5
                py-2 px-3.5
                rounded-[var(--radius-xs)]
                border border-[var(--border-glass)]
                bg-[var(--bg-glass)]
                text-[var(--gray-500)] text-[12px] font-medium
                cursor-not-allowed opacity-50
                font-[inherit]
              "
              disabled
              title="Скоро"
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
              shrink-0 self-center
              ${
                showAttachMenu
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

          <textarea
            ref={inputRef}
            className="
              flex-1 min-w-0 block align-middle
              py-[9px] px-3.5
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
            placeholder={
              images.length > 0
                ? 'Опишите что нужно сделать с изображением...'
                : 'Написать сообщение...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          {isStreaming ? (
            <button
              className="
                w-[38px] h-[38px] rounded-[10px] border-none
                bg-[var(--accent-red)]
                text-[var(--accent-yellow)]
                flex items-center justify-center
                cursor-pointer transition-all duration-150
                shrink-0 self-center
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
                shrink-0 self-center
                active:scale-[0.92]
                disabled:cursor-default disabled:opacity-50
              "
              onClick={handleSend}
              disabled={!canSend}
            >
              <Send size={18} className="-ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}