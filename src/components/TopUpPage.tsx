'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flame, Zap, Gift, Check, Loader2, ChevronRight,
  Sparkles, Tag, TrendingDown, Crown,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'

interface Props { onBack?: () => void }

type Currency = 'rub' | 'usd'
const R = 90
const BASE = 3

const PKGS = [
  { id: 'pack_100',  tokens: 100,  priceRub: 299,  label: '100 спичек' },
  { id: 'pack_300',  tokens: 300,  priceRub: 749,  label: '300 спичек',   popular: true },
  { id: 'pack_700',  tokens: 700,  priceRub: 1490, label: '700 спичек' },
  { id: 'pack_1500', tokens: 1500, priceRub: 2690, label: '1 500 спичек' },
  { id: 'pack_5000', tokens: 5000, priceRub: 7490, label: '5 000 спичек', best: true },
] as const

function disc(t: number, p: number) {
  const b = t * BASE
  return p >= b ? 0 : Math.round(((b - p) / b) * 100)
}

function fmtP(r: number, c: Currency) {
  if (c === 'rub') return r.toLocaleString('ru-RU')
  const u = r / R
  return u % 1 === 0 ? u.toFixed(0) : u.toFixed(2).replace(/\.?0+$/, '')
}

function perTok(r: number, t: number, c: Currency) {
  return c === 'rub' ? `${(r / t).toFixed(1)} ₽` : `$${(r / R / t).toFixed(3)}`
}

export function TopUpPage({ onBack }: Props) {
  const { haptic, hapticNotification, webApp } = useTelegram()
  const { balance } = useUser()
  const { isLoading, purchaseTokens, applyPromo } = useBilling()

  const [sel, setSel] = useState<string | null>(null)
  const [cur, setCur] = useState<Currency>('rub')
  const [promo, setPromo] = useState('')
  const [promoL, setPromoL] = useState(false)
  const [promoOk, setPromoOk] = useState(false)
  const [provider] = useState<'yookassa' | 'cryptomus' | 'stars'>('stars')

  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const h = () => onBack?.()
    webApp.BackButton.onClick(h)
    return () => { webApp.BackButton.offClick(h); webApp.BackButton.hide() }
  }, [webApp, onBack])

  const pkg = PKGS.find(p => p.id === sel)

  const buy = useCallback(async () => {
    if (!sel) { toast.warning('Выберите пакет'); return }
    haptic('medium')
    const url = await purchaseTokens(sel, provider)
    if (url) {
      webApp?.openLink ? webApp.openLink(url) : window.open(url, '_blank')
      hapticNotification('success')
    }
  }, [sel, provider, purchaseTokens, haptic, hapticNotification, webApp])

  const doPromo = useCallback(async () => {
    const c = promo.trim()
    if (!c) return
    haptic('light'); setPromoL(true)
    const ok = await applyPromo(c)
    setPromoL(false)
    if (ok) { setPromoOk(true); setPromo(''); hapticNotification('success') }
    else hapticNotification('error')
  }, [promo, applyPromo, haptic, hapticNotification])

  return (
    <div className="relative z-[1] px-4 pb-[100px]">

      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2 gap-3 animate-fade-in">
        <h1 className="text-[20px] font-bold text-white flex-1">Пополнить баланс</h1>
      </div>

      {/* Balance */}
      <div className="text-center p-4 bg-white/[.04] border border-white/[.06] rounded-[14px] mb-4 animate-fade-in">
        <div className="text-[12px] text-white/40 mb-1.5">Текущий баланс</div>
        <div className="flex items-center justify-center gap-1.5 text-[24px] font-bold text-white">
          <Flame size={20} className="text-red-400" />
          {balance.toLocaleString()} спичек
        </div>
      </div>

      {/* Currency toggle */}
      <div className="flex gap-1 p-[3px] mb-3.5 bg-white/[.04] border border-white/[.06] rounded-xl animate-fade-in">
        {(['rub', 'usd'] as Currency[]).map(c => (
          <button key={c}
            onClick={() => { haptic('light'); setCur(c) }}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[.97] border-none ${
              cur === c ? 'bg-white/[.08] text-white shadow-[0_1px_4px_rgba(0,0,0,.2)]' : 'bg-transparent text-white/40'
            }`}
          >
            {c === 'rub' ? '₽ Рубли' : '$ USD'}
          </button>
        ))}
      </div>

      {/* Base price */}
      <div className="flex items-center justify-center gap-1.5 text-[12px] text-white/35 mb-3.5 animate-fade-in">
        <Flame size={12} />
        <span>1 спичка = {cur === 'rub' ? '3 ₽' : `$${(3 / R).toFixed(3)}`}</span>
      </div>

      {/* Packages */}
      <div className="mb-5 animate-fade-in [animation-delay:.1s]">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white/60 mb-2.5">
          <Zap size={14} /> Пакеты спичек
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {PKGS.map((p: any) => {
            const d = disc(p.tokens, p.priceRub)
            const isSel = sel === p.id
            return (
              <div key={p.id}
                onClick={() => { setSel(p.id); haptic('light') }}
                className={`
                  relative rounded-[14px] p-3.5 cursor-pointer transition-all
                  bg-white/[.04] border-[1.5px]
                  ${isSel ? 'border-amber-400/50 bg-amber-400/[.06]' : ''}
                  ${!isSel && p.popular ? 'border-amber-400/25' : ''}
                  ${!isSel && p.best ? 'border-green-400/25' : ''}
                  ${!isSel && !p.popular && !p.best ? 'border-white/[.06]' : ''}
                `}
              >
                {/* Badges */}
                {p.popular && (
                  <div className="absolute -top-2 right-2.5 flex items-center gap-[3px] bg-amber-400 text-black text-[9px] font-bold px-2 py-[2px] rounded-md">
                    <Sparkles size={10} /> Популярный
                  </div>
                )}
                {p.best && (
                  <div className="absolute -top-2 right-2.5 flex items-center gap-[3px] bg-green-400 text-black text-[9px] font-bold px-2 py-[2px] rounded-md">
                    <Crown size={10} /> Лучшая цена
                  </div>
                )}

                {/* Discount */}
                {d > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-[3px] text-[11px] font-bold text-green-400 bg-green-400/10 border border-green-400/15 px-2.5 py-[3px] rounded-lg tracking-wide">
                    <TrendingDown size={10} /> −{d}%
                  </div>
                )}

                {/* Tokens */}
                <div className="flex items-center gap-1 text-[18px] font-bold text-white mb-1">
                  <Flame size={14} /> {p.tokens.toLocaleString()}
                </div>

                <div className="text-[12px] text-white/40 mb-1.5">{p.label}</div>

                {/* Price */}
                <div className="text-[16px] font-semibold text-white">
                  {cur === 'usd' && '$'}{fmtP(p.priceRub, cur)}{cur === 'rub' && ' ₽'}
                </div>

                {/* Old price */}
                {d > 0 && (
                  <div className="text-[11px] text-white/25 line-through -mt-0.5">
                    {cur === 'usd' && '$'}{fmtP(p.tokens * BASE, cur)}{cur === 'rub' && ' ₽'}
                  </div>
                )}

                {/* Per token */}
                <div className="text-[10px] text-white/25 mt-0.5">
                  {perTok(p.priceRub, p.tokens, cur)} / спичка
                </div>

                {/* Check */}
                {isSel && (
                  <div className="absolute bottom-2.5 right-2.5 text-amber-400">
                    <Check size={14} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Buy button */}
        <button onClick={buy} disabled={!sel || isLoading}
          className="
            w-full flex items-center justify-center gap-2
            bg-amber-400 text-black text-[15px] font-semibold
            border-none rounded-xl py-3.5 cursor-pointer
            transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : pkg ? (
            <>
              <Zap size={16} />
              Оплатить {cur === 'usd' ? '$' : ''}{fmtP(pkg.priceRub, cur)}{cur === 'rub' ? ' ₽' : ''}
            </>
          ) : (
            <><Zap size={16} /> Выберите пакет</>
          )}
        </button>
      </div>

      {/* Promo */}
      <div className="mb-5 animate-fade-in [animation-delay:.2s]">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white/60 mb-2.5">
          <Tag size={14} /> Промокод
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Введите промокод"
            value={promo}
            onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoOk(false) }}
            disabled={promoL}
            className="
              flex-1 bg-white/[.06] border border-white/[.08] rounded-[10px]
              px-3.5 py-2.5 text-white text-[14px] outline-none tracking-widest
              placeholder:text-white/25 placeholder:tracking-normal
            "
          />
          <button onClick={doPromo} disabled={!promo.trim() || promoL}
            className="
              bg-white/[.08] border border-white/[.08] rounded-[10px]
              px-3.5 py-2.5 text-white/60 cursor-pointer
              disabled:opacity-40
            "
          >
            {promoL ? <Loader2 size={14} className="animate-spin" />
              : promoOk ? <Check size={14} />
              : <ChevronRight size={14} />}
          </button>
        </div>
        {promoOk && (
          <div className="flex items-center gap-1.5 mt-2 text-[12px] text-green-400">
            <Gift size={12} /> Промокод применён!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center px-5 py-4 animate-fade-in [animation-delay:.2s]">
        <div className="text-[12px] text-white/30 mb-1.5">
          Оплата через Telegram Stars. Спички зачисляются мгновенно.
        </div>
        <div className="text-[10px] text-white/[.15]">
          ИП Аневич А.С. · ИНН 246220127244
        </div>
      </div>
    </div>
  )
}