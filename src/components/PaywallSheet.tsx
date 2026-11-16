'use client'

// Пейволл «Спички закончились». Открывается через usePaywallStore / openPaywall
// вместо тоста об ошибке, рендерится один раз в SpichkiApp.
// На мобиле — нижний лист над BottomNav, на десктопе — окно по центру.

import { useEffect } from 'react'
import { Flame, Crown, X, Zap } from 'lucide-react'
import { usePaywallStore } from '@/stores/paywall.store'
import { useTelegram } from '@/context/TelegramContext'
import { formatCost } from '@/lib/data'
import { FirstTopupOfferBanner } from './ui/FirstTopupOfferBanner'

interface Props {
  onChooseTariff: () => void
  onTopUp: () => void
}

export function PaywallSheet({ onChooseTariff, onTopUp }: Props) {
  const { haptic } = useTelegram()
  const isOpen = usePaywallStore((s) => s.isOpen)
  const need = usePaywallStore((s) => s.need)
  const have = usePaywallStore((s) => s.have)
  const close = usePaywallStore((s) => s.close)

  // Esc закрывает окно
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen) return null

  const missing =
    need != null && have != null && need > have ? Math.round((need - have) * 10) / 10 : null

  const title =
    missing != null
      ? `Не хватает ${formatCost(missing)} ${plural(missing)}`
      : 'Спички закончились'

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />
      <div className="fixed inset-x-0 bottom-0 z-[111] flex justify-center lg:inset-0 lg:items-center lg:p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          className="
            pointer-events-auto relative w-full max-w-md
            rounded-t-[22px] lg:rounded-[22px]
            px-5 pt-3 pb-[calc(20px+var(--safe-bottom,0px))] lg:pb-5 lg:pt-5
            max-h-[88vh] overflow-y-auto overscroll-contain
            animate-fade-in
          "
          style={{
            background: 'rgba(18, 18, 22, 0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Ручка листа — только на мобиле */}
          <div className="lg:hidden flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-white/15" />
          </div>

          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => {
              haptic('light')
              close()
            }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/[.06] border-none text-white/50 active:scale-95 cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 mb-3 rounded-[18px] flex items-center justify-center bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(239,68,68,0.12))] text-amber-400">
              <Flame size={28} />
            </div>
            <h2 id="paywall-title" className="text-[19px] font-bold text-white leading-tight">
              {title}
            </h2>
            {need != null && have != null && (
              <div className="mt-1.5 text-[12px] text-white/40 inline-flex items-center gap-1">
                Нужно {formatCost(need)} <Flame size={11} className="text-amber-400" /> · на балансе{' '}
                {formatCost(have)}
              </div>
            )}
            <p className="mt-2.5 text-[13px] text-white/60 leading-[1.45]">
              С подпиской спички приходят каждый месяц и выходят дешевле, а ещё открываются
              бесплатные модели.
            </p>
          </div>

          <FirstTopupOfferBanner compact className="mt-4" />

          <div className="flex flex-col gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                haptic('medium')
                close()
                onChooseTariff()
              }}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black text-[15px] font-semibold border-none rounded-xl py-3.5 cursor-pointer active:scale-[.98] transition-transform"
            >
              <Crown size={16} /> Выбрать тариф
            </button>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                close()
                onTopUp()
              }}
              className="w-full flex items-center justify-center gap-2 bg-white/[.06] border border-white/[.08] text-white text-[14px] font-semibold rounded-xl py-3 cursor-pointer active:scale-[.98] transition-transform"
            >
              <Zap size={15} className="text-amber-400" /> Пополнить спички
            </button>
            <button
              type="button"
              onClick={close}
              className="mt-1 bg-transparent border-none text-[13px] text-white/40 hover:text-white/60 py-1.5 cursor-pointer transition-colors"
            >
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// «Не хватает 1 спички / 21 спички», иначе «… спичек»
function plural(n: number): string {
  if (!Number.isInteger(n)) return 'спички'
  return n % 10 === 1 && n % 100 !== 11 ? 'спички' : 'спичек'
}
