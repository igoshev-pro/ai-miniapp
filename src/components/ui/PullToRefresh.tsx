// src/components/ui/PullToRefresh.tsx

'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

const THRESHOLD = 80

export function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Только если прокрутка наверху
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || isRefreshing) return

      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current

      if (diff > 0) {
        // Сопротивление при оттягивании
        const distance = Math.min(diff * 0.4, 120)
        setPullDistance(distance)
      }
    },
    [isRefreshing],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, isRefreshing, onRefresh])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const showIndicator = pullDistance > 10

  return (
    <div
      ref={containerRef}
      className="ptr-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Индикатор */}
      {showIndicator && (
        <div
          className="ptr-indicator"
          style={{
            transform: `translateY(${pullDistance - 40}px)`,
            opacity: progress,
          }}
        >
          {isRefreshing ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <div
              className="ptr-arrow"
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            >
              ↓
            </div>
          )}
        </div>
      )}

      {/* Контент сдвигается вниз */}
      <div
        className="ptr-content"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling.current ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}