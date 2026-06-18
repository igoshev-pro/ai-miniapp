import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  AdminUser,
  AdminUsersQuery,
  AdminUsersResponse,
  UserRole,
} from '@/types/admin-user'

// 🆕 Расширенный тип данных пользователя для админки
export interface AdminUserSubscriptionInfo {
  plan: string
  planName: string | null
  expiresAt: string | null
  isActive: boolean
  tokensPerMonth: number
  bonusTokens: number
  modelsAccess: 'limited' | 'full'
  source: 'admin' | 'payment' | 'promo' | null
  startedAt: string | null
  adminReason: string | null
  freeModels: Array<{
    modelSlug: string
    displayName: string
    hourlyLimit: number | null
    dailyLimit: number | null
    hourlyUsed: number
    dailyUsed: number
    requiredParams?: Record<string, any> | null
  }>
}

export interface AdminUserDetails {
  user: AdminUser
  stats: {
    generationsCount: number
    transactionsCount: number
    invitedCount: number
  }
  subscription: AdminUserSubscriptionInfo | null // 🆕
  recentTransactions: any[]
  recentGenerations: any[]
  referrer: AdminUser | null
  invitedUsers: AdminUser[]
}

// 🆕 Тело запроса на установку/снятие подписки
export interface SetSubscriptionBody {
  plan: string // 'free' | 'basic' | 'plus' | 'max' | 'ultimate'
  durationDays?: number
  expiresAt?: string
  grantTokens?: boolean
  reason?: string
}

export interface SetSubscriptionResponse {
  user: AdminUser
  subscription: {
    plan: string
    expiresAt: string | null
    grantedTokens: number
    grantedBonusTokens: number
  }
}

export type BalanceType = 'tokenBalance' | 'bonusTokens' | 'cashbackBalance'

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export const adminUsersApi = {
  async list(params: AdminUsersQuery): Promise<AdminUsersResponse> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_USERS, { params })
    return unwrap<AdminUsersResponse>(res)
  },

  async getById(id: string): Promise<AdminUserDetails> {
    const res = await apiClient.get(`${ENDPOINTS.ADMIN_USERS}/${id}`)
    return unwrap<AdminUserDetails>(res)
  },

  async changeRole(id: string, role: UserRole): Promise<AdminUser> {
    const res = await apiClient.put(ENDPOINTS.ADMIN_USER_ROLE(id), { role })
    return unwrap<AdminUser>(res)
  },

  async toggleBan(id: string, ban: boolean, reason?: string): Promise<AdminUser> {
    const res = await apiClient.put(ENDPOINTS.ADMIN_USER_BAN(id), { ban, reason })
    return unwrap<AdminUser>(res)
  },

  async adjustBalance(
    id: string,
    body: { balanceType: BalanceType; amount: number; reason: string },
  ) {
    const res = await apiClient.post(ENDPOINTS.ADMIN_USER_BALANCE(id), body)
    return unwrap<{
      userId: string
      balanceType: BalanceType
      before: number
      after: number
      amount: number
      totals: {
        tokenBalance: number
        bonusTokens: number
        cashbackBalance: number
        total: number
      }
    }>(res)
  },

  async remove(id: string) {
    const res = await apiClient.delete(ENDPOINTS.ADMIN_USER_DELETE(id))
    return unwrap<{ deleted: boolean; userId: string }>(res)
  },

  // 🆕 Установка/снятие подписки
  async setSubscription(
    id: string,
    body: SetSubscriptionBody,
  ): Promise<SetSubscriptionResponse> {
    const res = await apiClient.put(ENDPOINTS.ADMIN_USER_SUBSCRIPTION(id), body)
    return unwrap<SetSubscriptionResponse>(res)
  },
}