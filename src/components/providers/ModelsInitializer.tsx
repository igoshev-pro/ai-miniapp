// src/components/providers/ModelsInitializer.tsx

'use client'

import { useEffect } from 'react'
import { useModels } from '@/hooks'

export function ModelsInitializer() {
  const { loadModels } = useModels()

  useEffect(() => {
    // Загружаем модели при монтировании
    loadModels()
  }, [loadModels])

  return null
}