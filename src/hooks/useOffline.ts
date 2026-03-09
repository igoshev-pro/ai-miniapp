// src/hooks/useOffline.ts

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/stores/toast.store'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const goOffline = () => {
      setIsOffline(true)
      toast.warning('Нет соединения с интернетом')
    }

    const goOnline = () => {
      setIsOffline(false)
      toast.success('Соединение восстановлено')
    }

    // Начальная проверка
    if (!navigator.onLine) {
      setIsOffline(true)
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return { isOffline }
}