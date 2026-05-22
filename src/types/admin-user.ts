export type UserRole = 'user' | 'admin' | 'moderator' // подгони под свой enum
export type AuthProvider = 'telegram' | 'email' | 'google'
export type SubscriptionPlan = 'free' | 'pro' | 'premium' // подгони

export interface AdminUser {
  _id: string
  authProvider: AuthProvider
  telegramId: number | null
  email: string | null
  googleId: string | null
  isEmailVerified: boolean
  isPremiumTelegram: boolean

  firstName: string
  lastName: string
  username: string
  photoUrl: string
  languageCode: string

  tokenBalance: number
  bonusTokens: number
  cashbackBalance: number
  cashbackEarnedTotal: number
  totalTokensSpent: number
  totalDeposited: number

  role: UserRole
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiresAt: string | null

  referralCode: string
  referredBy: string | null
  referralCount: number
  referralEarnings: number

  dailyGenerations: number
  dailyGenerationsResetAt: string | null

  isActive: boolean
  isBanned: boolean
  banReason: string
  lastActiveAt: string | null

  createdAt: string
  updatedAt: string
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
  page: number
  pages: number
}

export interface AdminUsersQuery {
  page?: number
  limit?: number
  search?: string
  role?: UserRole | 'all'
  banned?: 'all' | 'banned' | 'active'
  hasBalance?: boolean
  sortBy?: 'createdAt' | 'lastActiveAt' | 'totalDeposited' | 'totalTokensSpent'
  order?: 'asc' | 'desc'
}