'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Ban, ShieldCheck, Wallet, Trash2, Crown,
  Loader2, Mail, MessageCircle, Globe, Calendar, Activity,
  Coins, Gift, TrendingUp, Users as UsersIcon,
} from 'lucide-react'
import { adminUsersApi, SetSubscriptionBody, type AdminUserDetails } from '@/lib/api/admin-users'
import type { AdminUser, UserRole } from '@/types/admin-user'
import { BanUserModal } from '../../_components/BanUserModal'
import { ChangeRoleModal } from '../../_components/ChangeRoleModal'
import { AdjustBalanceModal } from '../../_components/AdjustBalanceModal'
import { DeleteUserModal } from '../../_components/DeleteUserModal'
import { SetSubscriptionModal } from '../../_components/models/SetSubscriptionModal'

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [data, setData] = useState<AdminUserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showBan, setShowBan] = useState(false)
  const [showRole, setShowRole] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showSubscription, setShowSubscription] = useState(false) // 🆕

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    try {
      const res = await adminUsersApi.getById(userId)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleBan = async (reason: string) => {
    if (!data) return
    const ban = !data.user.isBanned
    const updated = await adminUsersApi.toggleBan(userId, ban, reason)
    setData({ ...data, user: { ...data.user, isBanned: updated.isBanned, banReason: updated.banReason } })
  }

  const handleRole = async (role: UserRole) => {
    if (!data) return
    const updated = await adminUsersApi.changeRole(userId, role)
    setData({ ...data, user: { ...data.user, role: updated.role } })
  }

  const handleBalance = async (body: {
    balanceType: 'tokenBalance' | 'bonusTokens' | 'cashbackBalance'
    amount: number
    reason: string
  }) => {
    if (!data) return
    const res = await adminUsersApi.adjustBalance(userId, body)
    setData({
      ...data,
      user: {
        ...data.user,
        tokenBalance: res.totals.tokenBalance,
        bonusTokens: res.totals.bonusTokens,
        cashbackBalance: res.totals.cashbackBalance,
      },
    })
  }

  const handleDelete = async () => {
    await adminUsersApi.remove(userId)
    router.push('/admin/users')
  }

  if (loading) {
    return (
      <div className="p-20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

    const handleSetSubscription = async (body: SetSubscriptionBody): Promise<void> => {
    if (!data) return
    await adminUsersApi.setSubscription(userId, body)
    // Перезагружаем карточку, чтобы получить свежий subscription объект с фри-моделями, source и expiresAt
    await load()
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/admin/users" className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> К списку
        </Link>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300 text-sm">
          {error || 'Пользователь не найден'}
        </div>
      </div>
    )
  }

  const { user, stats, recentTransactions, recentGenerations, referrer, invitedUsers } = data

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    `tg:${user.telegramId}`

  const totalBalance = user.tokenBalance + user.bonusTokens + user.cashbackBalance
  const isAdminRole = user.role === 'admin' || user.role === 'super_admin'

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link href="/admin/users" className="text-sm text-zinc-500 hover:text-white inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> К списку пользователей
      </Link>

      {/* Hero card */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-500/30 flex items-center justify-center text-3xl font-bold text-blue-300">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            {user.isPremiumTelegram && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px]">
                ⭐
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-white">{fullName}</h1>

              {user.role === 'super_admin' && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                  <Crown className="w-3 h-3" /> Super Admin
                </span>
              )}
              {user.role === 'admin' && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
              {user.role === 'moderator' && (
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Moderator
                </span>
              )}

              {user.isBanned ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                  <Ban className="w-3 h-3" /> Забанен
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Активен
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm">
              {user.username && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-white">@{user.username}</span>
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-white">{user.email}</span>
                  {user.isEmailVerified ? (
                    <span className="text-[10px] text-emerald-400">✓ verified</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">not verified</span>
                  )}
                </div>
              )}
              {user.telegramId && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-zinc-500">TG ID:</span>
                  <code className="text-white text-xs bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                    {user.telegramId}
                  </code>
                </div>
              )}
              {user.languageCode && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-white uppercase text-xs">{user.languageCode}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Зарегистрирован {new Date(user.createdAt).toLocaleString('ru-RU')}</span>
              </div>
              {user.lastActiveAt && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Activity className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Последняя активность: {new Date(user.lastActiveAt).toLocaleString('ru-RU')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-400 pt-1">
                <span className="text-zinc-500">ID:</span>
                <code className="text-zinc-400 text-[11px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                  {user._id}
                </code>
              </div>
            </div>

            {user.isBanned && user.banReason && (
              <div className="mt-3 rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-300">
                <span className="font-semibold">Причина бана:</span> {user.banReason}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2 min-w-[180px]">
            <button
              onClick={() => setShowBalance(true)}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white hover:from-blue-500 hover:to-cyan-400 flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Баланс
            </button>

            <button
              onClick={() => setShowRole(true)}
              className="px-3 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-sm font-semibold text-orange-300 hover:bg-orange-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Изменить роль
            </button>

            <button
              onClick={() => setShowBan(true)}
              disabled={!user.isBanned && isAdminRole}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${user.isBanned
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                }`}
            >
              {user.isBanned ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {user.isBanned ? 'Разбанить' : 'Забанить'}
            </button>

            <button
              onClick={() => setShowDelete(true)}
              disabled={isAdminRole}
              className="px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-sm font-semibold text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Основной баланс"
          value={user.tokenBalance.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300"
        />
        <StatCard
          icon={<Gift className="w-5 h-5" />}
          label="Бонусные"
          value={user.bonusTokens.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Кэшбек"
          value={user.cashbackBalance.toLocaleString('ru-RU')}
          suffix="🔥"
          subValue={`всего заработано: ${user.cashbackEarnedTotal}`}
          color="from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Итого доступно"
          value={totalBalance.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-zinc-700/40 to-zinc-800/40 border-zinc-600/30 text-white"
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Пополнено"
          value={`${user.totalDeposited.toLocaleString('ru-RU')} ₽`}
          color="from-yellow-500/15 to-amber-500/15 border-yellow-500/30 text-yellow-300"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Потрачено токенов"
          value={user.totalTokensSpent.toLocaleString('ru-RU')}
          suffix="🔥"
          color="from-orange-500/15 to-red-500/15 border-orange-500/30 text-orange-300"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Генераций"
          value={stats.generationsCount.toLocaleString('ru-RU')}
          subValue={`сегодня: ${user.dailyGenerations}`}
          color="from-cyan-500/15 to-blue-500/15 border-cyan-500/30 text-cyan-300"
        />
        <StatCard
          icon={<UsersIcon className="w-5 h-5" />}
          label="Приглашено"
          value={user.referralCount.toLocaleString('ru-RU')}
          subValue={`заработано: ${user.referralEarnings}🔥`}
          color="from-pink-500/15 to-rose-500/15 border-pink-500/30 text-pink-300"
        />
      </div>

      {/* Subscription */}
      <div className="mb-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Crown className="w-5 h-5 text-purple-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-purple-300 uppercase tracking-wider font-bold mb-0.5">
                Подписка
              </div>
              {data.subscription?.isActive ? (
                <>
                  <div className="text-lg font-bold text-white capitalize flex items-center gap-2 flex-wrap">
                    {data.subscription.planName || data.subscription.plan}
                    {data.subscription.source && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                        {data.subscription.source}
                      </span>
                    )}
                  </div>
                  {data.subscription.expiresAt && (
                    <div className="text-xs text-zinc-400 mt-0.5">
                      до {new Date(data.subscription.expiresAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                  {data.subscription.adminReason && (
                    <div className="text-[11px] text-zinc-500 mt-1 italic">
                      «{data.subscription.adminReason}»
                    </div>
                  )}
                </>
              ) : (
                <div className="text-lg font-bold text-zinc-400">Free</div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowSubscription(true)}
            className="px-3 py-2 rounded-xl border border-purple-500/40 bg-purple-500/10 text-sm font-semibold text-purple-200 hover:bg-purple-500/20 flex items-center gap-2"
          >
            <Crown className="w-4 h-4" />
            {data.subscription?.isActive ? 'Изменить' : 'Выдать план'}
          </button>
        </div>

        {/* Free models usage */}
        {data.subscription?.isActive && data.subscription.freeModels.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-500/20">
            <div className="text-[10px] uppercase tracking-wider text-purple-300/70 font-bold mb-2">
              Использование free-моделей
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {data.subscription.freeModels.map((fm) => {
                const hourlyText =
                  fm.hourlyLimit === null
                    ? '∞/час'
                    : `${fm.hourlyUsed}/${fm.hourlyLimit} час`
                const dailyText =
                  fm.dailyLimit === null
                    ? '∞/сутки'
                    : `${fm.dailyUsed}/${fm.dailyLimit} сутки`
                return (
                  <div
                    key={fm.modelSlug}
                    className="text-xs bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-2"
                  >
                    <div className="text-white truncate" title={fm.modelSlug}>
                      {fm.displayName}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{hourlyText}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{dailyText}</span>
                      {fm.requiredParams && (
                        <span
                          className="text-purple-400/80"
                          title={JSON.stringify(fm.requiredParams)}
                        >
                          (фильтр)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Two columns: transactions + generations */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Transactions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Транзакции</h3>
            <span className="text-xs text-zinc-500">всего: {stats.transactionsCount}</span>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Нет транзакций</div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
              {recentTransactions.map((tx: any) => (
                <div key={tx._id} className="px-4 py-2.5 hover:bg-zinc-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{tx.description}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase">{tx.type}</span>
                        <span>•</span>
                        <span>{new Date(tx.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold whitespace-nowrap ${tx.amount > 0 ? 'text-emerald-400' : tx.amount < 0 ? 'text-red-400' : 'text-zinc-500'
                      }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ru-RU')}🔥
                    </div>
                  </div>
                  {tx.paymentStatus && tx.paymentStatus !== 'completed' && (
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-orange-400">
                      {tx.paymentStatus}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generations */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Генерации</h3>
            <span className="text-xs text-zinc-500">всего: {stats.generationsCount}</span>
          </div>
          {recentGenerations.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Нет генераций</div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
              {recentGenerations.map((g: any) => (
                <div key={g._id} className="px-4 py-2.5 hover:bg-zinc-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {g.type}
                        </span>
                        <span className="text-sm text-white truncate">{g.modelSlug}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {new Date(g.createdAt).toLocaleString('ru-RU')}
                        {g.responseTimeMs ? ` • ${(g.responseTimeMs / 1000).toFixed(1)}s` : ''}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className={`text-[10px] uppercase font-bold ${g.status === 'completed' ? 'text-emerald-400' :
                          g.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                        {g.status}
                      </div>
                      {g.tokensCost > 0 && (
                        <div className="text-xs text-zinc-400 mt-0.5">-{g.tokensCost}🔥</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referral block */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Referrer */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Пригласил</h3>
          {referrer ? (
            <Link
              href={`/admin/users/${referrer._id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700"
            >
              {referrer.photoUrl ? (
                <img src={referrer.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {(referrer.firstName || referrer.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm text-white truncate">
                  {[referrer.firstName, referrer.lastName].filter(Boolean).join(' ') || referrer.username || '—'}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {referrer.username ? `@${referrer.username}` : `id:${referrer.telegramId}`}
                </div>
              </div>
            </Link>
          ) : (
            <div className="text-sm text-zinc-500">Нет реферера</div>
          )}

          {user.referralCode && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1">Реф. код</div>
              <code className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded font-mono">
                {user.referralCode}
              </code>
            </div>
          )}
        </div>

        {/* Invited users */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Приглашённые</h3>
            <span className="text-xs text-zinc-500">{user.referralCount}</span>
          </div>
          {invitedUsers.length === 0 ? (
            <div className="text-sm text-zinc-500">Никого не приглашал</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {invitedUsers.map((iu: AdminUser) => (
                <Link
                  key={iu._id}
                  href={`/admin/users/${iu._id}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700"
                >
                  {iu.photoUrl ? (
                    <img src={iu.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                      {(iu.firstName || iu.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">
                      {[iu.firstName, iu.lastName].filter(Boolean).join(' ') || iu.username || '—'}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {iu.username ? `@${iu.username}` : `id:${iu.telegramId}`}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 whitespace-nowrap">
                    {new Date(iu.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showBan && (
        <BanUserModal
          user={user}
          onClose={() => setShowBan(false)}
          onConfirm={handleBan}
        />
      )}
      {showRole && (
        <ChangeRoleModal
          user={user}
          onClose={() => setShowRole(false)}
          onConfirm={handleRole}
        />
      )}
      {showBalance && (
        <AdjustBalanceModal
          user={user}
          onClose={() => setShowBalance(false)}
          onConfirm={handleBalance}
        />
      )}
      {showDelete && (
        <DeleteUserModal
          user={user}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}   // 👈 () => Promise<void>
        />
      )}
      {/* 🆕 Управление подпиской */}
      {showSubscription && (
        <SetSubscriptionModal
          user={user}
          currentSubscription={data.subscription}
          onClose={() => setShowSubscription(false)}
          onConfirm={handleSetSubscription}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
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
        <div className="text-[11px] opacity-60 mt-1">{subValue}</div>
      )}
    </div>
  )
}