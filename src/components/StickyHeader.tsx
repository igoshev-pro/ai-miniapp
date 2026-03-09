// src/components/StickyHeader.tsx

'use client'

import { Flame } from 'lucide-react'
import { useUser } from '@/hooks'

export function StickyHeader() {
  const { balance, isLoaded } = useUser()

  return (
    <div className="sticky-header fade-in fade-in--1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* <img
        src="/logo.png"
        alt="Спички"
        className="sticky-header__logo-img"
      /> */}
      <div>SPICHKI</div>

      <div className="sticky-header__balance">
        <span className="sticky-header__amount">
          {isLoaded ? balance.toLocaleString() : '0'}
        </span>
        <Flame size={14} className="sticky-header__flame" style={{ color: 'var(--accent-red)' }} />
        <span className="sticky-header__currency">спичек</span>
      </div>
    </div>
  )
}