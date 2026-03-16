// src/components/TestModels.tsx

'use client'

import { useEffect } from 'react'
import { useModels } from '@/hooks'

export function TestModels() {
  const { models, isLoaded, isLoading, loadModels } = useModels()

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      loadModels()
    }
  }, [isLoaded, isLoading, loadModels])

  return (
    <div style={{ padding: '20px', background: '#111', color: '#fff' }}>
      <h2>Models Test</h2>
      <p>Status: {isLoading ? 'Loading...' : isLoaded ? 'Loaded' : 'Not loaded'}</p>
      <p>Total models: {models.length}</p>
      <h3>Text Models:</h3>
      <ul>
        {models
          .filter(m => m.category === 'text')
          .map(m => (
            <li key={m.id}>
              {m.name} ({m.slug}) - {m.cost} 🔥 - {m.provider}
            </li>
          ))}
      </ul>
    </div>
  )
}