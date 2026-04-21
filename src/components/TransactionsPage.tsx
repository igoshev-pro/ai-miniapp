// src/components/TransactionsPage.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, Crown, Gift, Users, Zap,
  RotateCcw, Loader2, Search,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, type Transaction } from '@/hooks/useBilling'

interface Props { onBack?: () => void }

const ICONS: Record<string, React.ReactNode> = {
  purchase: <ShoppingCart size={14} />,
  subscription: <Crown size={14} />,
  bonus: <Gift size={14} />,
  referral: <Users size={14} />,
  spending: <Zap size={14} />,
  refund: <RotateCcw size={14} />,
}

const LABELS: Record<string, string> = {
  purchase: 'Покупка', subscription: 'Подписка', bonus: 'Бонус',
  referral: 'Реферал', spending: 'Расход', refund: 'Возврат',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Выполнено', pending: 'В обработке', failed: 'Ошибка',
}

const ICON_COLORS: Record<string, string> = {
  purchase:     'text-blue-400 bg-blue-400/10',
  subscription: 'text-amber-400 bg-amber-400/10',
  bonus:        'text-green-400 bg-green-400/10',
  referral:     'text-purple-400 bg-purple-400/10',
  spending:     'text-red-400 bg-red-400/10',
  refund:       'text-green-400 bg-green-400/10',
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400 bg-green-400/10',
  pending:   'text-amber-400 bg-amber-400/10',
  failed:    'text-red-400 bg-red-400/10',
}

function fmtDate(s: string) {
  const d = new Date(s)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (day.getTime() === today.getTime()) return `Сегодня, ${t}`
  if (day.getTime() === today.getTime() - 86400000) return `Вчера, ${t}`
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}, ${t}`
}

export function TransactionsPage({ onBack }: Props) {
  const { webApp } = useTelegram()
  const { transactions, transactionsTotal, loadTransactions } = useBilling()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const h = () => onBack?.()
    webApp.BackButton.onClick(h)
    return () => { webApp.BackButton.offClick(h); webApp.BackButton.hide() }
  }, [webApp, onBack])

  useEffect(() => {
    setLoading(true)
    loadTransactions(1).finally(() => setLoading(false))
  }, [loadTransactions])

  useEffect(() => {
    const hasMore = transactions.length < transactionsTotal
    if (!loaderRef.current || !hasMore) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loadingMore) {
        setLoadingMore(true)
        const next = page + 1
        setPage(next)
        loadTransactions(next).finally(() => setLoadingMore(false))
      }
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [transactions.length, transactionsTotal, loadingMore, page, loadTransactions])

  const hasMore = transactions.length < transactionsTotal

  return (
    <div className="relative z-[1] px-4 pb-[100px]">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2 animate-fade-in">
        <h1 className="text-[20px] font-bold text-white">История</h1>
        <span className="text-[13px] text-white/30 bg-white/[.06] px-2.5 py-[3px] rounded-[10px]">
          {transactionsTotal}
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col gap-0.5 animate-fade-in [animation-delay:.1s]">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-white/30 text-[13px]">
            <Loader2 size={20} className="animate-spin" />
            <span>Загрузка...</span>
          </div>
        ) : transactions.length > 0 ? (
          <>
            {transactions.map(tx => (
              <TxRow key={tx.id} tx={tx} />
            ))}
            {hasMore && (
              <div ref={loaderRef} className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-white/30" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-[60px] text-white/20">
            <Search size={24} />
            <span className="text-[13px]">Нет транзакций</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TxRow({ tx }: { tx: Transaction }) {
  const income = ['purchase', 'bonus', 'referral', 'refund', 'subscription'].includes(tx.type)

  return (
    <div className="flex items-start gap-2.5 p-3 bg-white/[.02] rounded-[10px]">
      {/* Icon */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
        ${ICON_COLORS[tx.type] || 'text-white/50 bg-white/[.06]'}
      `}>
        {ICONS[tx.type] || <Zap size={14} />}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <span className="text-[13px] text-white/80 leading-[1.3]">{tx.description}</span>
          <span className={`text-[13px] font-semibold whitespace-nowrap ${income ? 'text-green-400' : 'text-red-400'}`}>
            {income ? '+' : '-'}{tx.tokens || tx.amount} 🔥
          </span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-[11px] text-white/30">
          <span>{LABELS[tx.type] || tx.type}</span>
          <span className="mx-0.5">·</span>
          <span>{fmtDate(tx.createdAt)}</span>
          {tx.status && (
            <span className={`ml-auto text-[10px] px-1.5 py-[1px] rounded ${STATUS_COLORS[tx.status] || ''}`}>
              {STATUS_LABELS[tx.status] || tx.status}
            </span>
          )}
        </div>

        {tx.paymentAmountRub != null && tx.paymentAmountRub > 0 && (
          <div className="text-[11px] text-white/30 mt-0.5">
            {tx.paymentAmountRub} ₽
          </div>
        )}
      </div>
    </div>
  )
}