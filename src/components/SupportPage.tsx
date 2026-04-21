// src/components/SupportPage.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  HelpCircle, Send, Loader2, MessageSquare, Plus,
  Clock, CheckCircle, AlertCircle, ChevronRight, ArrowLeft,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { toast } from '@/stores/toast.store'

/* ─── Backend types ─── */

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

interface ApiResponse<T> { success: boolean; data: T }

interface TicketsListData {
  tickets: BackendTicket[]
  total: number
  page: number
  pages: number
}

/* ─── Frontend types ─── */

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

/* ─── Mapping ─── */

function mapMsg(m: BackendTicketMessage, i: number): TicketMessage {
  return {
    id: `msg-${i}-${new Date(m.createdAt).getTime()}`,
    text: m.content,
    sender: m.role === 'support' ? 'admin' : 'user',
    createdAt: m.createdAt,
  }
}

function mapTicket(bt: BackendTicket): Ticket {
  return {
    id: bt._id,
    subject: bt.subject,
    status: bt.status,
    createdAt: bt.createdAt,
    updatedAt: bt.updatedAt,
    messages: (bt.messages || []).map(mapMsg),
  }
}

/* ─── Config ─── */

type View = 'list' | 'ticket' | 'new'

const STATUS: Record<TicketStatus, { label: string; icon: React.ReactNode; color: string }> = {
  open:        { label: 'Открыт',  icon: <Clock size={12} />,       color: '#fbbf24' },
  in_progress: { label: 'В работе', icon: <Loader2 size={12} />,    color: '#60a5fa' },
  resolved:    { label: 'Решён',   icon: <CheckCircle size={12} />, color: '#4ade80' },
  closed:      { label: 'Закрыт',  icon: <AlertCircle size={12} />, color: 'rgba(255,255,255,0.3)' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/* ─── Component ─── */

interface Props { onBack?: () => void }

export function SupportPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [active, setActive] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  /* Telegram back button */
  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const h = () => {
      if (view === 'ticket' || view === 'new') setView('list')
      else onBack?.()
    }
    webApp.BackButton.onClick(h)
    return () => { webApp.BackButton.offClick(h); webApp.BackButton.hide() }
  }, [webApp, onBack, view])

  /* Load tickets */
  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get<ApiResponse<TicketsListData>>(
        ENDPOINTS.SUPPORT_TICKETS, { params: { page: 1, limit: 50 } },
      )
      const d = data.data
      const raw = d?.tickets || (Array.isArray(d) ? d : [])
      setTickets(raw.map(mapTicket))
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  /* Scroll to bottom */
  useEffect(() => {
    if (view === 'ticket') endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages, view])

  /* Open ticket */
  const open = useCallback((t: Ticket) => {
    haptic('light'); setActive(t); setView('ticket')
  }, [haptic])

  /* Create ticket */
  const create = useCallback(async () => {
    if (!subject.trim() || !message.trim()) { toast.warning('Заполните тему и сообщение'); return }
    haptic('medium'); setSubmitting(true)
    try {
      const { data } = await apiClient.post<ApiResponse<BackendTicket>>(
        ENDPOINTS.SUPPORT_TICKETS, { subject: subject.trim(), message: message.trim() },
      )
      const t = mapTicket(data.data)
      setTickets(p => [t, ...p]); setActive(t); setView('ticket')
      setSubject(''); setMessage('')
      hapticNotification('success'); toast.success('Тикет создан')
    } catch (e) {
      toast.error(isApiError(e) ? (e.message || 'Ошибка создания тикета') : 'Ошибка соединения')
    } finally { setSubmitting(false) }
  }, [subject, message, haptic, hapticNotification])

  /* Send reply */
  const send = useCallback(async () => {
    if (!reply.trim() || !active) return
    haptic('light'); setSending(true)
    try {
      const { data } = await apiClient.post<ApiResponse<BackendTicket>>(
        `${ENDPOINTS.SUPPORT_TICKETS}/${active.id}/message`, { content: reply.trim() },
      )
      const u = mapTicket(data.data)
      setActive(u); setTickets(p => p.map(t => t.id === u.id ? u : t)); setReply('')
    } catch (e) {
      toast.error(isApiError(e) ? (e.message || 'Ошибка отправки') : 'Ошибка соединения')
    } finally { setSending(false) }
  }, [reply, active, haptic])

  /* ═══════ LIST ═══════ */
  if (view === 'list') {
    return (
      <div className="relative z-[1] px-4 pb-[100px]">
        {/* Header */}
        <div className="flex items-center gap-2 pt-4 pb-3 animate-fade-in">
          <div className="flex items-center gap-2 text-[18px] font-bold text-white truncate">
            <HelpCircle size={18} /> Поддержка
          </div>
          <button
            onClick={() => { setView('new'); haptic('light') }}
            className="
              ml-auto flex items-center gap-1 shrink-0
              bg-amber-400/[.12] border border-amber-400/25
              rounded-[10px] px-3.5 py-2
              text-amber-400 text-[12px] font-medium
              whitespace-nowrap
            "
          >
            <Plus size={14} /> Новый тикет
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-1 animate-fade-in [animation-delay:.1s]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
              <Loader2 size={20} className="animate-spin" />
              <span>Загрузка...</span>
            </div>
          ) : tickets.length > 0 ? (
            tickets.map(t => {
              const sc = STATUS[t.status]
              return (
                <div key={t.id} onClick={() => open(t)}
                  className="
                    flex items-center gap-2 px-3 py-3.5
                    bg-white/[.02] border border-white/[.04] rounded-xl
                    cursor-pointer transition-colors active:bg-white/[.05]
                  "
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-white/85 truncate">{t.subject}</span>
                      <span className="flex items-center gap-[3px] text-[10px] whitespace-nowrap"
                        style={{ color: sc.color }}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/30">
                      <span>{t.messages.length} сообщ.</span>
                      <span>·</span>
                      <span>{fmtDate(t.updatedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/[.15] shrink-0" />
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center gap-2 py-[60px] text-white/20 text-center">
              <MessageSquare size={32} />
              <div className="text-[16px] font-semibold text-white/40">Нет обращений</div>
              <div className="text-[13px] max-w-[240px]">
                Создайте тикет, если у вас есть вопрос
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ═══════ NEW ═══════ */
  if (view === 'new') {
    return (
      <div className="relative z-[1] px-4 pb-[100px]">
        {/* Header */}
        <div className="flex items-center gap-2 pt-4 pb-3 animate-fade-in">
          <button onClick={() => setView('list')}
            className="bg-white/[.06] border-none rounded-lg p-1.5 text-white/60 cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-white truncate">Новое обращение</div>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 animate-fade-in [animation-delay:.1s]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-white/60">Тема</label>
            <input type="text" maxLength={120}
              placeholder="Кратко опишите проблему"
              value={subject} onChange={e => setSubject(e.target.value)}
              className="
                bg-white/[.04] border border-white/[.08] rounded-[10px]
                px-3.5 py-3 text-white text-[14px] outline-none
                placeholder:text-white/20
                focus:border-white/[.15]
              "
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-white/60">Сообщение</label>
            <textarea rows={5}
              placeholder="Подробно опишите проблему. Укажите модель, что делали, что ожидали получить..."
              value={message} onChange={e => setMessage(e.target.value)}
              className="
                bg-white/[.04] border border-white/[.08] rounded-[10px]
                px-3.5 py-3 text-white text-[14px] outline-none resize-none
                font-[inherit] leading-relaxed
                placeholder:text-white/20
                focus:border-white/[.15]
              "
            />
          </div>

          <button onClick={create}
            disabled={!subject.trim() || !message.trim() || submitting}
            className="
              flex items-center justify-center gap-2
              bg-amber-400 text-black text-[15px] font-semibold
              border-none rounded-xl py-3.5 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Отправить
          </button>
        </div>
      </div>
    )
  }

  /* ═══════ TICKET ═══════ */
  if (view === 'ticket' && active) {
    const sc = STATUS[active.status]
    const closed = active.status === 'closed' || active.status === 'resolved'

    return (
      <div className="relative z-[1] px-4 pb-[100px] flex flex-col min-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center gap-2 pt-4 pb-3 animate-fade-in">
          <button onClick={() => setView('list')}
            className="bg-white/[.06] border-none rounded-lg p-1.5 text-white/60 cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-white truncate">{active.subject}</div>
            <span className="flex items-center gap-1 text-[11px] mt-0.5"
              style={{ color: sc.color }}>
              {sc.icon} {sc.label}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col gap-2 py-2 overflow-y-auto animate-fade-in [animation-delay:.1s]">
          {active.messages.map(m => (
            <div key={m.id}
              className={`flex flex-col max-w-[85%] ${
                m.sender === 'user'
                  ? 'self-end items-end'
                  : 'self-start items-start'
              }`}
            >
              <div className={`px-3.5 py-2.5 rounded-[14px] text-[13px] leading-[1.45] ${
                m.sender === 'user'
                  ? 'bg-amber-400/[.12] text-white/90 rounded-br-[4px]'
                  : 'bg-white/[.06] text-white/85 rounded-bl-[4px]'
              }`}>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className="text-[10px] text-white/25 mt-1">{fmtDate(m.createdAt)}</div>
              </div>
              {m.sender === 'admin' && (
                <div className="text-[10px] text-white/30 mt-0.5 pl-1">Поддержка</div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Reply */}
        {!closed && (
          <div className="
            fixed bottom-[72px] left-0 right-0 z-50
            px-3 py-2
            bg-[rgba(8,8,10,.9)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]
            border-t border-white/[.04]
          ">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <textarea rows={1}
                  placeholder="Написать..."
                  value={reply} onChange={e => setReply(e.target.value)}
                  disabled={sending}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  className="
                    w-full px-3.5 py-2.5 rounded-xl
                    border border-white/[.08] bg-white/[.03]
                    text-white text-[14px] font-[inherit] outline-none
                    resize-none leading-[1.4] max-h-[120px]
                    placeholder:text-neutral-600
                    focus:border-amber-400/20
                    transition-colors
                  "
                />
              </div>
              <button onClick={send}
                disabled={!reply.trim() || sending}
                className="
                  w-[38px] h-[38px] rounded-[10px] border-none shrink-0
                  bg-white/[.04] text-amber-400
                  flex items-center justify-center cursor-pointer
                  transition-all active:scale-[.92]
                  disabled:cursor-default disabled:opacity-50
                "
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        )}

        {closed && (
          <div className="text-center p-4 text-[13px] text-white/30 bg-white/[.02] rounded-[10px] mt-2">
            Тикет {active.status === 'resolved' ? 'решён' : 'закрыт'}
          </div>
        )}
      </div>
    )
  }

  return null
}