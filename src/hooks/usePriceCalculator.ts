'use client'

import { useEffect, useState, useRef } from 'react'
import { apiClient, ENDPOINTS } from '@/lib/api'

export interface PriceCalculation {
  costInTokens: number
  costInDollars?: number
  fallback: boolean
  matchedRule?: {
    conditions: Record<string, any>
    costInTokens: number
    label?: string
  }
  breakdown?: any
}

interface Response {
  success: boolean
  data: PriceCalculation
}

interface Options {
  enabled?: boolean
  debounceMs?: number
}

export function usePriceCalculator(
  modelSlug: string | null,
  params: Record<string, any>,
  options: Options = {},
) {
  const { enabled = true, debounceMs = 300 } = options
  const [price, setPrice] = useState<PriceCalculation | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  // Сериализуем params для зависимостей
  const paramsKey = JSON.stringify(params || {})

  useEffect(() => {
    if (!enabled || !modelSlug) {
      setPrice(null)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const myReqId = ++reqIdRef.current
      setIsCalculating(true)

      try {
        const { data } = await apiClient.post<Response>(
          ENDPOINTS.GENERATION_CALCULATE_PRICE,
          { modelSlug, params },
        )

        // Игнорируем устаревшие ответы
        if (myReqId !== reqIdRef.current) return

        if (data?.data) {
          setPrice(data.data)
        }
      } catch (e) {
        if (myReqId !== reqIdRef.current) return
        console.warn('[usePriceCalculator] Failed:', e)
      } finally {
        if (myReqId === reqIdRef.current) setIsCalculating(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [modelSlug, paramsKey, enabled, debounceMs]) // eslint-disable-line

  return { price, isCalculating }
}