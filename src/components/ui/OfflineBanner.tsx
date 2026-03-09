// src/components/ui/OfflineBanner.tsx

'use client'

import { WifiOff } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'

export function OfflineBanner() {
  const { isOffline } = useOffline()

  if (!isOffline) return null

  return (
    <div className="offline-banner">
      <WifiOff size={14} />
      <span>Нет подключения к интернету</span>
    </div>
  )
}