'use client'

import { Flame } from 'lucide-react'
import { useUser } from '@/hooks'

export function StickyHeader() {
  const { balance, isLoaded } = useUser()

  return (
    <div className="sticky-header">
      <div className="text-[16px] font-extrabold text-yellow-400 tracking-wider">
        SPICHKI AI
      </div>
      <div className="sticky-header__balance">
        <span className="sticky-header__amount">
          {isLoaded ? balance.toLocaleString() : '0'}
        </span>
        <Flame size={14} className="sticky-header__flame" />
        <span className="sticky-header__currency">спичек</span>
      </div>
    </div>
  )
}