// src/components/TransactionsPage.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  ShoppingCart,
  Crown,
  Gift,
  Users,
  Zap,
  RotateCcw,
  Loader2,
  Search,
} from 'lucide-react'
import { useBilling, type Transaction } from '@/hooks/useBilling'

const typeIcons: Record<string, React.ReactNode> = {
  purchase: <ShoppingCart size={14} />,
  subscription: <Crown size={14} />,
  bonus: <Gift size={14} />,
  referral: <Users size={14} />,
  spending: <Zap size={14} />,
  refund: <RotateCcw size={14} />,
}

const typeLabels: Record<string, string> = {
  purchase: 'Покупка',
  subscription: 'Подписка',
  bonus: 'Бонус',
  referral: 'Реферал',
  spending: 'Расход',
  refund: 'Возврат',
}

const statusLabels: Record<string, string> = {
  completed: 'Выполнено',
  pending: 'В обработке',
  failed: 'Ошибка',
}

export function TransactionsPage() {
  const { transactions, transactionsTotal, loadTransactions } = useBilling()
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadTransactions(1).then(() => setIsLoading(false))
  }, [loadTransactions])

  const loadMore = useCallback(async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await loadTransactions(nextPage)
  }, [page, loadTransactions])

  const hasMore = transactions.length < transactionsTotal

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

    if (dateDay.getTime() === today.getTime()) return `Сегодня, ${time}`
    if (dateDay.getTime() === today.getTime() - 86400000) return `Вчера, ${time}`
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}, ${time}`
  }

  return (
    <div className="transactions-page">
      <div className="transactions-page__header fade-in fade-in--1">
        <div className="transactions-page__title">История</div>
        <div className="transactions-page__count">{transactionsTotal}</div>
      </div>

      <div className="transactions-page__list fade-in fade-in--2">
        {isLoading ? (
          <div className="chats-history__loading">
            <Loader2 size={20} className="spin" />
            <span>Загрузка...</span>
          </div>
        ) : transactions.length > 0 ? (
          <>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} formatDate={formatDate} />
            ))}

            {hasMore && (
              <button className="transactions-page__load-more" onClick={loadMore}>
                Загрузить ещё
              </button>
            )}
          </>
        ) : (
          <div className="models-page__empty">
            <Search size={24} />
            <span>Нет транзакций</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TransactionRow({ tx, formatDate }: { tx: Transaction; formatDate: (d: string) => string }) {
  const isIncome = ['purchase', 'bonus', 'referral', 'refund'].includes(tx.type)

  return (
    <div className="tx-row">
      <div className={`tx-row__icon tx-row__icon--${tx.type}`}>
        {typeIcons[tx.type] || <Zap size={14} />}
      </div>
      <div className="tx-row__body">
        <div className="tx-row__top">
          <span className="tx-row__desc">{tx.description}</span>
          <span className={`tx-row__amount ${isIncome ? 'tx-row__amount--plus' : 'tx-row__amount--minus'}`}>
            {isIncome ? '+' : '-'}
            {tx.tokens ? `${tx.tokens} 🔥` : `${tx.amount} ₽`}
          </span>
        </div>
        <div className="tx-row__bottom">
          <span className="tx-row__type">{typeLabels[tx.type]}</span>
          <span className="tx-row__dot">·</span>
          <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
          <span className={`tx-row__status tx-row__status--${tx.status}`}>
            {statusLabels[tx.status]}
          </span>
        </div>
      </div>
    </div>
  )
}