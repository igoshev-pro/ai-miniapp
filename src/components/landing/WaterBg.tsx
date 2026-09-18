'use client'

import { useEffect, useRef } from 'react'

/**
 * Фон-«водная гладь». Вся подложка лендинга ведёт себя как тёмная вода:
 * курсор оставляет расходящуюся рябь, которая преломляет тонкую сетку
 * и даёт едва заметные блики. Никаких колец и точек — только поверхность.
 *
 * Как устроено: классическая двухбуферная симуляция высоты воды на
 * маленьком буфере (~60 тыс. ячеек), результат растягивается на экран
 * со сглаживанием. По градиенту высоты смещаем выборку сетки (преломление)
 * и добавляем блик от бокового света. Всё рисуется в ImageData один раз
 * за кадр — на средних ноутбуках это ~1–2 мс.
 *
 * Отключено при prefers-reduced-motion. На тач-экранах реагирует на палец.
 */
export function WaterBg() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d', { alpha: true })!

    // ── размеры буфера ──
    let W = 0
    let H = 0
    let scale = 1 // css px на ячейку
    let cur = new Float32Array(0)
    let prev = new Float32Array(0)
    let img: ImageData | null = null

    const setup = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const cells = 60000
      scale = Math.sqrt((vw * vh) / cells)
      W = Math.max(64, Math.round(vw / scale))
      H = Math.max(64, Math.round(vh / scale))
      canvas.width = W
      canvas.height = H
      canvas.style.width = vw + 'px'
      canvas.style.height = vh + 'px'
      cur = new Float32Array(W * H)
      prev = new Float32Array(W * H)
      img = ctx.createImageData(W, H)
    }
    setup()

    let resizeT = 0
    const onResize = () => {
      clearTimeout(resizeT)
      resizeT = window.setTimeout(setup, 120)
    }
    window.addEventListener('resize', onResize)

    // ── капля от курсора ──
    let lastX = -1
    let lastY = -1
    const drop = (cx: number, cy: number, radius: number, strength: number) => {
      const x = Math.round(cx / scale)
      const y = Math.round(cy / scale)
      const r2 = radius * radius
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const d2 = i * i + j * j
          if (d2 > r2) continue
          const px = x + i
          const py = y + j
          if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1) continue
          const k = 1 - d2 / r2
          prev[py * W + px] += strength * k
        }
      }
    }

    const onMove = (cx: number, cy: number) => {
      if (lastX < 0) {
        lastX = cx
        lastY = cy
        return
      }
      const dist = Math.hypot(cx - lastX, cy - lastY)
      if (dist < scale * 1.2) return
      // сила капли растёт со скоростью, но упирается в потолок — «слегка»
      const strength = Math.min(1.6, 0.35 + dist / 120)
      drop(cx, cy, 2, strength)
      lastX = cx
      lastY = cy
    }
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) onMove(t.clientX, t.clientY)
    }
    const onDown = (e: MouseEvent) => drop(e.clientX, e.clientY, 4, 4)

    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })

    // ── редкая «капля дождя», чтобы вода не была мёртвой без курсора ──
    let ambientT = 0
    const ambient = () => {
      drop(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 2, 0.5)
      ambientT = window.setTimeout(ambient, 2600 + Math.random() * 3200)
    }
    ambientT = window.setTimeout(ambient, 1800)

    // ── кадр ──
    const DAMP = 0.975
    let raf = 0

    const tick = () => {
      // шаг волны
      for (let y = 1; y < H - 1; y++) {
        const row = y * W
        for (let x = 1; x < W - 1; x++) {
          const i = row + x
          let v = (prev[i - 1] + prev[i + 1] + prev[i - W] + prev[i + W]) * 0.5 - cur[i]
          v *= DAMP
          cur[i] = v
        }
      }
      const t = prev
      prev = cur
      cur = t

      // отрисовка
      const data = img!.data
      for (let y = 1; y < H - 1; y++) {
        const row = y * W
        for (let x = 1; x < W - 1; x++) {
          const i = row + x
          const dx = prev[i - 1] - prev[i + 1]
          const dy = prev[i - W] - prev[i + W]

          // Сетки нет (заказчик: «фон не нужен») — вода видна только по бликам:
          // свет сверху-слева ловит склоны волн. Холодно-белый, полупрозрачный.
          const glint = Math.max(0, dx * 0.9 + dy * 0.5)
          const a = Math.min(0.3, glint * 0.22)

          const o = i * 4
          data[o] = 225
          data[o + 1] = 232
          data[o + 2] = 245
          data[o + 3] = Math.round(a * 255)
        }
      }
      ctx.putImageData(img!, 0, 0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeT)
      clearTimeout(ambientT)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
    }
  }, [])

  return <canvas className="lp-bg__water" ref={ref} aria-hidden="true" />
}
