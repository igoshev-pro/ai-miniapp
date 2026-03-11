// src/hooks/useBilling.ts

'use client'

import { useCallback, useState } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'

// --- Типы фронтенда ---

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price: number
  currency: string
  bonus?: number
  popular?: boolean
}

export interface SubscriptionPlan {
  id: string
  plan: 'basic' | 'pro' | 'unlimited'
  name: string
  price: number
  period: string
  features: string[]
  tokensPerMonth: number
}

export interface Transaction {
  id: string
  type: 'purchase' | 'subscription' | 'bonus' | 'referral' | 'spending' | 'refund'
  amount: number
  tokens?: number
  description: string
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
  modelSlug?: string
  generationType?: string
  paymentAmountRub?: number
}

// --- Типы ответов бекенда ---

interface BackendTransaction {
  _id: string
  userId: string
  type: string
  amount: number          // в токенах
  balanceBefore: number
  balanceAfter: number
  description: string
  paymentStatus?: string  // completed | pending | failed
  generationId?: string
  generationType?: string
  modelSlug?: string
  externalPaymentId?: string
  paymentProvider?: string
  paymentAmountRub?: number
  promoCode?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface TransactionsData {
  transactions: BackendTransaction[]
  total: number
  page: number
  pages: number
}

interface PaymentData {
  paymentUrl?: string
  paymentId?: string
  status?: string
}

interface PromoData {
  tokensAdded: number
  message?: string
}

interface ReferralInfoData {
  referralCode: string
  referralCount: number
  totalEarned: number
  referrals: {
    id: string
    username?: string
    firstName: string
    joinedAt: string
    earned: number
  }[]
}

// --- Маппинг ---

function mapTransaction(tx: BackendTransaction): Transaction {
  return {
    id: tx._id,
    type: tx.type as Transaction['type'],
    amount: Math.abs(tx.amount),
    tokens: Math.abs(tx.amount),
    description: tx.description,
    status: (tx.paymentStatus as Transaction['status']) || 'completed',
    createdAt: tx.createdAt,
    modelSlug: tx.modelSlug,
    generationType: tx.generationType,
    paymentAmountRub: tx.paymentAmountRub,
  }
}

// --- Fallback данные ---

const fallbackPackages: TokenPackage[] = [
  { id: 'p1', name: 'Старт', tokens: 100, price: 99, currency: '₽' },
  { id: 'p2', name: 'Базовый', tokens: 300, price: 249, currency: '₽', bonus: 50 },
  { id: 'p3', name: 'Популярный', tokens: 700, price: 499, currency: '₽', bonus: 150, popular: true },
  { id: 'p4', name: 'Продвинутый', tokens: 1500, price: 999, currency: '₽', bonus: 400 },
  { id: 'p5', name: 'Максимум', tokens: 4000, price: 2499, currency: '₽', bonus: 1200 },
]

const fallbackPlans: SubscriptionPlan[] = [
  {
    id: 's1', plan: 'basic', name: 'Basic', price: 299, period: '/мес',
    tokensPerMonth: 500,
    features: ['500 спичек/мес', 'Текст: без лимита', 'Изображения: 50', 'Видео: 5'],
  },
  {
    id: 's2', plan: 'pro', name: 'Pro', price: 699, period: '/мес',
    tokensPerMonth: 2000,
    features: ['2 000 спичек/мес', 'Текст: без лимита', 'Изображения: 500', 'Видео: 50', 'Аудио: 200', 'Приоритетная очередь'],
  },
  {
    id: 's3', plan: 'unlimited', name: 'Unlimited', price: 1999, period: '/мес',
    tokensPerMonth: 10000,
    features: ['10 000 спичек/мес', 'Всё без лимита', 'API доступ', 'Приоритетная поддержка'],
  },
]

// --- Hook ---

export function useBilling() {
  const { setUser } = useUserStore()
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [referralInfo, setReferralInfo] = useState<ReferralInfoData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ─── Загрузить пакеты токенов ─────────────────────────
  const loadPackages = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ApiResponse<TokenPackage[]>>(
        ENDPOINTS.BILLING_PACKAGES,
      )
      const pkgs = data.data || []
      setPackages(pkgs.length > 0 ? pkgs : fallbackPackages)
    } catch {
      setPackages(fallbackPackages)
    }
  }, [])

  // ─── Загрузить планы подписок ─────────────────────────
  const loadPlans = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ApiResponse<SubscriptionPlan[]>>(
        ENDPOINTS.BILLING_PLANS,
      )
      const p = data.data || []
      setPlans(p.length > 0 ? p : fallbackPlans)
      return p.length > 0 ? p : fallbackPlans
    } catch {
      setPlans(fallbackPlans)
      return fallbackPlans
    }
  }, [])

  // ─── Купить пакет токенов ─────────────────────────────
  const purchaseTokens = useCallback(
    async (
      packageId: string,
      provider: 'yookassa' | 'cryptomus' | 'stars' = 'stars',
    ): Promise<string | null> => {
      try {
        setIsLoading(true)
        const { data } = await apiClient.post<ApiResponse<PaymentData>>(
          ENDPOINTS.BILLING_PAY_TOKENS,
          { packageId, provider },
        )

        const paymentUrl = data.data?.paymentUrl
        if (paymentUrl) {
          return paymentUrl
        }

        toast.success('Оплата обрабатывается...')
        return null
      } catch (err) {
        if (isApiError(err)) {
          toast.error(err.message || 'Ошибка оплаты')
        } else {
          toast.error('Ошибка соединения')
        }
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // ─── Купить подписку ──────────────────────────────────
  const subscribe = useCallback(
    async (
      plan: string,
      provider: 'yookassa' | 'cryptomus' | 'stars' = 'stars',
    ): Promise<string | null> => {
      try {
        setIsLoading(true)
        const { data } = await apiClient.post<ApiResponse<PaymentData>>(
          ENDPOINTS.BILLING_PAY_SUBSCRIPTION,
          { plan, provider },
        )

        const paymentUrl = data.data?.paymentUrl
        if (paymentUrl) {
          return paymentUrl
        }

        toast.success('Подписка оформляется...')
        return null
      } catch (err) {
        if (isApiError(err)) {
          toast.error(err.message || 'Ошибка оформления подписки')
        } else {
          toast.error('Ошибка соединения')
        }
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // ─── Применить промокод ───────────────────────────────
  const applyPromo = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        setIsLoading(true)
        const { data } = await apiClient.post<ApiResponse<PromoData>>(
          ENDPOINTS.BILLING_PROMO,
          { code },
        )

        const promoData = data.data
        if (promoData?.tokensAdded) {
          toast.success(promoData.message || `+${promoData.tokensAdded} спичек!`)

          // Обновляем профиль пользователя
          try {
            const profile = await apiClient.get<ApiResponse<any>>(ENDPOINTS.USER_ME)
            if (profile.data.data) {
              setUser(profile.data.data)
            }
          } catch {
            // Не критично
          }

          return true
        }

        toast.error('Промокод недействителен')
        return false
      } catch (err) {
        if (isApiError(err)) {
          toast.error(err.message || 'Промокод недействителен')
        } else {
          toast.error('Ошибка соединения')
        }
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [setUser],
  )

  // ─── Загрузить историю транзакций ─────────────────────
  const loadTransactions = useCallback(
    async (page = 1, limit = 20) => {
      try {
        const { data } = await apiClient.get<ApiResponse<TransactionsData>>(
          ENDPOINTS.BILLING_TRANSACTIONS,
          { params: { page, limit } },
        )

        const txData = data.data
        const mapped = (txData?.transactions || []).map(mapTransaction)

        if (page === 1) {
          setTransactions(mapped)
        } else {
          setTransactions((prev) => [...prev, ...mapped])
        }

        setTransactionsTotal(txData?.total || 0)
        return txData
      } catch (err) {
        if (page === 1) {
          // Не показываем ошибку при первой загрузке если нет транзакций
          setTransactions([])
          setTransactionsTotal(0)
        }
        console.error('[useBilling] loadTransactions failed:', err)
        return null
      }
    },
    [],
  )

  // ─── Загрузить реферальную информацию ─────────────────
  const loadReferralInfo = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ApiResponse<ReferralInfoData>>(
        ENDPOINTS.REFERRAL_INFO,
      )
      const info = data.data
      setReferralInfo(info)
      return info
    } catch {
      console.error('[useBilling] referral info failed')
      return null
    }
  }, [])

  return {
    packages,
    plans,
    transactions,
    transactionsTotal,
    referralInfo,
    isLoading,
    loadPackages,
    loadPlans,
    purchaseTokens,
    subscribe,
    applyPromo,
    loadTransactions,
    loadReferralInfo,
  }
}