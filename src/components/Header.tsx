'use client'

export function Header() {
  return (
    <header className="header fade-in fade-in--1">
      <div className="header__left">
        <img
          src="/logod.png"
          alt="SPICHKI AI"
          className="header__logo-img"
        />
      </div>
      <div className="header__right">SPICHKI AI</div>
    </header>
  )
}