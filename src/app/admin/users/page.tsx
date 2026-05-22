'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users as UsersIcon, Search, Ban, ShieldCheck, Filter,
  ChevronLeft, ChevronRight, Loader2, X,
} from 'lucide-react'
import { adminUsersApi } from '@/lib/api/admin-users'
import type { AdminUser, AdminUsersQuery } from '@/types/admin-user'

const LIMIT = 20

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState<AdminUsersQuery['role']>('all')
  const [banned, setBanned] = useState<AdminUsersQuery['banned']>('all')
  const [sortBy, setSortBy] = useState<AdminUsersQuery['sortBy']>('createdAt')
  const [order, setOrder] = useState<AdminUsersQuery['order']>('desc')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminUsersApi.list({
        page, limit: LIMIT, search, role, banned, sortBy, order,
      })
      setUsers(res.items || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (e) {
      console.error('Users load error', e)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, search, role, banned, sortBy, order])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // debounce поиск
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <UsersIcon className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Пользователи</h1>
          <p className="text-sm text-zinc-400">
            Всего: <span className="text-white font-semibold">{total.toLocaleString('ru-RU')}</span>
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по @username, имени, email, telegramId..."
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
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

        {/* Role filter */}
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value as any); setPage(1) }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">Все роли</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>

        {/* Status filter */}
        <select
          value={banned}
          onChange={(e) => { setBanned(e.target.value as any); setPage(1) }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="banned">Забаненные</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}:${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split(':')
            setSortBy(s as any); setOrder(o as any); setPage(1)
          }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="createdAt:desc">Новые</option>
          <option value="createdAt:asc">Старые</option>
          <option value="lastActiveAt:desc">Активные недавно</option>
          <option value="totalDeposited:desc">По депозитам ↓</option>
          <option value="totalTokensSpent:desc">По тратам ↓</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="p-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-20 text-center text-zinc-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Никого не нашли</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Пользователь</th>
                <th className="px-4 py-3 font-medium">Auth</th>
                <th className="px-4 py-3 font-medium text-right">Баланс 🔥</th>
                <th className="px-4 py-3 font-medium text-right">Депозит</th>
                <th className="px-4 py-3 font-medium text-right">Рефы</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((u) => <UserRow key={u._id} user={u} />)}
            </tbody>
          </table>
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
function UserRow({ user }: { user: AdminUser }) {
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    `tg:${user.telegramId}`

  const totalBalance = user.tokenBalance + user.bonusTokens + user.cashbackBalance

  return (
    <tr className="hover:bg-zinc-900/60 transition-colors">
      {/* User */}
      <td className="px-4 py-3">
        <Link href={`/admin/users/${user._id}`} className="flex items-center gap-3 group">
          <div className="relative">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-300">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            {user.isPremiumTelegram && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border-2 border-zinc-900" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white group-hover:text-blue-400 transition-colors truncate max-w-[200px]">
              {fullName}
            </div>
            <div className="text-xs text-zinc-500 truncate max-w-[200px]">
              {user.username ? `@${user.username}` : user.email || `id:${user.telegramId}`}
            </div>
          </div>
        </Link>
      </td>

      {/* Auth */}
      <td className="px-4 py-3">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${
          user.authProvider === 'telegram' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
          user.authProvider === 'google' ? 'bg-red-500/10 text-red-300 border-red-500/30' :
          'bg-purple-500/10 text-purple-300 border-purple-500/30'
        }`}>
          {user.authProvider}
        </span>
      </td>

      {/* Balance */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm font-semibold text-white">{totalBalance.toLocaleString('ru-RU')}</div>
        <div className="text-[10px] text-zinc-500">
          {user.tokenBalance} / {user.bonusTokens}б / {user.cashbackBalance}к
        </div>
      </td>

      {/* Deposit */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-white">{user.totalDeposited.toLocaleString('ru-RU')} ₽</div>
        <div className="text-[10px] text-zinc-500">потрачено: {user.totalTokensSpent}🔥</div>
      </td>

      {/* Referrals */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-white">{user.referralCount}</div>
        <div className="text-[10px] text-zinc-500">{user.referralEarnings}🔥</div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        {user.role === 'admin' ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        ) : user.role === 'moderator' ? (
          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Mod
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold text-zinc-500">User</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {user.isBanned ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
            <Ban className="w-3 h-3" /> Бан
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Активен
          </span>
        )}
      </td>

      {/* Created */}
      <td className="px-4 py-3 text-xs text-zinc-500">
        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
      </td>
    </tr>
  )
}