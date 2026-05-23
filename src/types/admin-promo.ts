// src/types/admin-promo.ts

export enum PromoCodeType {
  BONUS_TOKENS = 'bonus_tokens',
  DISCOUNT_PERCENT = 'discount_percent',
  DISCOUNT_RUB = 'discount_rub',
  SUBSCRIPTION_DAYS = 'subscription_days',
}

export enum PromoApplyTo {
  ANY = 'any',
  SUBSCRIPTION = 'subscription',
  TOKEN_PACKAGE = 'token_package',
  STANDALONE = 'standalone',
}

export interface PromoUsage {
  userId: string
  usesCount: number
  lastUsedAt: string
}

export interface AdminPromoCode {
  _id: string
  code: string
  description: string
  type: PromoCodeType
  applyTo: PromoApplyTo

  bonusTokens: number
  discountPercent: number
  discountRub: number
  subscriptionDays: number
  subscriptionPlan: string | null

  applicablePlans: string[]
  applicablePackages: string[]
  minPurchaseRub: number

  maxUses: number | null
  currentUses: number
  maxUsesPerUser: number

  startsAt: string | null
  expiresAt: string | null

  isActive: boolean

  usages: PromoUsage[]

  totalDiscountGivenRub: number
  totalBonusTokensGiven: number
  totalSubscriptionDaysGiven: number

  createdBy: string | null
  internalNote: string | null

  createdAt: string
  updatedAt: string
}

export interface AdminPromoListQuery {
  page?: number
  limit?: number
  search?: string
  type?: PromoCodeType | 'all'
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'exhausted'
  sortBy?: 'createdAt' | 'currentUses' | 'expiresAt' | 'code'
  order?: 'asc' | 'desc'
}

export interface AdminPromoListResponse {
  items: AdminPromoCode[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AdminPromoStats {
  code: string
  type: PromoCodeType
  isActive: boolean
  currentUses: number
  maxUses: number | null
  remainingUses: number | null
  totalDiscountGivenRub: number
  totalBonusTokensGiven: number
  totalSubscriptionDaysGiven: number
  uniqueUsers: number
  lastUsedAt: string | null
  startsAt: string | null
  expiresAt: string | null
}

// Payload для create / update
export interface AdminPromoUpsert {
  code?: string
  description: string
  type: PromoCodeType
  applyTo: PromoApplyTo

  bonusTokens?: number
  discountPercent?: number
  discountRub?: number
  subscriptionDays?: number
  subscriptionPlan?: string | null

  applicablePlans?: string[]
  applicablePackages?: string[]
  minPurchaseRub?: number

  maxUses?: number | null
  maxUsesPerUser?: number

  startsAt?: string | null
  expiresAt?: string | null

  isActive?: boolean
  internalNote?: string | null
}