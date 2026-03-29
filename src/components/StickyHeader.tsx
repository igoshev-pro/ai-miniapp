'use client'

import { Flame } from 'lucide-react'
import { useUser } from '@/hooks'

export function StickyHeader() {
  const { balance, isLoaded } = useUser()

  return (
    <div className="sticky-header fade-in fade-in--1">
      <div className="sticky-header__logo" style={{ color: '#facc15', fontWeight: 700 }}>
        SPICHKI AI
      </div>

      <div className="sticky-header__balance">
        <span className="sticky-header__amount">
          {isLoaded ? balance.toLocaleString() : '0'}
        </span>
        <Flame size={14} className="sticky-header__flame" style={{ color: '#ef4444' }} />
        <span className="sticky-header__currency">спичек</span>
      </div>
    </div>
  )
}
