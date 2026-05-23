// ─── Enums (синхронны с backend) ──────────────────────────────
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'generation'
  | 'refund'
  | 'referral_bonus'
  | 'promo_code'
  | 'subscription'
  | 'admin_adjustment'

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'

// ─── Lite-юзер из агрегатора ──────────────────────────────────
export interface AdminTxUserLite {
  _id: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  telegramId?: number | null
  email?: string | null
  tokenBalance?: number
  bonusTokens?: number
  cashbackBalance?: number
}

// ─── Транзакция ───────────────────────────────────────────────
export interface AdminTransaction {
  _id: string
  userId: string
  type: TransactionType
  amount: number
  description?: string
  paymentStatus?: PaymentStatus
  paymentProvider?: string
  paymentAmountRub?: number
  externalPaymentId?: string
  generationId?: string
  modelSlug?: string
  promoCode?: string
  referralUserId?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  user?: AdminTxUserLite | null
}

// ─── Параметры запроса ────────────────────────────────────────
export interface AdminTransactionsQuery {
  page?: number
  limit?: number
  search?: string
  userId?: string
  type?: TransactionType | 'all'
  status?: PaymentStatus | 'all'
  provider?: string
  modelSlug?: string
  promoCode?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  sortBy?: 'createdAt' | 'amount' | 'paymentAmountRub' | 'type' | 'paymentStatus'
  order?: 'asc' | 'desc'
}

// ─── Ответы ───────────────────────────────────────────────────
export interface AdminTransactionsListResponse {
  items: AdminTransaction[]
  total: number
  page: number
  pages: number
  totals: { count: number; tokens: number; rub: number }
}

export interface AdminTransactionDetails {
  transaction: AdminTransaction
  user: AdminTxUserLite | null
  referralUser: AdminTxUserLite | null
  relatedTransactions: AdminTransaction[]
}

export interface AdminTransactionsStats {
  period: { days: number; since: string }
  summary: {
    totalCount: number
    depositsRub: number
    subscriptionsRub: number
    totalRevenueRub: number
    tokensDeposited: number
    tokensSpent: number
    pendingCount: number
    failedCount: number
  }
  byType: Array<{ _id: TransactionType; count: number; tokens: number; rub: number }>
  byStatus: Array<{ _id: PaymentStatus; count: number; rub: number }>
  byProvider: Array<{ _id: string; count: number; rub: number; tokens: number }>
  revenueByDay: Array<{
    _id: { date: string; type: TransactionType }
    rub: number
    tokens: number
    count: number
  }>
  generationsByDay: Array<{
    _id: string
    tokens: number
    count: number
    costDollars: number
  }>
  topModels: Array<{
    _id: string
    count: number
    tokens: number
    costDollars: number
  }>
  topSpenders: Array<{
    userId: string
    totalRub: number
    totalTokens: number
    paymentsCount: number
    user: AdminTxUserLite
  }>
  promoStats: Array<{ _id: string; usageCount: number; bonusTokens: number }>
  refunds: { count: number; tokens: number }
}