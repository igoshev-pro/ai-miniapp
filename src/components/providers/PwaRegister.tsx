'use client'

import { useEffect } from 'react'

/**
 * Регистрирует service worker (`public/sw.js`), без которого Chrome/Android
 * не предлагает установить приложение на экран. Только в production: в dev
 * пути чанков не хешированы, и cache-first отдавал бы устаревший код.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
