'use client'

import {
  ArrowDownCircle, ArrowUpCircle, Sparkles, RotateCcw,
  Users, Ticket, Gem, Wrench,
  CheckCircle2, Clock, XCircle, Undo2,
} from 'lucide-react'
import type { TransactionType, PaymentStatus } from '@/types/admin-transaction'

// ─── Type badge ────────────────────────────────────────────────
const TYPE_META: Record<TransactionType, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  cls: string
}> = {
  deposit:           { label: 'Депозит',     icon: ArrowDownCircle, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  withdrawal:        { label: 'Вывод',       icon: ArrowUpCircle,   cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  generation:        { label: 'Генерация',   icon: Sparkles,        cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  refund:            { label: 'Возврат',     icon: RotateCcw,       cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  referral_bonus:    { label: 'Реф. бонус',  icon: Users,           cls: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  promo_code:        { label: 'Промокод',    icon: Ticket,          cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  subscription:      { label: 'Подписка',    icon: Gem,             cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  admin_adjustment:  { label: 'Корректировка', icon: Wrench,        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
}

export function TxTypeBadge({ type }: { type: TransactionType }) {
  const meta = TYPE_META[type] || TYPE_META.admin_adjustment
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}

// ─── Status badge ──────────────────────────────────────────────
const STATUS_META: Record<PaymentStatus, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  cls: string
}> = {
  pending:   { label: 'Pending',   icon: Clock,         cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  completed: { label: 'Completed', icon: CheckCircle2,  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed:    { label: 'Failed',    icon: XCircle,       cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  refunded:  { label: 'Refunded',  icon: Undo2,         cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
}

export function TxStatusBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return <span className="text-[10px] text-zinc-600">—</span>
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}