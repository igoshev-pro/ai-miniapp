// src/lib/api/admin-promo-codes.ts
import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  AdminPromoCode,
  AdminPromoListQuery,
  AdminPromoListResponse,
  AdminPromoStats,
  AdminPromoUpsert,
} from '@/types/admin-promo'

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export const adminPromoCodesApi = {
  async list(query: AdminPromoListQuery = {}): Promise<AdminPromoListResponse> {
    const params: Record<string, any> = {}
    if (query.page) params.page = query.page
    if (query.limit) params.limit = query.limit
    if (query.search) params.search = query.search
    if (query.type && query.type !== 'all') params.type = query.type
    if (query.status && query.status !== 'all') params.status = query.status
    if (query.sortBy) params.sortBy = query.sortBy
    if (query.order) params.order = query.order

    const res = await apiClient.get(ENDPOINTS.ADMIN_PROMO_CODES, { params })
    return unwrap(res)
  },

  async getOne(id: string): Promise<AdminPromoCode> {
    const res = await apiClient.get(`${ENDPOINTS.ADMIN_PROMO_CODES}/${id}`)
    return unwrap(res)
  },

  async stats(id: string): Promise<AdminPromoStats> {
    const res = await apiClient.get(`${ENDPOINTS.ADMIN_PROMO_CODES}/${id}/stats`)
    return unwrap(res)
  },

  async create(body: AdminPromoUpsert): Promise<AdminPromoCode> {
    const res = await apiClient.post(ENDPOINTS.ADMIN_PROMO_CODES, body)
    return unwrap(res)
  },

  async update(id: string, body: Partial<AdminPromoUpsert>): Promise<AdminPromoCode> {
    const res = await apiClient.put(`${ENDPOINTS.ADMIN_PROMO_CODES}/${id}`, body)
    return unwrap(res)
  },

  async toggle(id: string): Promise<AdminPromoCode> {
    const res = await apiClient.post(`${ENDPOINTS.ADMIN_PROMO_CODES}/${id}/toggle`)
    return unwrap(res)
  },

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    const res = await apiClient.delete(`${ENDPOINTS.ADMIN_PROMO_CODES}/${id}`)
    return unwrap(res)
  },
}