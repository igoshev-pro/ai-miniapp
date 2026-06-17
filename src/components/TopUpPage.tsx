// src/components/TopUpPage.tsx
'use client'




import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Flame, Zap, Gift, Check, Loader2, ChevronRight,
  Sparkles, Tag, TrendingDown, Crown, CreditCard, Star, Bitcoin,
  Sliders, Minus, Plus,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { useBilling, useUser } from '@/hooks'
import { toast } from '@/stores/toast.store'
import { calcCustomByTokens } from '@/lib/api/pricing'




interface Props { onBack?: () => void }




type Currency = 'rub' | 'usd'
type Provider = 'stars' | 'tochka' | 'freedompay' | 'heleket'




// 🔧 R = 90 (совпадает с RUB_TO_USD_RATE на беке)
const R = 90
const BASE = 3




const CUSTOM_MIN = 10
const CUSTOM_MAX = 100000
const QUICK_AMOUNTS = [50, 100, 500, 1000, 3000]




const PKG_DEFS = [
  { id: 'pack_100', tokens: 100 },
  { id: 'pack_300', tokens: 300, popular: true },
  { id: 'pack_700', tokens: 700 },
  { id: 'pack_1500', tokens: 1500 },
  { id: 'pack_5000', tokens: 5000, best: true },
] as const




const PKGS = PKG_DEFS.map((p) => {
  const c = calcCustomByTokens(p.tokens)
  return {
    ...p,
    priceRub: c.rub,
    label: `${p.tokens.toLocaleString('ru-RU')} спичек`,
  }
})




const PROVIDERS: { id: Provider; label: string; icon: typeof Star; sub: string }[] = [
  { id: 'stars', label: 'Stars', icon: Star, sub: 'Telegram' },
  { id: 'tochka', label: 'Карта', icon: CreditCard, sub: 'РФ ₽' },
  { id: 'freedompay', label: 'Карта', icon: CreditCard, sub: 'KZ ₸' },
  { id: 'heleket', label: 'Crypto', icon: Bitcoin, sub: 'USDT/BTC' },
]




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
  const { isLoading, purchaseCustomTokens, applyPromo } = useBilling()




  const [sel, setSel] = useState<string | null>(null)
  const [cur, setCur] = useState<Currency>('rub')
  const [promo, setPromo] = useState('')
  const [promoL, setPromoL] = useState(false)
  const [promoOk, setPromoOk] = useState(false)
  const [provider, setProvider] = useState<Provider>('tochka')
  const [customMode, setCustomMode] = useState(false)
  const [customTokens, setCustomTokens] = useState<number>(100)
  const [customInput, setCustomInput] = useState<string>('100')




  // Единый хелпер для синхронной установки числа + строки в инпуте
  const setTokens = useCallback((n: number) => {
    const clamped = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Math.floor(n) || CUSTOM_MIN))
    setCustomTokens(clamped)
    setCustomInput(String(clamped))
  }, [])




  const customCalc = useMemo(() => calcCustomByTokens(customTokens), [customTokens])




  const isTelegram = !!webApp




  // 🔧 FreedomPay включён. Stars только в TG, Tochka только для RUB
  const availableProviders = useMemo(() => {
    return PROVIDERS.filter(p => {
      if (p.id === 'stars') return isTelegram
      if (p.id === 'tochka') return cur === 'rub'
      return true
    })
  }, [isTelegram, cur])




  useEffect(() => {
    if (!availableProviders.some(p => p.id === provider)) {
      setProvider(availableProviders[0]?.id ?? 'heleket')
    }
  }, [availableProviders, provider])




  const pkg = PKGS.find(p => p.id === sel)




  const currencyForBackend = (): 'RUB' | 'USD' =>
    provider === 'stars' ? 'RUB' : (cur.toUpperCase() as 'RUB' | 'USD')




  const buy = useCallback(async () => {
    if (!pkg) { toast.warning('Выберите пакет'); return }
    haptic('medium')




    const url = await purchaseCustomTokens(pkg.tokens, provider, currencyForBackend())




    if (url) {
      if (webApp?.openLink) webApp.openLink(url)
      else window.open(url, '_blank')
      hapticNotification('success')
    }
  }, [pkg, provider, cur, purchaseCustomTokens, haptic, hapticNotification, webApp])




  const buyCustom = useCallback(async () => {
    if (!customCalc.valid) {
      toast.warning(`От ${CUSTOM_MIN} до ${CUSTOM_MAX.toLocaleString('ru-RU')} спичек`)
      return
    }
    haptic('medium')




    const url = await purchaseCustomTokens(customCalc.tokens, provider, currencyForBackend())




    if (url) {
      if (webApp?.openLink) webApp.openLink(url)
      else window.open(url, '_blank')
      hapticNotification('success')
    }
  }, [customCalc, provider, cur, purchaseCustomTokens, haptic, hapticNotification, webApp])




  const doPromo = useCallback(async () => {
    const c = promo.trim()
    if (!c) return
    haptic('light'); setPromoL(true)
    const ok = await applyPromo(c)
    setPromoL(false)
    if (ok) { setPromoOk(true); setPromo(''); hapticNotification('success') }
    else hapticNotification('error')
  }, [promo, applyPromo, haptic, hapticNotification])




  const providerNote = (() => {
    switch (provider) {
      case 'stars': return 'Оплата через Telegram Stars. Зачисление мгновенное.'
      case 'tochka': return 'Российская карта (₽) через Банк «Точка». Зачисление после подтверждения банка.'
      case 'freedompay': return 'Карта Казахстана (₸) / международная. Зачисление мгновенное.'
      case 'heleket': return 'Оплата криптовалютой (USDT/BTC/TRX и др.). Зачисление после подтверждения сети.'
    }
  })()




  return (
    <div className="relative z-[1] px-4 pb-[100px]">




      <div className="flex items-center justify-between pt-4 pb-2 gap-3 animate-fade-in">
        <h1 className="text-[20px] font-bold text-white flex-1">Пополнить баланс</h1>
      </div>




      <div className="text-center p-4 bg-white/[.04] border border-white/[.06] rounded-[14px] mb-4 animate-fade-in">
        <div className="text-[12px] text-white/40 mb-1.5">Текущий баланс</div>
        <div className="flex items-center justify-center gap-1.5 text-[24px] font-bold text-white">
          <Flame size={20} className="text-red-400" />
          {balance.toLocaleString()} спичек
        </div>
      </div>




      <div className="flex gap-1 p-[3px] mb-3.5 bg-white/[.04] border border-white/[.06] rounded-xl animate-fade-in">
        {(['rub', 'usd'] as Currency[]).map(c => (
          <button key={c}
            onClick={() => { haptic('light'); setCur(c) }}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[.97] border-none ${cur === c ? 'bg-white/[.08] text-white shadow-[0_1px_4px_rgba(0,0,0,.2)]' : 'bg-transparent text-white/40'
              }`}
          >
            {c === 'rub' ? '₽ Рубли' : '$ USD'}
          </button>
        ))}
      </div>




      <div className="flex items-center justify-center gap-1.5 text-[12px] text-white/35 mb-3.5 animate-fade-in">
        <Flame size={12} />
        <span>1 спичка = {cur === 'rub' ? '3 ₽' : `$${(3 / R).toFixed(3)}`}</span>
      </div>




      <div className="mb-5 animate-fade-in [animation-delay:.1s]">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white/60 mb-2.5">
          <Zap size={14} /> Пакеты спичек
        </div>




        <div className="grid grid-cols-2 gap-2 mb-3">
          {PKGS.map((p: any) => {
            const d = disc(p.tokens, p.priceRub)
            const isSel = sel === p.id && !customMode
            return (
              <div key={p.id}
                onClick={() => { setSel(p.id); setCustomMode(false); haptic('light') }}
                className={`
                  relative rounded-[14px] p-3.5 cursor-pointer transition-all
                  bg-white/[.04] border-[1.5px]
                  ${isSel ? 'border-amber-400/50 bg-amber-400/[.06]' : ''}
                  ${!isSel && p.popular ? 'border-amber-400/25' : ''}
                  ${!isSel && p.best ? 'border-green-400/25' : ''}
                  ${!isSel && !p.popular && !p.best ? 'border-white/[.06]' : ''}
                `}
              >
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




                {d > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-[3px] text-[11px] font-bold text-green-400 bg-green-400/10 border border-green-400/15 px-2.5 py-[3px] rounded-lg tracking-wide">
                    <TrendingDown size={10} /> −{d}%
                  </div>
                )}




                <div className="flex items-center gap-1 text-[18px] font-bold text-white mb-1">
                  <Flame size={14} /> {p.tokens.toLocaleString()}
                </div>




                <div className="text-[12px] text-white/40 mb-1.5">{p.label}</div>




                <div className="text-[16px] font-semibold text-white">
                  {cur === 'usd' && '$'}{fmtP(p.priceRub, cur)}{cur === 'rub' && ' ₽'}
                </div>




                {d > 0 && (
                  <div className="text-[11px] text-white/25 line-through -mt-0.5">
                    {cur === 'usd' && '$'}{fmtP(p.tokens * BASE, cur)}{cur === 'rub' && ' ₽'}
                  </div>
                )}




                <div className="text-[10px] text-white/25 mt-0.5">
                  {perTok(p.priceRub, p.tokens, cur)} / спичка
                </div>




                {isSel && (
                  <div className="absolute bottom-2.5 right-2.5 text-amber-400">
                    <Check size={14} />
                  </div>
                )}
              </div>
            )
          })}




          {/* Тайл «Своя сумма» */}
          <div
            onClick={() => { haptic('light'); setCustomMode(v => !v); setSel(null) }}
            className={`
              relative rounded-[14px] p-3.5 cursor-pointer transition-all
              flex flex-col items-center justify-center text-center
              bg-white/[.04] border-[1.5px] border-dashed
              ${customMode ? 'border-amber-400/50 bg-amber-400/[.06]' : 'border-white/[.12]'}
            `}
          >
            <Sliders size={20} className={customMode ? 'text-amber-400 mb-1.5' : 'text-white/45 mb-1.5'} />
            <div className="text-[14px] font-semibold text-white">Своя сумма</div>
            <div className="text-[11px] text-white/35 mt-0.5">
              {customMode ? 'Открыто ниже' : 'Указать вручную'}
            </div>
          </div>
        </div>




        {/* Панель кастомной суммы */}
        {customMode && (
          <div className="mb-3 p-3.5 rounded-[14px] bg-white/[.04] border border-amber-400/30 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { haptic('light'); setTokens(Math.max(CUSTOM_MIN, customTokens - 50)) }}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-[10px] bg-white/[.06] border border-white/[.08] text-white/70 active:scale-95"
              >
                <Minus size={16} />
              </button>




              <div className="flex-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customInput}
                  onChange={e => {
                    // оставляем только цифры и срезаем ведущие нули
                    const raw = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
                    setCustomInput(raw)
                    if (raw === '') {
                      setCustomTokens(0)
                    } else {
                      const n = parseInt(raw, 10)
                      setCustomTokens(Math.min(CUSTOM_MAX, n))
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, customTokens || CUSTOM_MIN))
                    setCustomTokens(clamped)
                    setCustomInput(String(clamped))
                  }}
                  className="
                    w-full bg-white/[.06] border border-white/[.08] rounded-[10px]
                    px-3.5 py-2.5 pr-16 text-white text-[16px] font-semibold
                    text-center outline-none
                  "
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-white/35 pointer-events-none">
                  спичек
                </span>
              </div>




              <button
                onClick={() => { haptic('light'); setTokens(Math.min(CUSTOM_MAX, customTokens + 50)) }}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-[10px] bg-white/[.06] border border-white/[.08] text-white/70 active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>




            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { haptic('light'); setTokens(a) }}
                  className={`
                    px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all active:scale-95
                    ${customTokens === a
                      ? 'bg-amber-400/15 border border-amber-400/40 text-amber-400'
                      : 'bg-white/[.05] border border-white/[.06] text-white/50'}
                  `}
                >
                  {a.toLocaleString('ru-RU')}
                </button>
              ))}
            </div>




            <div className="flex items-center justify-between p-3 rounded-[12px] bg-white/[.03] border border-white/[.05] mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[18px] font-bold text-white">
                  <Flame size={15} className="text-red-400" />
                  {customCalc.tokens.toLocaleString('ru-RU')}
                </div>
                <div className="text-[11px] text-white/30 mt-0.5">
                  {customCalc.pricePerToken.toFixed(2)} ₽ / спичка
                </div>
              </div>




              <div className="text-right">
                <div className="text-[18px] font-bold text-white">
                  {cur === 'usd' && '$'}{fmtP(customCalc.rub, cur)}{cur === 'rub' && ' ₽'}
                </div>
                {customCalc.discountPct > 0 && (
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[11px] text-white/25 line-through">
                      {cur === 'usd' && '$'}{fmtP(customCalc.baseRub, cur)}{cur === 'rub' && ' ₽'}
                    </span>
                    <span className="flex items-center gap-[2px] text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/15 px-1.5 py-[1px] rounded">
                      <TrendingDown size={9} /> −{customCalc.discountPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>




            {!customCalc.valid && (
              <div className="text-[11px] text-red-400/80 mb-2 text-center">
                Допустимо от {CUSTOM_MIN} до {CUSTOM_MAX.toLocaleString('ru-RU')} спичек
              </div>
            )}




            <button
              onClick={buyCustom}
              disabled={!customCalc.valid || isLoading}
              className="
                w-full flex items-center justify-center gap-2
                bg-amber-400 text-black text-[15px] font-semibold
                border-none rounded-xl py-3 cursor-pointer
                transition-opacity
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  Оплатить {cur === 'usd' ? '$' : ''}{fmtP(customCalc.rub, cur)}{cur === 'rub' ? ' ₽' : ''}
                </>
              )}
            </button>
          </div>
        )}




        {/* Способ оплаты */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white/60 mb-2">
            <CreditCard size={13} /> Способ оплаты
          </div>
          <div className={`grid gap-1.5 ${availableProviders.length === 1 ? 'grid-cols-1'
              : availableProviders.length === 2 ? 'grid-cols-2'
                : availableProviders.length === 3 ? 'grid-cols-3'
                  : 'grid-cols-4'
            }`}>
            {availableProviders.map(p => {
              const isOn = provider === p.id
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => { haptic('light'); setProvider(p.id) }}
                  className={`
                    flex flex-col items-center justify-center gap-1 py-2.5 px-1
                    rounded-[10px] border-[1.5px] transition-all active:scale-[.97]
                    ${isOn
                      ? 'bg-amber-400/[.08] border-amber-400/40 text-white'
                      : 'bg-white/[.04] border-white/[.06] text-white/50'
                    }
                  `}
                >
                  <Icon size={16} className={isOn ? 'text-amber-400' : ''} />
                  <div className="text-[11px] font-semibold leading-none">{p.label}</div>
                  <div className="text-[9px] text-white/35 leading-none">{p.sub}</div>
                </button>
              )
            })}
          </div>
        </div>




        {/* Кнопка оплаты пакета — скрыта в режиме «Своя сумма» */}
        {!customMode && (
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
        )}
      </div>




      {/* Промокод */}
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




      {/* Футер */}
      <div className="text-center px-5 py-4 animate-fade-in [animation-delay:.2s]">
        <div className="text-[12px] text-white/30 mb-1.5">
          {providerNote}
        </div>
        <div className="text-[10px] text-white/[.15]">
          ИП Аневич А.С. · ИНН 246220127244
        </div>
      </div>
    </div>
  )
}