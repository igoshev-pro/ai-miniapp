// src/components/TestModels.tsx
'use client'

import { useEffect } from 'react'
import { useModels } from '@/hooks'

export function TestModels() {
  const { models, isLoaded, isLoading, loadModels } = useModels()

  useEffect(() => {
    if (!isLoaded && !isLoading) loadModels()
  }, [isLoaded, isLoading, loadModels])

  return (
    <div className="p-5 bg-neutral-900 text-white">
      <h2 className="text-lg font-bold mb-2">Models Test</h2>
      <p className="text-sm text-white/70">
        Status: {isLoading ? 'Loading...' : isLoaded ? 'Loaded' : 'Not loaded'}
      </p>
      <p className="text-sm text-white/70 mb-3">Total models: {models.length}</p>

      <h3 className="text-base font-semibold mb-2">Text Models:</h3>
      <ul className="flex flex-col gap-1">
        {models
          .filter(m => m.category === 'text')
          .map(m => (
            <li key={m.id} className="text-sm text-white/80">
              {m.name} ({m.slug}) - {m.cost} 🔥 - {m.provider}
            </li>
          ))}
      </ul>
    </div>
  )
}