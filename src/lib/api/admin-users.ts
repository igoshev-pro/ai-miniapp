import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type { AdminUser, AdminUsersQuery, AdminUsersResponse } from '@/types/admin-user'

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export const adminUsersApi = {
  async list(query: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_USERS, { params: query })
    return unwrap<AdminUsersResponse>(res)
  },

  async getOne(id: string): Promise<{ user: AdminUser; [k: string]: any }> {
    const res = await apiClient.get(`${ENDPOINTS.ADMIN_USERS}/${id}`)
    return unwrap(res)
  },

  async setRole(id: string, role: string) {
    const res = await apiClient.patch(ENDPOINTS.ADMIN_USER_ROLE(id), { role })
    return unwrap(res)
  },

  async setBan(id: string, isBanned: boolean, banReason = '') {
    const res = await apiClient.patch(ENDPOINTS.ADMIN_USER_BAN(id), { isBanned, banReason })
    return unwrap(res)
  },

  async adjustBalance(
    id: string,
    body: {
      type: 'tokenBalance' | 'bonusTokens' | 'cashbackBalance'
      amount: number
      reason: string
    },
  ) {
    const res = await apiClient.post(ENDPOINTS.ADMIN_USER_BALANCE(id), body)
    return unwrap(res)
  },
}