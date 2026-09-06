'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Copy,
  ExternalLink,
  Wallet,
  Coins,
  Gift,
  Calendar,
  Hash,
  Sparkles,
  Ticket,
  Users as UsersIcon,
  Flame,
} from 'lucide-react'
import { adminTransactionsApi } from '@/lib/api/admin-transactions'
import type { AdminTransactionDetails, AdminTransaction } from '@/types/admin-transaction'
import { TxTypeBadge, TxStatusBadge } from '../../_components/TxBadges'

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [data, setData] = useState<AdminTransactionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await adminTransactionsApi.getById(id)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="p-20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link
          href="/admin/transactions"
          className="text-sm text-emerald-400 hover:underline inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> К списку
        </Link>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300 text-sm">
          {error || 'Транзакция не найдена'}
        </div>
      </div>
    )
  }

  const { transaction: tx, user, referralUser, relatedTransactions } = data

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link
        href="/admin/transactions"
        className="text-sm text-zinc-500 hover:text-white inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> К списку транзакций
      </Link>

      {/* Hero card */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <TxTypeBadge type={tx.type} />
              <TxStatusBadge status={tx.paymentStatus} />
              {tx.paymentProvider && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {tx.paymentProvider}
                </span>
              )}
            </div>

            <div className="text-sm text-zinc-300 mb-3">
              {tx.description || <span className="text-zinc-600">Без описания</span>}
            </div>

            <div className="space-y-1.5 text-sm">
              <InfoRow
                icon={<Hash className="w-3.5 h-3.5 text-zinc-500" />}
                label="ID"
                value={
                  <CopyValue value={tx._id} />
                }
              />
              <InfoRow
                icon={<Calendar className="w-3.5 h-3.5 text-zinc-500" />}
                label="Создано"
                value={
                  <span className="text-white">
                    {new Date(tx.createdAt).toLocaleString('ru-RU')}
                  </span>
                }
              />
              {tx.updatedAt && tx.updatedAt !== tx.createdAt && (
                <InfoRow
                  icon={<Calendar className="w-3.5 h-3.5 text-zinc-500" />}
                  label="Обновлено"
                  value={
                    <span className="text-zinc-400">
                      {new Date(tx.updatedAt).toLocaleString('ru-RU')}
                    </span>
                  }
                />
              )}
              {tx.externalPaymentId && (
                <InfoRow
                  icon={<ExternalLink className="w-3.5 h-3.5 text-zinc-500" />}
                  label="External payment ID"
                  value={<CopyValue value={tx.externalPaymentId} />}
                />
              )}
              {tx.generationId && (
                <InfoRow
                  icon={<Sparkles className="w-3.5 h-3.5 text-orange-400" />}
                  label="Generation ID"
                  value={<CopyValue value={tx.generationId} />}
                />
              )}
              {tx.modelSlug && (
                <InfoRow
                  icon={<Sparkles className="w-3.5 h-3.5 text-orange-400" />}
                  label="Модель"
                  value={
                    <code className="text-orange-300 bg-orange-500/10 border border-orange-500/30 px-1.5 py-0.5 rounded text-xs font-mono">
                      {tx.modelSlug}
                    </code>
                  }
                />
              )}
              {tx.promoCode && (
                <InfoRow
                  icon={<Ticket className="w-3.5 h-3.5 text-purple-400" />}
                  label="Промокод"
                  value={
                    <code className="text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded text-xs font-mono">
                      {tx.promoCode}
                    </code>
                  }
                />
              )}
            </div>
          </div>

          {/* Amount block */}
          <div className="text-right min-w-[180px]">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Сумма</div>
            <div className={`text-3xl font-bold ${
              tx.amount > 0 ? 'text-emerald-400' : tx.amount < 0 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ru-RU')}
              <Flame size={16} className="inline-block ml-1 align-[-2px]" />
            </div>
            {tx.paymentAmountRub != null && tx.paymentAmountRub > 0 && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Оплата</div>
                <div className="text-xl font-semibold text-white">
                  {tx.paymentAmountRub.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* User */}
        <UserCard title="Пользователь" user={user} />

        {/* Referral user */}
        {referralUser && (
          <UserCard
            title={
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-pink-400" />
                Реферальный пользователь
              </span>
            }
            user={referralUser}
          />
        )}
      </div>

      {/* Balances snapshot */}
      {user && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <BalanceCard
            icon={<Coins className="w-4 h-4" />}
            label="Баланс"
            value={user.tokenBalance ?? 0}
            color="from-blue-500/15 to-cyan-500/15 border-blue-500/30 text-blue-300"
          />
          <BalanceCard
            icon={<Gift className="w-4 h-4" />}
            label="Бонусные"
            value={user.bonusTokens ?? 0}
            color="from-purple-500/15 to-pink-500/15 border-purple-500/30 text-purple-300"
          />
          <BalanceCard
            icon={<Wallet className="w-4 h-4" />}
            label="Кэшбек"
            value={user.cashbackBalance ?? 0}
            color="from-emerald-500/15 to-teal-500/15 border-emerald-500/30 text-emerald-300"
          />
        </div>
      )}

      {/* Metadata */}
      {tx.metadata && Object.keys(tx.metadata).length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
            <h3 className="text-sm font-bold text-white">Metadata</h3>
          </div>
          <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto">
            {JSON.stringify(tx.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Related transactions */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Связанные транзакции пользователя</h3>
          <span className="text-xs text-zinc-500">{relatedTransactions.length}</span>
        </div>
        {relatedTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Нет связанных транзакций</div>
        ) : (
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {relatedTransactions.map((rt) => (
              <RelatedRow key={rt._id} tx={rt} currentId={tx._id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-zinc-400">
      {icon}
      <span className="text-zinc-500 text-xs">{label}:</span>
      <div className="min-w-0">{value}</div>
    </div>
  )
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded font-mono group/copy"
      title="Скопировать"
    >
      <span className="truncate max-w-[280px]">{value}</span>
      <Copy className={`w-3 h-3 shrink-0 ${copied ? 'text-emerald-400' : 'text-zinc-500 group-hover/copy:text-white'}`} />
    </button>
  )
}

function UserCard({
  title, user,
}: { title: React.ReactNode; user: AdminTransactionDetails['user'] }) {
  if (!user) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
        <div className="text-sm text-zinc-500">Пользователь не найден или удалён</div>
      </div>
    )
  }

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    `tg:${user.telegramId}`

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      <Link
        href={`/admin/users/${user._id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 transition-colors group/link"
      >
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/30 flex items-center justify-center text-base font-bold text-emerald-300">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white group-hover/link:text-emerald-400 transition-colors truncate">
            {fullName}
          </div>
          <div className="text-xs text-zinc-500 truncate">
            {user.username ? `@${user.username}` : user.email || `id:${user.telegramId || '?'}`}
          </div>
          <div className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">
            {user._id}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-zinc-600 group-hover/link:text-emerald-400 transition-colors" />
      </Link>
    </div>
  )
}

function BalanceCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        {icon}
      </div>
      <div className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">
        {value.toLocaleString('ru-RU')}
        <Flame size={13} className="inline-block ml-1 align-[-2px] opacity-70" />
      </div>
    </div>
  )
}

function RelatedRow({ tx, currentId }: { tx: AdminTransaction; currentId: string }) {
  const isCurrent = tx._id === currentId

  return (
    <Link
      href={isCurrent ? '#' : `/admin/transactions/${tx._id}`}
      className={`block px-4 py-2.5 hover:bg-zinc-900/60 transition-colors ${
        isCurrent ? 'bg-emerald-500/5 pointer-events-none' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <TxTypeBadge type={tx.type} />
            {isCurrent && (
              <span className="text-[10px] uppercase font-bold text-emerald-400">
                ← текущая
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            {tx.description || '—'}
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5">
            {new Date(tx.createdAt).toLocaleString('ru-RU')}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div className={`text-sm font-bold ${
            tx.amount > 0 ? 'text-emerald-400' : tx.amount < 0 ? 'text-red-400' : 'text-zinc-500'
          }`}>
            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ru-RU')} <Flame size={13} className="inline-block align-[-2px]" />
          </div>
          {tx.paymentAmountRub != null && tx.paymentAmountRub > 0 && (
            <div className="text-[11px] text-zinc-500">{tx.paymentAmountRub.toLocaleString('ru-RU')} ₽</div>
          )}
        </div>
      </div>
    </Link>
  )
}