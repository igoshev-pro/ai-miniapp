// src/components/SupportPage.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  HelpCircle,
  Send,
  Loader2,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

// --- Типы бекенда ---

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

interface BackendTicketMessage {
  role: 'user' | 'support'
  content: string
  createdAt: string
}

interface BackendTicket {
  _id: string
  userId: string
  subject: string
  messages: BackendTicketMessage[]
  status: TicketStatus
  priority: string
  assignedTo?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface TicketsListData {
  tickets: BackendTicket[]
  total: number
  page: number
  pages: number
}

// --- Типы фронтенда ---

interface Ticket {
  id: string
  subject: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

interface TicketMessage {
  id: string
  text: string
  sender: 'user' | 'admin'
  createdAt: string
}

// --- Маппинг ---

function mapTicketMessage(msg: BackendTicketMessage, index: number): TicketMessage {
  return {
    id: `msg-${index}-${new Date(msg.createdAt).getTime()}`,
    text: msg.content,
    sender: msg.role === 'support' ? 'admin' : 'user',
    createdAt: msg.createdAt,
  }
}

function mapTicket(bt: BackendTicket): Ticket {
  return {
    id: bt._id,
    subject: bt.subject,
    status: bt.status as TicketStatus,
    createdAt: bt.createdAt,
    updatedAt: bt.updatedAt,
    messages: (bt.messages || []).map(mapTicketMessage),
  }
}

// --- Конфигурация ---

type View = 'list' | 'ticket' | 'new'

const statusConfig: Record<TicketStatus, { label: string; icon: React.ReactNode; color: string }> = {
  open: { label: 'Открыт', icon: <Clock size={12} />, color: '#fbbf24' },
  in_progress: { label: 'В работе', icon: <Loader2 size={12} />, color: '#60a5fa' },
  resolved: { label: 'Решён', icon: <CheckCircle size={12} />, color: '#4ade80' },
  closed: { label: 'Закрыт', icon: <AlertCircle size={12} />, color: 'rgba(255,255,255,0.3)' },
}

// --- Компонент ---

interface Props {
  onBack?: () => void
}

export function SupportPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Новый тикет
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ответ в тикете
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Telegram BackButton ───────────────────────────
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      const handler = () => {
        if (view === 'ticket' || view === 'new') {
          setView('list')
        } else if (onBack) {
          onBack()
        }
      }
      webApp.BackButton.onClick(handler)
      return () => {
        webApp.BackButton.offClick(handler)
        webApp.BackButton.hide()
      }
    }
  }, [webApp, onBack, view])

  // Загрузить тикеты
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data } = await apiClient.get<ApiResponse<TicketsListData>>(
        ENDPOINTS.SUPPORT_TICKETS,
        { params: { page: 1, limit: 50 } },
      )

      const ticketsData = data.data
      // Бекенд может вернуть { tickets, total, page, pages } или массив напрямую
      const raw = ticketsData?.tickets || (Array.isArray(ticketsData) ? ticketsData : [])
      setTickets(raw.map(mapTicket))
    } catch {
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Скролл к последнему сообщению
  useEffect(() => {
    if (view === 'ticket') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeTicket?.messages, view])

  // Открыть тикет — используем данные из списка (нет отдельного GET /:id)
  const openTicket = useCallback(
    (ticket: Ticket) => {
      haptic('light')
      setActiveTicket(ticket)
      setView('ticket')
    },
    [haptic],
  )

  // Создать тикет
  const createTicket = useCallback(async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.warning('Заполните тему и сообщение')
      return
    }

    haptic('medium')
    setIsSubmitting(true)

    try {
      const { data } = await apiClient.post<ApiResponse<BackendTicket>>(
        ENDPOINTS.SUPPORT_TICKETS,
        {
          subject: newSubject.trim(),
          message: newMessage.trim(),
        },
      )

      const newTicket = mapTicket(data.data)
      setTickets((prev) => [newTicket, ...prev])
      setActiveTicket(newTicket)
      setView('ticket')
      setNewSubject('')
      setNewMessage('')
      hapticNotification('success')
      toast.success('Тикет создан')
    } catch (err) {
      if (isApiError(err)) {
        toast.error(err.message || 'Ошибка создания тикета')
      } else {
        toast.error('Ошибка соединения')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [newSubject, newMessage, haptic, hapticNotification])

  // Отправить ответ в тикет
  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !activeTicket) return

    haptic('light')
    setIsSending(true)

    try {
      // POST /support/tickets/:id/message с body { content: "..." }
      const { data } = await apiClient.post<ApiResponse<BackendTicket>>(
        `${ENDPOINTS.SUPPORT_TICKETS}/${activeTicket.id}/message`,
        { content: replyText.trim() },
      )

      // Бекенд возвращает обновлённый тикет целиком
      const updatedTicket = mapTicket(data.data)
      setActiveTicket(updatedTicket)

      // Обновляем в списке тоже
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)),
      )

      setReplyText('')
    } catch (err) {
      if (isApiError(err)) {
        toast.error(err.message || 'Ошибка отправки')
      } else {
        toast.error('Ошибка соединения')
      }
    } finally {
      setIsSending(false)
    }
  }, [replyText, activeTicket, haptic])

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ========== VIEWS ==========

  // Список тикетов
  if (view === 'list') {
    return (
      <div className="support-page">
        <div className="support-page__header fade-in fade-in--1">
          <div className="support-page__title">
            <HelpCircle size={18} />
            Поддержка
          </div>
          <button
            className="support-page__new-btn"
            onClick={() => {
              setView('new')
              haptic('light')
            }}
          >
            <Plus size={14} />
            Новый тикет
          </button>
        </div>

        <div className="support-page__list fade-in fade-in--2">
          {isLoading ? (
            <div className="chats-history__loading">
              <Loader2 size={20} className="spin" />
              <span>Загрузка...</span>
            </div>
          ) : tickets.length > 0 ? (
            tickets.map((ticket) => {
              const sc = statusConfig[ticket.status]
              const lastMsg = ticket.messages[ticket.messages.length - 1]
              return (
                <div
                  key={ticket.id}
                  className="support-ticket-row"
                  onClick={() => openTicket(ticket)}
                >
                  <div className="support-ticket-row__body">
                    <div className="support-ticket-row__top">
                      <span className="support-ticket-row__subject">{ticket.subject}</span>
                      <span
                        className="support-ticket-row__status"
                        style={{ color: sc.color }}
                      >
                        {sc.icon}
                        {sc.label}
                      </span>
                    </div>
                    <div className="support-ticket-row__bottom">
                      <span className="support-ticket-row__date">
                        {ticket.messages.length} сообщ.
                      </span>
                      <span className="support-ticket-row__date">·</span>
                      <span className="support-ticket-row__date">
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="support-ticket-row__arrow" />
                </div>
              )
            })
          ) : (
            <div className="favorites-page__empty">
              <MessageSquare size={32} />
              <div className="favorites-page__empty-title">Нет обращений</div>
              <div className="favorites-page__empty-text">
                Создайте тикет, если у вас есть вопрос
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Создание нового тикета
  if (view === 'new') {
    return (
      <div className="support-page">
        <div className="support-page__header fade-in fade-in--1">
          <button className="support-page__back" onClick={() => setView('list')}>
            <ArrowLeft size={18} />
          </button>
          <div className="support-page__header-info">
            <div className="support-page__title">Новое обращение</div>
          </div>
        </div>

        <div className="support-new fade-in fade-in--2">
          {/* Тема */}
          <div className="support-new__field">
            <label className="support-new__label">Тема</label>
            <input
              type="text"
              className="support-new__input"
              placeholder="Кратко опишите проблему"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Сообщение */}
          <div className="support-new__field">
            <label className="support-new__label">Сообщение</label>
            <textarea
              className="support-new__textarea"
              placeholder="Подробно опишите проблему. Укажите модель, что делали, что ожидали получить..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={5}
            />
          </div>

          <button
            className="support-new__submit"
            onClick={createTicket}
            disabled={!newSubject.trim() || !newMessage.trim() || isSubmitting}
          >
            {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Отправить
          </button>
        </div>
      </div>
    )
  }

  // Просмотр тикета
  if (view === 'ticket' && activeTicket) {
    const sc = statusConfig[activeTicket.status]
    const isClosed = activeTicket.status === 'closed' || activeTicket.status === 'resolved'

    return (
      <div className="support-page support-page--ticket">
        <div className="support-page__header fade-in fade-in--1">
          <button className="support-page__back" onClick={() => setView('list')}>
            <ArrowLeft size={18} />
          </button>
          <div className="support-page__header-info">
            <div className="support-page__title">{activeTicket.subject}</div>
            <span className="support-page__status" style={{ color: sc.color }}>
              {sc.icon} {sc.label}
            </span>
          </div>
        </div>

        <div className="support-messages fade-in fade-in--2">
          {activeTicket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`support-msg ${msg.sender === 'user' ? 'support-msg--user' : 'support-msg--admin'}`}
            >
              <div className="support-msg__bubble">
                <div className="support-msg__text">{msg.text}</div>
                <div className="support-msg__time">{formatDate(msg.createdAt)}</div>
              </div>
              {msg.sender === 'admin' && (
                <div className="support-msg__sender">Поддержка</div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {!isClosed && (
          <div className="support-reply">
            <div className="chat-input__row">
              <div className="chat-input__field-wrap">
                <textarea
                  className="chat-input__field"
                  placeholder="Написать..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={1}
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                />
              </div>
              <button
                className="chat-input__send"
                onClick={sendReply}
                disabled={!replyText.trim() || isSending}
              >
                {isSending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="support-closed-notice">
            Тикет {activeTicket.status === 'resolved' ? 'решён' : 'закрыт'}
          </div>
        )}
      </div>
    )
  }

  return null
}