'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, X } from 'lucide-react'

const DISMISS_KEY = 'spichki:guest-banner-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Полоса над лентой для гостя: ведёт на лендинг /start.
// Закрывается крестиком и больше не показывается в этом браузере.
export function GuestLandingBanner() {
  const [hidden, setHidden] = useState(wasDismissed)

  if (hidden) return null

  return (
    <div
      className="
        fade-in fade-in--1 relative mb-3
        rounded-2xl border border-white/[0.08]
        bg-[var(--bg-glass)] backdrop-blur-[20px]
        transition-colors duration-200
        lg:hover:bg-white/[0.07]
      "
    >
      <Link
        href="/start"
        className="flex items-center gap-3 py-3 pl-3.5 pr-11 no-underline"
      >
        <span
          className="
            w-9 h-9 shrink-0 rounded-[10px]
            flex items-center justify-center
            bg-yellow-400/[0.1] text-[var(--accent-yellow)]
          "
        >
          <Sparkles size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold text-white">
            Впервые здесь?
          </span>
          <span className="block text-[11px] text-white/50 truncate">
            Посмотрите, что умеет сервис и сколько это стоит
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-white/40" />
      </Link>

      <button
        type="button"
        aria-label="Скрыть"
        className="
          absolute top-1/2 right-2 -translate-y-1/2
          w-7 h-7 rounded-lg border-none bg-transparent
          flex items-center justify-center
          text-white/25 cursor-pointer
          transition-colors duration-150
          hover:text-white/60
        "
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(DISMISS_KEY, '1')
          } catch {
            // приватный режим — просто скрываем до перезагрузки
          }
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
