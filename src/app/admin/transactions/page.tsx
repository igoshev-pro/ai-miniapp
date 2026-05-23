'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Receipt, Search, ChevronLeft, ChevronRight, Loader2, X,
  TrendingUp, BarChart3, Eye, Filter,
} from 'lucide-react'
import { adminTransactionsApi } from '@/lib/api/admin-transactions'
import type {
  AdminTransaction,
  AdminTransactionsQuery,
  TransactionType,
  PaymentStatus,
} from '@/types/admin-transaction'
import { TxTypeBadge, TxStatusBadge } from '../_components/TxBadges'

const LIMIT = 20

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<AdminTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [totals, setTotals] = useState({ count: 0, tokens: 0, rub: 0 })
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TransactionType | 'all'>('all')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [provider, setProvider] = useState('')
  const [modelSlug, setModelSlug] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [sortBy, setSortBy] = useState<AdminTransactionsQuery['sortBy']>('createdAt')
  const [order, setOrder] = useState<AdminTransactionsQuery['order']>('desc')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: AdminTransactionsQuery = { page, limit: LIMIT, sortBy, order }
      if (search) params.search = search
      if (type !== 'all') params.type = type
      if (status !== 'all') params.status = status
      if (provider) params.provider = provider
      if (modelSlug) params.modelSlug = modelSlug
      if (promoCode) params.promoCode = promoCode
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (amountMin) params.amountMin = Number(amountMin)
      if (amountMax) params.amountMax = Number(amountMax)

      const res = await adminTransactionsApi.list(params)
      setItems(res.items || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
      setTotals(res.totals || { count: 0, tokens: 0, rub: 0 })
    } catch (e) {
      console.error('Transactions load error', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, search, type, status, provider, modelSlug, promoCode, dateFrom, dateTo, amountMin, amountMax, sortBy, order])

  useEffect(() => { fetchList() }, [fetchList])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const resetFilters = () => {
    setSearchInput(''); setSearch('')
    setType('all'); setStatus('all')
    setProvider(''); setModelSlug(''); setPromoCode('')
    setDateFrom(''); setDateTo('')
    setAmountMin(''); setAmountMax('')
    setSortBy('createdAt'); setOrder('desc')
    setPage(1)
  }

  const hasActiveFilters =
    !!search || type !== 'all' || status !== 'all' ||
    !!provider || !!modelSlug || !!promoCode ||
    !!dateFrom || !!dateTo || !!amountMin || !!amountMax

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <Receipt className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Транзакции</h1>
            <p className="text-sm text-zinc-400">
              Найдено: <span className="text-white font-semibold">{total.toLocaleString('ru-RU')}</span>
            </p>
          </div>
        </div>

        <Link
          href="/admin/transactions/stats"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-sm text-white"
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Статистика
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <SummaryCard
          label="Транзакций"
          value={totals.count.toLocaleString('ru-RU')}
          color="from-zinc-800/50 to-zinc-900/50 border-zinc-700/40 text-white"
        />
        <SummaryCard
          label="Сумма (₽)"
          value={`${totals.rub.toLocaleString('ru-RU')} ₽`}
          color="from-emerald-500/15 to-cyan-500/15 border-emerald-500/30 text-emerald-300"
        />
        <SummaryCard
          label="Токенов"
          value={`${totals.tokens.toLocaleString('ru-RU')} 🔥`}
          color="from-orange-500/15 to-red-500/15 border-orange-500/30 text-orange-300"
        />
      </div>

      {/* Filters bar */}
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по описанию, ID платежа, userId, промокоду, модели..."
              className="w-full pl-10 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded"
              >
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            )}
          </div>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as any); setPage(1) }}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">Все типы</option>
            <option value="deposit">Депозит</option>
            <option value="generation">Генерация</option>
            <option value="subscription">Подписка</option>
            <option value="refund">Возврат</option>
            <option value="referral_bonus">Реф. бонус</option>
            <option value="promo_code">Промокод</option>
            <option value="admin_adjustment">Корректировка</option>
            <option value="withdrawal">Вывод</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as any); setPage(1) }}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">Все статусы</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(':')
              setSortBy(s as any); setOrder(o as any); setPage(1)
            }}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="createdAt:desc">Сначала новые</option>
            <option value="createdAt:asc">Сначала старые</option>
            <option value="amount:desc">Сумма (🔥) ↓</option>
            <option value="amount:asc">Сумма (🔥) ↑</option>
            <option value="paymentAmountRub:desc">Сумма (₽) ↓</option>
            <option value="paymentAmountRub:asc">Сумма (₽) ↑</option>
          </select>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 border ${
              showAdvanced
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Сбросить
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-zinc-800">
            <SmallInput label="Provider"  value={provider}  onChange={setProvider}  placeholder="yookassa, tribute..." />
            <SmallInput label="Model slug" value={modelSlug} onChange={setModelSlug} placeholder="flux-pro, gpt-4o..." />
            <SmallInput label="Промокод"   value={promoCode} onChange={setPromoCode} placeholder="WELCOME10" />
            <div />
            <SmallInput label="Дата от"    value={dateFrom}  onChange={setDateFrom}  type="date" />
            <SmallInput label="Дата до"    value={dateTo}    onChange={setDateTo}    type="date" />
            <SmallInput label="Сумма от"   value={amountMin} onChange={setAmountMin} type="number" placeholder="0" />
            <SmallInput label="Сумма до"   value={amountMax} onChange={setAmountMax} type="number" placeholder="100000" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="p-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-20 text-center text-zinc-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Транзакций не найдено</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="px-4 py-3 font-medium">Описание</th>
                  <th className="px-4 py-3 font-medium text-right">Сумма 🔥</th>
                  <th className="px-4 py-3 font-medium text-right">₽</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((tx) => (
                  <TxRow key={tx._id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-zinc-500">
            Страница <span className="text-white">{page}</span> из <span className="text-white">{pages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: AdminTransaction }) {
  const user = tx.user
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      user.email ||
      (user.telegramId ? `tg:${user.telegramId}` : '—')
    : '—'

  return (
    <tr className="hover:bg-zinc-900/60 transition-colors group">
      {/* Date */}
      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
        <div>{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
        <div className="text-[11px] text-zinc-600">
          {new Date(tx.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <TxTypeBadge type={tx.type} />
      </td>

      {/* User */}
      <td className="px-4 py-3">
        {user ? (
          <Link
            href={`/admin/users/${user._id}`}
            className="flex items-center gap-2 group/link"
            onClick={(e) => e.stopPropagation()}
          >
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-zinc-700" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-400">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs text-white group-hover/link:text-emerald-400 truncate max-w-[160px]">
                {fullName}
              </div>
              <div className="text-[10px] text-zinc-500 truncate max-w-[160px]">
                {user.username ? `@${user.username}` : user.email || `id:${user.telegramId || '?'}`}
              </div>
            </div>
          </Link>
        ) : (
          <div className="text-xs text-zinc-600">—</div>
        )}
      </td>

      {/* Description */}
      <td className="px-4 py-3 max-w-[260px]">
        <div className="text-xs text-zinc-300 truncate" title={tx.description}>
          {tx.description || '—'}
        </div>
        {(tx.modelSlug || tx.promoCode) && (
          <div className="flex items-center gap-1 mt-0.5">
            {tx.modelSlug && (
              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">
                {tx.modelSlug}
              </span>
            )}
            {tx.promoCode && (
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">
                {tx.promoCode}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Tokens */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={`text-sm font-semibold ${
          tx.amount > 0 ? 'text-emerald-400' : tx.amount < 0 ? 'text-red-400' : 'text-zinc-500'
        }`}>
          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ru-RU')}
        </span>
      </td>

      {/* RUB */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {tx.paymentAmountRub ? (
          <span className="text-sm text-white">{tx.paymentAmountRub.toLocaleString('ru-RU')} ₽</span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <TxStatusBadge status={tx.paymentStatus} />
      </td>

      {/* Provider */}
      <td className="px-4 py-3">
        <span className="text-xs text-zinc-400 font-mono">
          {tx.paymentProvider || '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/transactions/${tx._id}`}
          className="inline-flex items-center gap-1 p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Подробнее"
        >
          <Eye className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${color}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

function SmallInput({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
      />
    </div>
  )
}