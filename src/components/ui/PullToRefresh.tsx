// src/components/ui/PullToRefresh.tsx

'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

const THRESHOLD = 70

export function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const moved = useRef(false)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return

      const scrollTop = window.scrollY || document.documentElement.scrollTop
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY
        pulling.current = true
        moved.current = false
      }
    },
    [isRefreshing],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || isRefreshing) return

      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current

      if (diff > 0) {
        moved.current = true
        const distance = Math.min(diff * 0.35, 110)
        setPullDistance(distance)
      } else {
        // Скролл вверх — отпускаем
        pulling.current = false
        if (moved.current) {
          setPullDistance(0)
          moved.current = false
        }
      }
    },
    [isRefreshing],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || !moved.current) {
      pulling.current = false
      moved.current = false
      return
    }
    pulling.current = false
    moved.current = false

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD * 0.6)
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
  const showIndicator = pullDistance > 8

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {showIndicator && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: `translate(-50%, ${pullDistance - 36}px)`,
            opacity: progress,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            transition: pulling.current ? 'none' : 'all 0.3s ease',
            pointerEvents: 'none' as const,
          }}
        >
          {isRefreshing ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <span
              style={{
                fontSize: 16,
                transform: `rotate(${progress * 180}deg)`,
                transition: 'transform 0.15s',
                display: 'block',
              }}
            >
              ↓
            </span>
          )}
        </div>
      )}

      <div
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