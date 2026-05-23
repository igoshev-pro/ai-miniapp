'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Ticket, Search, X, Loader2, Plus, ChevronLeft, ChevronRight,
  MoreVertical, Edit3, Trash2, Power, PowerOff, Copy, Check,
  Sparkles, Percent, Banknote, CalendarRange,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { adminPromoCodesApi } from '@/lib/api/admin-promo-codes'
import {
  PromoCodeType,
  type AdminPromoCode,
  type AdminPromoListQuery,
  type AdminPromoUpsert,
} from '@/types/admin-promo'
import { PromoCodeModal } from '../_components/PromoCodeModal'
import { DeletePromoModal } from '../_components/DeletePromoModal'

const LIMIT = 20

export default function AdminPromoCodesPage() {
  const [items, setItems] = useState<AdminPromoCode[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState<AdminPromoListQuery['type']>('all')
  const [status, setStatus] = useState<AdminPromoListQuery['status']>('all')
  const [sortBy, setSortBy] = useState<AdminPromoListQuery['sortBy']>('createdAt')
  const [order, setOrder] = useState<AdminPromoListQuery['order']>('desc')

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [editPromo, setEditPromo] = useState<AdminPromoCode | null>(null)
  const [deletePromo, setDeletePromo] = useState<AdminPromoCode | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: AdminPromoListQuery = { page, limit: LIMIT, sortBy, order }
      if (search) params.search = search
      if (type && type !== 'all') params.type = type
      if (status && status !== 'all') params.status = status

      const res = await adminPromoCodesApi.list(params)
      setItems(res.items || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (e) {
      console.error('Promo codes load error', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, search, type, status, sortBy, order])

  useEffect(() => { fetchList() }, [fetchList])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // ─── Actions ─────────────────────────────────────────────────
  const patchItem = (id: string, patch: Partial<AdminPromoCode>) => {
    setItems((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)))
  }

  const handleCreate = async (body: AdminPromoUpsert) => {
    const created = await adminPromoCodesApi.create(body)
    setItems((prev) => [created, ...prev])
    setTotal((t) => t + 1)
  }

  const handleUpdate = async (id: string, body: AdminPromoUpsert) => {
    const updated = await adminPromoCodesApi.update(id, body)
    patchItem(id, updated)
  }

  const handleToggle = async (promo: AdminPromoCode) => {
    const updated = await adminPromoCodesApi.toggle(promo._id)
    patchItem(promo._id, { isActive: updated.isActive })
  }

  const handleDelete = async (promo: AdminPromoCode) => {
    await adminPromoCodesApi.remove(promo._id)
    setItems((prev) => prev.filter((p) => p._id !== promo._id))
    setTotal((t) => Math.max(0, t - 1))
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30">
          <Ticket className="w-6 h-6 text-pink-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Промокоды</h1>
          <p className="text-sm text-zinc-400">
            Всего: <span className="text-white font-semibold">{total.toLocaleString('ru-RU')}</span>
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-sm font-semibold text-white hover:from-pink-500 hover:to-rose-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Новый промокод
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по коду или описанию..."
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50"
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

        <select
          value={type}
          onChange={(e) => { setType(e.target.value as any); setPage(1) }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
        >
          <option value="all">Все типы</option>
          <option value={PromoCodeType.BONUS_TOKENS}>Бонус-токены</option>
          <option value={PromoCodeType.DISCOUNT_PERCENT}>Скидка %</option>
          <option value={PromoCodeType.DISCOUNT_RUB}>Скидка ₽</option>
          <option value={PromoCodeType.SUBSCRIPTION_DAYS}>Дни подписки</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setPage(1) }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Выключенные</option>
          <option value="expired">Истёкшие</option>
          <option value="exhausted">Исчерпанные</option>
        </select>

        <select
          value={`${sortBy}:${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split(':')
            setSortBy(s as any); setOrder(o as any); setPage(1)
          }}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500/50"
        >
          <option value="createdAt:desc">Новые</option>
          <option value="createdAt:asc">Старые</option>
          <option value="currentUses:desc">По использованиям ↓</option>
          <option value="expiresAt:asc">По дате окончания ↑</option>
          <option value="code:asc">По коду A→Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="p-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-20 text-center text-zinc-500">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет промокодов</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Тип / Значение</th>
                <th className="px-4 py-3 font-medium">Применим к</th>
                <th className="px-4 py-3 font-medium text-right">Использований</th>
                <th className="px-4 py-3 font-medium">Период</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((p) => (
                <PromoRow
                  key={p._id}
                  promo={p}
                  onEdit={() => setEditPromo(p)}
                  onDelete={() => setDeletePromo(p)}
                  onToggle={() => handleToggle(p)}
                />
              ))}
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

      {/* Modals */}
      {createOpen && (
        <PromoCodeModal
          onClose={() => setCreateOpen(false)}
          onConfirm={handleCreate}
        />
      )}
      {editPromo && (
        <PromoCodeModal
          promo={editPromo}
          onClose={() => setEditPromo(null)}
          onConfirm={(body) => handleUpdate(editPromo._id, body)}
        />
      )}
      {deletePromo && (
        <DeletePromoModal
          promo={deletePromo}
          onClose={() => setDeletePromo(null)}
          onConfirm={() => handleDelete(deletePromo)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function PromoRow({
  promo,
  onEdit,
  onDelete,
  onToggle,
}: {
  promo: AdminPromoCode
  onEdit: () => void
  onDelete: () => void
  onToggle: () => Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const stop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const openMenu = (e: React.MouseEvent) => {
    stop(e)
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const MENU_W = 192
    setMenuPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - MENU_W),
    })
    setMenuOpen(true)
  }

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuOpen])

  const copyCode = async (e: React.MouseEvent) => {
    stop(e)
    try {
      await navigator.clipboard.writeText(promo.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  // ─── Derived status ──────────────────────────────────────────
  const now = new Date()
  const isExpired = !!promo.expiresAt && new Date(promo.expiresAt) <= now
  const isExhausted =
    promo.maxUses != null && promo.currentUses >= promo.maxUses
  const isNotStarted =
    !!promo.startsAt && new Date(promo.startsAt) > now

  // ─── Type pill ───────────────────────────────────────────────
  const typeView = (() => {
    switch (promo.type) {
      case PromoCodeType.BONUS_TOKENS:
        return {
          Icon: Sparkles,
          label: `+${promo.bonusTokens.toLocaleString('ru-RU')} 🔥`,
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        }
      case PromoCodeType.DISCOUNT_PERCENT:
        return {
          Icon: Percent,
          label: `-${promo.discountPercent}%`,
          color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        }
      case PromoCodeType.DISCOUNT_RUB:
        return {
          Icon: Banknote,
          label: `-${promo.discountRub.toLocaleString('ru-RU')} ₽`,
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        }
      case PromoCodeType.SUBSCRIPTION_DAYS:
        return {
          Icon: CalendarRange,
          label: `${promo.subscriptionDays}д ${promo.subscriptionPlan ?? ''}`.trim(),
          color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        }
      default:
        return {
          Icon: Ticket,
          label: promo.type,
          color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
        }
    }
  })()
  const TypeIcon = typeView.Icon

  return (
    <tr className="hover:bg-zinc-900/60 transition-colors group">
      {/* Code */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-sm font-mono font-bold text-pink-300">
            {promo.code}
          </code>
          <button
            onClick={copyCode}
            className="p-1 rounded text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"
            title="Скопировать"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        {promo.description && (
          <div className="mt-1 text-xs text-zinc-500 truncate max-w-[220px]">
            {promo.description}
          </div>
        )}
      </td>

      {/* Type / value */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded border ${typeView.color}`}>
          <TypeIcon className="w-3.5 h-3.5" />
          {typeView.label}
        </span>
        {promo.minPurchaseRub > 0 && (
          <div className="mt-1 text-[10px] text-zinc-500">
            мин. {promo.minPurchaseRub}₽
          </div>
        )}
      </td>

      {/* Apply to */}
      <td className="px-4 py-3">
        <div className="text-xs text-zinc-300">
          {promo.applyTo === 'any' && 'Любая покупка'}
          {promo.applyTo === 'subscription' && 'Подписки'}
          {promo.applyTo === 'token_package' && 'Пакеты'}
          {promo.applyTo === 'standalone' && 'Standalone'}
        </div>
        {(promo.applicablePlans.length > 0 || promo.applicablePackages.length > 0) && (
          <div className="mt-0.5 text-[10px] text-zinc-500 truncate max-w-[180px]">
            {[...promo.applicablePlans, ...promo.applicablePackages].join(', ')}
          </div>
        )}
      </td>

      {/* Uses */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm font-semibold text-white">
          {promo.currentUses.toLocaleString('ru-RU')}
          {promo.maxUses != null && (
            <span className="text-zinc-500"> / {promo.maxUses.toLocaleString('ru-RU')}</span>
          )}
        </div>
        <div className="text-[10px] text-zinc-500">
          на юзера: {promo.maxUsesPerUser}
        </div>
      </td>

      {/* Period */}
      <td className="px-4 py-3 text-xs text-zinc-400">
        {promo.startsAt && (
          <div>с {new Date(promo.startsAt).toLocaleDateString('ru-RU')}</div>
        )}
        {promo.expiresAt ? (
          <div className={isExpired ? 'text-red-400' : ''}>
            до {new Date(promo.expiresAt).toLocaleDateString('ru-RU')}
          </div>
        ) : (
          !promo.startsAt && <span className="text-zinc-600">бессрочно</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {!promo.isActive ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            Выключен
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
            Истёк
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
            Исчерпан
          </span>
        ) : isNotStarted ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Ожидает
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Активен
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { stop(e); onEdit() }}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-pink-400 hover:bg-pink-500/10 transition-all"
            title="Редактировать"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { stop(e); onToggle() }}
            className={`p-1.5 rounded-lg transition-all ${
              promo.isActive
                ? 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/30'
                : 'text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title={promo.isActive ? 'Выключить' : 'Включить'}
          >
            {promo.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>

          <button
            ref={btnRef}
            onClick={openMenu}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

                {menuOpen && menuPos && typeof window !== 'undefined' && createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="fixed z-[61] w-48 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl py-1 animate-in fade-in zoom-in-95"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                onClick={(e) => {
                  stop(e)
                  setMenuOpen(false)
                  onEdit()
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-pink-400" />
                Редактировать
              </button>

              <button
                onClick={async (e) => {
                  stop(e)
                  setMenuOpen(false)
                  await onToggle()
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                {promo.isActive ? (
                  <>
                    <PowerOff className="w-4 h-4 text-zinc-400" />
                    Выключить
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 text-emerald-400" />
                    Включить
                  </>
                )}
              </button>

              <button
                onClick={(e) => {
                  stop(e)
                  copyCode(e)
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-400" />
                    Скопировать код
                  </>
                )}
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <button
                onClick={(e) => {
                  stop(e)
                  setMenuOpen(false)
                  onDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
          </>,
          document.body,
        )}
      </td>
    </tr>
  )
}