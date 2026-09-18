'use client'

import { useEffect } from 'react'

/**
 * Магнитные кнопки: .lp-btn и .sc-cta__btn тянутся к курсору в радиусе ~70px
 * и возвращаются на место, когда он уходит. Сам курсор — системный: отдельные
 * рисованные курсоры заказчик отверг, «водная» реакция живёт в WaterBg.
 * Только для мыши, без prefers-reduced-motion.
 */
export function Cursor() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const magnets = Array.from(
      document.querySelectorAll<HTMLElement>('.lp .lp-btn, .lp .sc-cta__btn'),
    )
    const RADIUS = 70
    const PULL = 0.35
    let mx = -1000
    let my = -1000
    let active: HTMLElement | null = null
    let raf = 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }

    const tick = () => {
      let nearest: HTMLElement | null = null
      let best = RADIUS
      for (const m of magnets) {
        const b = m.getBoundingClientRect()
        if (b.width === 0) continue
        const dx = mx - (b.left + b.width / 2)
        const dy = my - (b.top + b.height / 2)
        const dist = Math.hypot(dx, dy) - Math.min(b.width, b.height) / 2
        if (dist < best) {
          best = dist
          nearest = m
          m.style.transform = `translate(${dx * PULL}px, ${dy * PULL}px)`
        }
      }
      if (active && active !== nearest) active.style.transform = ''
      active = nearest
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      magnets.forEach((m) => (m.style.transform = ''))
    }
  }, [])

  return null
}
