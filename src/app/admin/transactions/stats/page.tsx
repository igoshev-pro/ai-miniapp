'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, Loader2, TrendingUp, TrendingDown,
  Coins, Wallet, Sparkles, Gem, AlertCircle, Clock,
  Users as UsersIcon, Ticket, Plug, Crown, Activity,
} from 'lucide-react'
import { adminTransactionsApi } from '@/lib/api/admin-transactions'
import type { AdminTransactionsStats } from '@/types/admin-transaction'
import { TxTypeBadge } from '../../_components/TxBadges'

const PERIODS = [
  { label: '7 дней',  value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: '180 дней', value: 180 },
] as const

export default function AdminTransactionsStatsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AdminTransactionsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminTransactionsApi.getStats(days)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link
        href="/admin/transactions"
        className="text-sm text-zinc-500 hover:text-white inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> К транзакциям
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Статистика транзакций</h1>
            <p className="text-sm text-zinc-400">
              {data
                ? `С ${new Date(data.period.since).toLocaleDateString('ru-RU')}`
                : 'Загрузка...'}
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === p.value
                  ? 'bg-emerald-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="p-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : error || !data ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300 text-sm">
          {error || 'Нет данных'}
        </div>
      ) : (
        <StatsContent data={data} reloading={loading} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function StatsContent({
  data, reloading,
}: { data: AdminTransactionsStats; reloading: boolean }) {
  const { summary, byType, byStatus, byProvider, revenueByDay, generationsByDay, topModels, topSpenders, promoStats, refunds } = data

  // Aggregate revenue by day (sum deposit + subscription)
  const revenueChartData = useMemo(() => {
    const map = new Map<string, { deposit: number; subscription: number }>()
    revenueByDay.forEach((r) => {
      const date = r._id.date
      const cur = map.get(date) || { deposit: 0, subscription: 0 }
      if (r._id.type === 'deposit') cur.deposit += r.rub
      if (r._id.type === 'subscription') cur.subscription += r.rub
      map.set(date, cur)
    })
    const arr = Array.from(map.entries())
      .map(([date, vals]) => ({ date, ...vals, total: vals.deposit + vals.subscription }))
      .sort((a, b) => a.date.localeCompare(b.date))
    return arr
  }, [revenueByDay])

  return (
    <div className={`space-y-6 ${reloading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Выручка"
          value={`${summary.totalRevenueRub.toLocaleString('ru-RU')} ₽`}
          subValue={`депозиты: ${summary.depositsRub.toLocaleString('ru-RU')} + подписки: ${summary.subscriptionsRub.toLocaleString('ru-RU')}`}
          color="from-emerald-500/15 to-cyan-500/15 border-emerald-500/30 text-emerald-300"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Куплено токенов"
          value={summary.tokensDeposited.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-blue-500/15 to-cyan-500/15 border-blue-500/30 text-blue-300"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Потрачено токенов"
          value={summary.tokensSpent.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-orange-500/15 to-red-500/15 border-orange-500/30 text-orange-300"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Транзакций"
          value={summary.totalCount.toLocaleString('ru-RU')}
          color="from-zinc-700/40 to-zinc-800/40 border-zinc-600/30 text-white"
        />

        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending"
          value={summary.pendingCount.toLocaleString('ru-RU')}
          color="from-yellow-500/15 to-amber-500/15 border-yellow-500/30 text-yellow-300"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Failed"
          value={summary.failedCount.toLocaleString('ru-RU')}
          color="from-red-500/15 to-rose-500/15 border-red-500/30 text-red-300"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Возвратов"
          value={refunds.count.toLocaleString('ru-RU')}
          subValue={`${refunds.tokens.toLocaleString('ru-RU')} 🔥`}
          color="from-blue-500/15 to-indigo-500/15 border-blue-500/30 text-blue-300"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Средний чек"
          value={
            summary.totalCount > 0
              ? `${Math.round(summary.totalRevenueRub / Math.max(1, summary.totalCount - refunds.count)).toLocaleString('ru-RU')} ₽`
              : '—'
          }
          color="from-purple-500/15 to-pink-500/15 border-purple-500/30 text-purple-300"
        />
      </div>

      {/* Revenue chart */}
      <ChartCard
        title="Выручка по дням"
        subtitle="Депозиты + подписки, ₽"
        accentColor="emerald"
      >
        {revenueChartData.length === 0 ? (
          <EmptyChart text="Нет выручки за период" />
        ) : (
          <RevenueChart data={revenueChartData} />
        )}
      </ChartCard>

      {/* Generations chart */}
      <ChartCard
        title="Расход токенов по дням"
        subtitle="🔥 потрачено + себестоимость в $"
        accentColor="orange"
      >
        {generationsByDay.length === 0 ? (
          <EmptyChart text="Нет генераций за период" />
        ) : (
          <GenerationsChart data={generationsByDay} />
        )}
      </ChartCard>

      {/* Two columns: by type + by status */}
      <div className="grid lg:grid-cols-2 gap-4">
        <BreakdownCard
          title="По типам транзакций"
          items={byType.map((b) => ({
            label: b._id,
            count: b.count,
            tokens: b.tokens,
            rub: b.rub,
            renderLabel: () => <TxTypeBadge type={b._id} />,
          }))}
        />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
            <h3 className="text-sm font-bold text-white">По статусам платежей</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {byStatus.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">Нет данных</div>
            ) : byStatus.map((s) => (
              <div key={s._id} className="px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-white uppercase tracking-wider font-semibold">
                  {s._id}
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{s.count.toLocaleString('ru-RU')}</div>
                  {s.rub > 0 && (
                    <div className="text-[11px] text-zinc-500">{s.rub.toLocaleString('ru-RU')} ₽</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Providers + Top models */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Providers */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
            <Plug className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">По платёжным провайдерам</h3>
          </div>
          {byProvider.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Нет платежей</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {byProvider.map((p) => (
                <div key={p._id || 'unknown'} className="px-4 py-3 flex items-center justify-between">
                  <div className="text-sm text-white font-mono">{p._id || '—'}</div>
                  <div className="text-right">
                    <div className="text-sm text-white">{p.rub.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-[11px] text-zinc-500">
                      {p.count} платежей · {p.tokens.toLocaleString('ru-RU')} 🔥
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top models */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Топ моделей по расходу</h3>
          </div>
          {topModels.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Нет генераций</div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
              {topModels.map((m, idx) => (
                <div key={m._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-zinc-500 font-mono w-6">#{idx + 1}</span>
                    <code className="text-xs text-orange-300 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono truncate">
                      {m._id}
                    </code>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm text-white">{m.tokens.toLocaleString('ru-RU')} 🔥</div>
                    <div className="text-[11px] text-zinc-500">
                      {m.count} · ${m.costDollars.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top spenders + promo */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top spenders */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Топ плательщиков</h3>
          </div>
          {topSpenders.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Нет данных</div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
              {topSpenders.map((s, idx) => {
                const u = s.user
                const fullName = u
                  ? [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                    u.username || u.email || `tg:${u.telegramId}`
                  : 'Unknown'
                return (
                  <Link
                    key={s.userId}
                    href={`/admin/users/${s.userId}`}
                    className="block px-4 py-2.5 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 font-mono w-6">#{idx + 1}</span>
                      {u?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white truncate">{fullName}</div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {u?.username ? `@${u.username}` : u?.email || `id:${u?.telegramId || '?'}`}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-semibold text-emerald-400">
                          {s.totalRub.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {s.paymentsCount} плат. · {s.totalTokens.toLocaleString('ru-RU')} 🔥
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Promo */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Использование промокодов</h3>
          </div>
          {promoStats.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Промокоды не активировались</div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
              {promoStats.map((p) => (
                <div key={p._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <code className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded font-mono">
                    {p._id}
                  </code>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm text-white">{p.usageCount} активаций</div>
                    <div className="text-[11px] text-zinc-500">
                      +{p.bonusTokens.toLocaleString('ru-RU')} 🔥
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Stat Card
function StatCard({
  icon, label, value, suffix, subValue, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  suffix?: string
  subValue?: string
  color: string
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        {icon}
      </div>
      <div className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">
        {value}{suffix && <span className="text-sm ml-1 opacity-70">{suffix}</span>}
      </div>
      {subValue && (
        <div className="text-[11px] opacity-60 mt-1 truncate" title={subValue}>{subValue}</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Chart Card wrapper
function ChartCard({
  title, subtitle, accentColor, children,
}: {
  title: string
  subtitle?: string
  accentColor: 'emerald' | 'orange'
  children: React.ReactNode
}) {
  const dot = accentColor === 'emerald' ? 'bg-emerald-400' : 'bg-orange-400'
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <span className="text-xs text-zinc-500 ml-2">{subtitle}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
      {text}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Revenue Chart (stacked bars: deposit + subscription)
function RevenueChart({
  data,
}: { data: Array<{ date: string; deposit: number; subscription: number; total: number }> }) {
  const W = 800
  const H = 240
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const max = Math.max(...data.map((d) => d.total), 1)
  const barW = Math.max(2, (innerW / data.length) * 0.7)
  const stepX = innerW / data.length

  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i)

  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px] h-[240px]">
        {/* Y grid lines + labels */}
        {ticks.map((t, i) => {
          const y = PAD.top + innerH - (t / max) * innerH
          return (
            <g key={i}>
              <line
                x1={PAD.left} x2={W - PAD.right}
                y1={y} y2={y}
                stroke="rgb(39 39 42)" strokeDasharray="2 4"
              />
              <text
                x={PAD.left - 6} y={y + 3}
                textAnchor="end"
                fontSize="10" fill="rgb(113 113 122)"
              >
                {formatRub(t)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.left + stepX * i + (stepX - barW) / 2
          const depH = (d.deposit / max) * innerH
          const subH = (d.subscription / max) * innerH
          const depY = PAD.top + innerH - depH
          const subY = depY - subH
          const isHover = hover === i

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* invisible hover area */}
              <rect
                x={PAD.left + stepX * i} y={PAD.top}
                width={stepX} height={innerH}
                fill="transparent"
              />
                           {/* deposit (bottom) */}
              <rect
                x={x}
                y={depY}
                width={barW}
                height={depH}
                fill={isHover ? 'rgb(52 211 153)' : 'rgb(16 185 129)'}
                opacity={isHover ? 1 : 0.85}
                rx={2}
              />
              {/* subscription (top) */}
              {d.subscription > 0 && (
                <rect
                  x={x}
                  y={subY}
                  width={barW}
                  height={subH}
                  fill={isHover ? 'rgb(168 85 247)' : 'rgb(139 92 246)'}
                  opacity={isHover ? 1 : 0.85}
                  rx={2}
                />
              )}
            </g>
          )
        })}

        {/* X axis labels (каждый N-ный, чтобы не слипались) */}
        {data.map((d, i) => {
          const showEvery = Math.max(1, Math.ceil(data.length / 10))
          if (i % showEvery !== 0 && i !== data.length - 1) return null
          const cx = PAD.left + stepX * i + stepX / 2
          return (
            <text
              key={`x-${d.date}`}
              x={cx}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="10"
              fill="rgb(113 113 122)"
            >
              {formatDateShort(d.date)}
            </text>
          )
        })}

        {/* Tooltip */}
        {hover !== null && data[hover] && (() => {
          const d = data[hover]
          const cx = PAD.left + stepX * hover + stepX / 2
          const tooltipW = 160
          const tooltipH = 64
          const tx = Math.min(W - tooltipW - 4, Math.max(4, cx - tooltipW / 2))
          const ty = PAD.top + 4
          return (
            <g pointerEvents="none">
              <rect
                x={tx} y={ty}
                width={tooltipW} height={tooltipH}
                rx={8}
                fill="rgb(9 9 11)"
                stroke="rgb(63 63 70)"
              />
              <text x={tx + 10} y={ty + 16} fontSize="10" fill="rgb(244 244 245)" fontWeight="bold">
                {formatDateFull(d.date)}
              </text>
              <circle cx={tx + 12} cy={ty + 32} r={3} fill="rgb(16 185 129)" />
              <text x={tx + 22} y={ty + 35} fontSize="10" fill="rgb(212 212 216)">
                Депозиты: {formatRub(d.deposit)} ₽
              </text>
              <circle cx={tx + 12} cy={ty + 48} r={3} fill="rgb(139 92 246)" />
              <text x={tx + 22} y={ty + 51} fontSize="10" fill="rgb(212 212 216)">
                Подписки: {formatRub(d.subscription)} ₽
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-zinc-400">Депозиты</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span className="text-zinc-400">Подписки</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Generations Chart (двойная ось: токены + $)
function GenerationsChart({
  data,
}: { data: Array<{ _id: string; tokens: number; count: number; costDollars: number }> }) {
  const W = 800
  const H = 240
  const PAD = { top: 16, right: 56, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxTokens = Math.max(...data.map((d) => d.tokens), 1)
  const maxCost = Math.max(...data.map((d) => d.costDollars), 1)

  const barW = Math.max(2, (innerW / data.length) * 0.7)
  const stepX = innerW / data.length

  // Tokens — бары
  // Cost — линия
  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxTokens / yTicks) * i)
  const costTicks = Array.from({ length: yTicks + 1 }, (_, i) => (maxCost / yTicks) * i)

  // Линия себестоимости
  const linePath = data
    .map((d, i) => {
      const cx = PAD.left + stepX * i + stepX / 2
      const cy = PAD.top + innerH - (d.costDollars / maxCost) * innerH
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
    })
    .join(' ')

  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px] h-[240px]">
        {/* Y grid + left labels (tokens) */}
        {ticks.map((t, i) => {
          const y = PAD.top + innerH - (t / maxTokens) * innerH
          return (
            <g key={i}>
              <line
                x1={PAD.left} x2={W - PAD.right}
                y1={y} y2={y}
                stroke="rgb(39 39 42)" strokeDasharray="2 4"
              />
              <text
                x={PAD.left - 6} y={y + 3}
                textAnchor="end"
                fontSize="10" fill="rgb(251 146 60)"
              >
                {formatNumber(t)}
              </text>
            </g>
          )
        })}

        {/* Right labels (cost $) */}
        {costTicks.map((c, i) => {
          const y = PAD.top + innerH - (c / maxCost) * innerH
          return (
            <text
              key={`c-${i}`}
              x={W - PAD.right + 6}
              y={y + 3}
              textAnchor="start"
              fontSize="10"
              fill="rgb(96 165 250)"
            >
              ${c.toFixed(c < 10 ? 1 : 0)}
            </text>
          )
        })}

        {/* Bars (tokens spent) */}
        {data.map((d, i) => {
          const x = PAD.left + stepX * i + (stepX - barW) / 2
          const h = (d.tokens / maxTokens) * innerH
          const y = PAD.top + innerH - h
          const isHover = hover === i

          return (
            <g
              key={d._id}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={PAD.left + stepX * i} y={PAD.top}
                width={stepX} height={innerH}
                fill="transparent"
              />
              <rect
                x={x} y={y}
                width={barW} height={h}
                fill={isHover ? 'rgb(251 146 60)' : 'rgb(249 115 22)'}
                opacity={isHover ? 1 : 0.85}
                rx={2}
              />
            </g>
          )
        })}

        {/* Cost line */}
        <path
          d={linePath}
          stroke="rgb(96 165 250)"
          strokeWidth={2}
          fill="none"
        />
        {data.map((d, i) => {
          const cx = PAD.left + stepX * i + stepX / 2
          const cy = PAD.top + innerH - (d.costDollars / maxCost) * innerH
          return (
            <circle
              key={`pt-${d._id}`}
              cx={cx} cy={cy}
              r={hover === i ? 4 : 2.5}
              fill="rgb(96 165 250)"
              stroke="rgb(9 9 11)"
              strokeWidth={1}
            />
          )
        })}

        {/* X axis labels */}
        {data.map((d, i) => {
          const showEvery = Math.max(1, Math.ceil(data.length / 10))
          if (i % showEvery !== 0 && i !== data.length - 1) return null
          const cx = PAD.left + stepX * i + stepX / 2
          return (
            <text
              key={`x-${d._id}`}
              x={cx}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="10"
              fill="rgb(113 113 122)"
            >
              {formatDateShort(d._id)}
            </text>
          )
        })}

        {/* Tooltip */}
        {hover !== null && data[hover] && (() => {
          const d = data[hover]
          const cx = PAD.left + stepX * hover + stepX / 2
          const tooltipW = 170
          const tooltipH = 76
          const tx = Math.min(W - tooltipW - 4, Math.max(4, cx - tooltipW / 2))
          const ty = PAD.top + 4
          return (
            <g pointerEvents="none">
              <rect
                x={tx} y={ty}
                width={tooltipW} height={tooltipH}
                rx={8}
                fill="rgb(9 9 11)"
                stroke="rgb(63 63 70)"
              />
              <text x={tx + 10} y={ty + 16} fontSize="10" fill="rgb(244 244 245)" fontWeight="bold">
                {formatDateFull(d._id)}
              </text>
              <circle cx={tx + 12} cy={ty + 32} r={3} fill="rgb(249 115 22)" />
              <text x={tx + 22} y={ty + 35} fontSize="10" fill="rgb(212 212 216)">
                Токены: {formatNumber(d.tokens)} 🔥
              </text>
              <circle cx={tx + 12} cy={ty + 48} r={3} fill="rgb(96 165 250)" />
              <text x={tx + 22} y={ty + 51} fontSize="10" fill="rgb(212 212 216)">
                Cost: ${d.costDollars.toFixed(2)}
              </text>
              <text x={tx + 10} y={ty + 67} fontSize="10" fill="rgb(161 161 170)">
                Генераций: {d.count}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-zinc-400">Токены (🔥)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-400" />
          <span className="text-zinc-400">Себестоимость ($)</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Breakdown card (для byType)
function BreakdownCard({
  title,
  items,
}: {
  title: string
  items: Array<{
    label: string
    count: number
    tokens: number
    rub: number
    renderLabel?: () => React.ReactNode
  }>
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">Нет данных</div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {items.map((it, idx) => {
            const pct = (it.count / maxCount) * 100
            return (
              <div key={idx} className="px-4 py-3 relative">
                {/* progress bg */}
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/5"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {it.renderLabel ? it.renderLabel() : (
                      <span className="text-sm text-white">{it.label}</span>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm text-white">
                      {it.count.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {it.rub > 0 && <span>{it.rub.toLocaleString('ru-RU')} ₽ · </span>}
                      {it.tokens !== 0 && <span>{it.tokens.toLocaleString('ru-RU')} 🔥</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
function formatRub(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}к`
  return n.toFixed(0)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toFixed(0)
}

function formatDateShort(date: string): string {
  // date в формате "YYYY-MM-DD"
  const [, m, d] = date.split('-')
  return `${d}.${m}`
}

function formatDateFull(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}`
}