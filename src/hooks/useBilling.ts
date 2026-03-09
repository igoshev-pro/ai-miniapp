// src/hooks/useBilling.ts

'use client'

import { useCallback, useState } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'

// --- Типы ---

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price: number
  currency: string
  bonus?: number
  popular?: boolean
}

export interface Subscription {
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
}

interface PaymentResponse {
  paymentUrl?: string
  paymentId: string
  status: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  page: number
  pages: number
}

interface PackagesResponse {
  packages: TokenPackage[]
}

interface SubscriptionsResponse {
  plans: Subscription[]
}

interface PromoResponse {
  success: boolean
  tokensAdded: number
  message: string
}

interface ReferralInfoResponse {
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

// --- Hook ---

export function useBilling() {
  const { setUser } = useUserStore()
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const [plans, setPlans] = useState<Subscription[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [referralInfo, setReferralInfo] = useState<ReferralInfoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Загрузить пакеты токенов
  const loadPackages = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PackagesResponse>(ENDPOINTS.BILLING_PACKAGES)
      setPackages(data.packages)
      return data.packages
    } catch {
      // Fallback — захардкоженные пакеты
      const fallback: TokenPackage[] = [
        { id: 'p1', name: 'Старт',      tokens: 100,  price: 99,   currency: '₽' },
        { id: 'p2', name: 'Базовый',    tokens: 300,  price: 249,  currency: '₽', bonus: 50 },
        { id: 'p3', name: 'Популярный', tokens: 700,  price: 499,  currency: '₽', bonus: 150, popular: true },
        { id: 'p4', name: 'Продвинутый', tokens: 1500, price: 999,  currency: '₽', bonus: 400 },
        { id: 'p5', name: 'Максимум',   tokens: 4000, price: 2499, currency: '₽', bonus: 1200 },
      ]
      setPackages(fallback)
      return fallback
    }
  }, [])

  // Загрузить планы подписок
  const loadPlans = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SubscriptionsResponse>('/billing/subscriptions')
      setPlans(data.plans)
      return data.plans
    } catch {
      const fallback: Subscription[] = [
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
      setPlans(fallback)
      return fallback
    }
  }, [])

  // Купить пакет токенов
  const purchaseTokens = useCallback(async (packageId: string): Promise<string | null> => {
    try {
      setIsLoading(true)
      const { data } = await apiClient.post<PaymentResponse>(ENDPOINTS.BILLING_PAY, {
        packageId,
      })

      if (data.paymentUrl) {
        return data.paymentUrl
      }

      // Если оплата через TG Stars — баланс обновится через WS
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
  }, [])

  // Купить подписку
  const subscribe = useCallback(async (planId: string): Promise<string | null> => {
    try {
      setIsLoading(true)
      const { data } = await apiClient.post<PaymentResponse>(ENDPOINTS.BILLING_SUBSCRIBE, {
        plan: planId,
      })

      if (data.paymentUrl) {
        return data.paymentUrl
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
  }, [])

  // Применить промокод
  const applyPromo = useCallback(async (code: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const { data } = await apiClient.post<PromoResponse>(ENDPOINTS.BILLING_PROMO, { code })

      if (data.success) {
        toast.success(data.message || `+${data.tokensAdded} спичек!`)
        // Обновляем профиль
        const profile = await apiClient.get(ENDPOINTS.USER_ME)
        setUser(profile.data)
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
  }, [setUser])

  // Загрузить историю транзакций
  const loadTransactions = useCallback(async (page = 1, limit = 20) => {
    try {
      const { data } = await apiClient.get<TransactionsResponse>(
        `${ENDPOINTS.BILLING_TRANSACTIONS}?page=${page}&limit=${limit}`
      )
      if (page === 1) {
        setTransactions(data.transactions)
      } else {
        setTransactions((prev) => [...prev, ...data.transactions])
      }
      setTransactionsTotal(data.total)
      return data
    } catch {
      toast.error('Не удалось загрузить историю')
      return null
    }
  }, [])

  // Загрузить реферальную информацию
  const loadReferralInfo = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ReferralInfoResponse>(ENDPOINTS.REFERRAL_INFO)
      setReferralInfo(data)
      return data
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