import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  AdminTransactionsQuery,
  AdminTransactionsListResponse,
  AdminTransactionDetails,
  AdminTransactionsStats,
} from '@/types/admin-transaction'

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export const adminTransactionsApi = {
  async list(params: AdminTransactionsQuery): Promise<AdminTransactionsListResponse> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_TRANSACTIONS, { params })
    return unwrap(res)
  },

  async getById(id: string): Promise<AdminTransactionDetails> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_TRANSACTION(id))
    return unwrap(res)
  },

  async getStats(days = 30): Promise<AdminTransactionsStats> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_TRANSACTIONS_STATS, {
      params: { days },
    })
    return unwrap(res)
  },
}