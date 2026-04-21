'use client'

export function Header() {
  return (
    <header
      className="
        header
        flex items-center justify-between
        py-3 px-4
        fade-in fade-in--1
      "
    >
      <div className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logod.png"
          alt="SPICHKI AI"
          className="h-7 w-auto object-contain"
        />
      </div>
      <div className="text-[13px] font-extrabold tracking-[1.5px] text-white/80">
        SPICHKI AI
      </div>
    </header>
  )
}