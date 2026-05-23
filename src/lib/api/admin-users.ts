import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  AdminUser,
  AdminUsersQuery,
  AdminUsersResponse,
  UserRole,
} from '@/types/admin-user'

export interface AdminUserDetails {
  user: AdminUser
  stats: {
    generationsCount: number
    transactionsCount: number
    invitedCount: number
  }
  recentTransactions: any[]
  recentGenerations: any[]
  referrer: AdminUser | null
  invitedUsers: AdminUser[]
}

export type BalanceType = 'tokenBalance' | 'bonusTokens' | 'cashbackBalance'

function unwrap<T>(res: any): T {
  // бек возвращает { success, data }
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
}