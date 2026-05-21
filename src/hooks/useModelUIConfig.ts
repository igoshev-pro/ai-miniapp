'use client'

import { useEffect, useState, useRef } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'

export interface UIParameterOption {
  value: string
  label: string
}

export interface UIParameter {
  key: string
  label: string
  type: 'select' | 'boolean' | 'number' | 'text'
  affectsPrice?: boolean
  defaultValue?: any
  options?: UIParameterOption[]
  min?: number
  max?: number
}

export interface InputCapabilities {
  acceptsImages?: boolean
  maxInputImages?: number
  acceptsVideos?: boolean
}

export interface PricingRule {
  conditions: Record<string, any>
  costInTokens: number
  costInDollars?: number
  label?: string
}

export interface ModelUIConfig {
  slug: string
  displayName?: string
  uiParameters: UIParameter[]
  pricingMatrix: PricingRule[]
  inputCapabilities: InputCapabilities
  defaultParams?: Record<string, any>
}

interface Response {
  success: boolean
  data: ModelUIConfig
}

// Кэш на время жизни сессии
const cache = new Map<string, ModelUIConfig>()
const inflight = new Map<string, Promise<ModelUIConfig | null>>()

export function useModelUIConfig(slug: string | null) {
  const [config, setConfig] = useState<ModelUIConfig | null>(
    slug ? cache.get(slug) ?? null : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!slug) {
      setConfig(null)
      return
    }

    // Из кэша
    const cached = cache.get(slug)
    if (cached) {
      setConfig(cached)
      setError(null)
      return
    }

    // In-flight
    const inFlightPromise = inflight.get(slug)
    if (inFlightPromise) {
      setIsLoading(true)
      inFlightPromise.then((res) => {
        if (mounted.current && res) setConfig(res)
        if (mounted.current) setIsLoading(false)
      })
      return
    }

    // Загружаем
    setIsLoading(true)
    setError(null)

    const promise = apiClient
      .get<Response>(ENDPOINTS.GENERATION_UI_CONFIG(slug))
      .then(({ data }) => {
        const cfg = data?.data
        if (cfg) {
          cache.set(slug, cfg)
          return cfg
        }
        return null
      })
      .catch((e) => {
        console.warn(`[useModelUIConfig] Failed for ${slug}:`, e)
        return null
      })
      .finally(() => {
        inflight.delete(slug)
      })

    inflight.set(slug, promise)

    promise.then((res) => {
      if (!mounted.current) return
      if (res) {
        setConfig(res)
      } else {
        setError('Не удалось загрузить настройки модели')
      }
      setIsLoading(false)
    })
  }, [slug])

  return { config, isLoading, error }
}