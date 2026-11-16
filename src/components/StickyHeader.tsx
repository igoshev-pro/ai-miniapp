'use client'

import { useUser } from '@/hooks'
import { useTelegram } from '@/context/TelegramContext'
import { Flame } from 'lucide-react'

interface Props {
  /** Клик по балансу — открыть Тарифы */
  onBalanceClick?: () => void
}

export function StickyHeader({ onBalanceClick }: Props) {
  const { balance, isLoaded } = useUser()
  const { haptic } = useTelegram()
  const amount = isLoaded ? balance.toLocaleString() : '0'

  const content = (
    <>
      <span className="sticky-header__amount">{amount}</span>
      <Flame size={14} className="sticky-header__flame" />
      <span className="sticky-header__currency">спичек</span>
    </>
  )

  return (
    <div className="sticky-header">
      <div className="text-[16px] font-extrabold text-yellow-400 tracking-wider">
        SPICHKI AI
      </div>
      {onBalanceClick ? (
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBalanceClick()
          }}
          aria-label={`Баланс: ${amount} спичек. Открыть тарифы`}
          className="sticky-header__balance bg-transparent border-none p-0 cursor-pointer active:scale-95 transition-transform"
        >
          {content}
        </button>
      ) : (
        <div className="sticky-header__balance">{content}</div>
      )}
    </div>
  )
}
