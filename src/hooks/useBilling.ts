// src/hooks/useBilling.ts

'use client'

import { useCallback, useState } from 'react'
import { apiClient, ENDPOINTS, isApiError } from '@/lib/api'
import { useUserStore } from '@/stores/user.store'
import { toast } from '@/stores/toast.store'

// --- Типы фронтенда ---

export type PaymentProvider =
  | 'yookassa'    // оставлен для обратной совместимости (на UI не показываем)
  | 'cryptomus'   // оставлен для обратной совместимости (на UI не показываем)
  | 'stars'
  | 'freedompay'
  | 'tochka'
  | 'heleket'

export type PaymentCurrency = 'RUB' | 'USD'

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price: number
  currency: string
  bonus?: number
  popular?: boolean
}

// 🆕 Free-модель из плана (соответствует ответу бека billing.service.ts)
export interface SubFreeModel {
  name: string
  slug: string
  limit: string
  isUnlimited: boolean
  requiredParams?: Record<string, any> | null
}

// 🆕 Фичи плана
export interface SubFeatures {
  maxDailyGenerations: number
  priorityQueue: boolean
  exclusiveModels: boolean
  noWatermark: boolean
  maxContextMessages: number
}

// 🔧 Расширенный тип под ответ бекенда (billing.service.ts → getSubscriptionPlans)
export interface SubscriptionPlan {
  id: string
  plan: string
  name: string
  description?: string
  price: number
  priceRub: number
  currency: string
  currencySymbol?: string
  period: string
  tokensPerMonth: number
  bonusTokens: number
  totalTokens?: number
  modelsAccess?: 'limited' | 'full'
  freeModels?: SubFreeModel[]
  features?: SubFeatures
  capabilities?: string[]
  color?: string
  icon?: string
  isPopular?: boolean
  tokenPriceRub?: number
  tokenPriceUsd?: number
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
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  paymentStatus?: string
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
  success: boolean
  effectLabel: string
  bonusTokens: number
  newBalance: number
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

// 🔧 Fallback подписок синхронизирован с FALLBACK_SUBSCRIPTION_PLANS на беке
const fallbackPlans: SubscriptionPlan[] = [
  {
    id: 'basic', plan: 'basic', name: 'Basic',
    price: 450, priceRub: 450, currency: 'RUB', period: '/мес',
    tokensPerMonth: 150, bonusTokens: 0, totalTokens: 150,
    modelsAccess: 'limited',
    freeModels: [],
    capabilities: [
      '1 500 запросов в текст',
      'Генерация 125 изображений',
      'Генерация 25 видео',
      'Генерация 36 песен',
    ],
    color: '#60a5fa',
    icon: 'Zap',
    isPopular: false,
  },
  {
    id: 'plus', plan: 'plus', name: 'Plus',
    price: 990, priceRub: 990, currency: 'RUB', period: '/мес',
    tokensPerMonth: 330, bonusTokens: 0, totalTokens: 330,
    modelsAccess: 'full',
    freeModels: [
      { name: 'gpt-oss-120b', slug: 'gpt-oss-120b', limit: '10/час, 60/сутки', isUnlimited: false },
      { name: 'DeepSeek V3.2', slug: 'deepseek-v3.2', limit: '10/час, 60/сутки', isUnlimited: false },
      { name: 'xAI: Grok 4.1 Fast', slug: 'grok-4.1-fast', limit: '10/час, 60/сутки', isUnlimited: false },
    ],
    capabilities: [
      'Бесплатная генерация текста 10/час, 60/сутки',
      'Генерация 275 изображений',
      'Генерация 55 видео',
      'Генерация 82 песен',
    ],
    color: '#fbbf24',
    icon: 'Star',
    isPopular: true,
  },
  {
    id: 'max', plan: 'max', name: 'Max',
    price: 2490, priceRub: 2490, currency: 'RUB', period: '/мес',
    tokensPerMonth: 830, bonusTokens: 50, totalTokens: 880,
    modelsAccess: 'full',
    freeModels: [
      { name: 'gpt-oss-120b', slug: 'gpt-oss-120b', limit: 'Безлимит', isUnlimited: true },
      { name: 'DeepSeek V3.2', slug: 'deepseek-v3.2', limit: 'Безлимит', isUnlimited: true },
      { name: 'xAI: Grok 4.1 Fast', slug: 'grok-4.1-fast', limit: 'Безлимит', isUnlimited: true },
    ],
    capabilities: [
      'Безлимитная генерация текста',
      'Генерация 733 изображений',
      'Генерация 146 видео',
      'Генерация 220 песен',
    ],
    color: '#f97316',
    icon: 'Rocket',
    isPopular: false,
  },
  {
    id: 'ultimate', plan: 'ultimate', name: 'Ultimate',
    price: 5990, priceRub: 5990, currency: 'RUB', period: '/мес',
    tokensPerMonth: 1997, bonusTokens: 220, totalTokens: 2217,
    modelsAccess: 'full',
    freeModels: [
      { name: 'GPT Image 1.5 Lite', slug: 'gpt-image-1.5-lite', limit: '10/час, 60/сутки', isUnlimited: false },
      { name: 'Imagen 4', slug: 'imagen-4', limit: '10/час, 60/сутки', isUnlimited: false },
      { name: 'Midjourney обычный', slug: 'midjourney', limit: '10/час, 60/сутки', isUnlimited: false, requiredParams: { mode: 'draft' } },
      { name: 'gpt-oss-120b', slug: 'gpt-oss-120b', limit: 'Безлимит', isUnlimited: true },
      { name: 'DeepSeek V3.2', slug: 'deepseek-v3.2', limit: 'Безлимит', isUnlimited: true },
      { name: 'xAI: Grok 4.1 Fast', slug: 'grok-4.1-fast', limit: 'Безлимит', isUnlimited: true },
    ],
    capabilities: [
      'Безлимитная генерация текста',
      'Бесплатная генерация изображений 10/час, 60/сутки',
      'Генерация 369 изображений',
      'Генерация 220 видео',
      'Генерация 554 песен',
    ],
    color: '#c084fc',
    icon: 'Diamond',
    isPopular: false,
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
  // 🔧 Передаём currency как query param чтобы бек вернул цены в нужной валюте
  const loadPlans = useCallback(async (currency: PaymentCurrency = 'RUB') => {
    try {
      const { data } = await apiClient.get<ApiResponse<SubscriptionPlan[]>>(
        ENDPOINTS.BILLING_PLANS,
        { params: { currency } },
      )
      const p = data.data || []
      const result = p.length > 0 ? p : fallbackPlans
      setPlans(result)
      return result
    } catch {
      setPlans(fallbackPlans)
      return fallbackPlans
    }
  }, [])

  // ─── Купить пакет токенов ─────────────────────────────
  const purchaseTokens = useCallback(
    async (
      packageId: string,
      provider: PaymentProvider = 'stars',
      currency: PaymentCurrency = 'RUB',
    ): Promise<string | null> => {
      try {
        setIsLoading(true)

        console.log('[useBilling] purchaseTokens →', { packageId, provider, currency })

        const { data } = await apiClient.post<ApiResponse<PaymentData>>(
          ENDPOINTS.BILLING_PAY_TOKENS,
          { packageId, provider, currency },
        )

        console.log('[useBilling] purchaseTokens ←', data)

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

  // ─── Купить произвольное число спичек ───────────────
  const purchaseCustomTokens = useCallback(
    async (
      tokens: number,
      provider: PaymentProvider = 'stars',
      currency: PaymentCurrency = 'RUB',
    ): Promise<string | null> => {
      try {
        setIsLoading(true)

        const { data } = await apiClient.post<ApiResponse<PaymentData>>(
          ENDPOINTS.BILLING_PAY_TOKENS_CUSTOM,
          { tokens, provider, currency },
        )

        const paymentUrl = data.data?.paymentUrl
        if (paymentUrl) return paymentUrl

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
      provider: PaymentProvider = 'stars',
      currency: PaymentCurrency = 'RUB',
    ): Promise<string | null> => {
      try {
        setIsLoading(true)
        const { data } = await apiClient.post<ApiResponse<PaymentData>>(
          ENDPOINTS.BILLING_PAY_SUBSCRIPTION,
          { plan, provider, currency },
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

        if (promoData?.bonusTokens > 0) {
          toast.success(
            promoData.effectLabel
              ? promoData.effectLabel
              : `+${promoData.bonusTokens} спичек!`
          )

          try {
            const profile = await apiClient.get<ApiResponse<any>>(ENDPOINTS.USER_ME)
            if (profile.data.data) {
              setUser(profile.data.data)
            }
          } catch {
            // не критично
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
    purchaseCustomTokens,
    subscribe,
    applyPromo,
    loadTransactions,
    loadReferralInfo,
  }
}