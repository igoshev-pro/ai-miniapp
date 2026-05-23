import { apiClient } from './client'
import { ENDPOINTS } from './endpoints'
import type { AdminSubscriptionPlan, AdminTokenPackage } from '@/types/admin-billing'

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export const adminBillingApi = {
  // ─── Plans ───────────────────────────────────────────────────
  async listPlans(): Promise<AdminSubscriptionPlan[]> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_PLANS)
    return unwrap(res)
  },
  async getPlan(id: string): Promise<AdminSubscriptionPlan> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_PLAN(id))
    return unwrap(res)
  },
  async createPlan(body: Partial<AdminSubscriptionPlan>): Promise<AdminSubscriptionPlan> {
    const res = await apiClient.post(ENDPOINTS.ADMIN_PLANS, body)
    return unwrap(res)
  },
  async updatePlan(id: string, body: Partial<AdminSubscriptionPlan>): Promise<AdminSubscriptionPlan> {
    const res = await apiClient.put(ENDPOINTS.ADMIN_PLAN(id), body)
    return unwrap(res)
  },
  async togglePlan(id: string): Promise<AdminSubscriptionPlan> {
    const res = await apiClient.post(`${ENDPOINTS.ADMIN_PLAN(id)}/toggle`)
    return unwrap(res)
  },
  async deletePlan(id: string) {
    const res = await apiClient.delete(ENDPOINTS.ADMIN_PLAN(id))
    return unwrap<{ deleted: boolean; id: string }>(res)
  },

  // ─── Packages ────────────────────────────────────────────────
  async listPackages(): Promise<AdminTokenPackage[]> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_PACKAGES)
    return unwrap(res)
  },
  async getPackage(id: string): Promise<AdminTokenPackage> {
    const res = await apiClient.get(ENDPOINTS.ADMIN_PACKAGE(id))
    return unwrap(res)
  },
  async createPackage(body: Partial<AdminTokenPackage>): Promise<AdminTokenPackage> {
    const res = await apiClient.post(ENDPOINTS.ADMIN_PACKAGES, body)
    return unwrap(res)
  },
  async updatePackage(id: string, body: Partial<AdminTokenPackage>): Promise<AdminTokenPackage> {
    const res = await apiClient.put(ENDPOINTS.ADMIN_PACKAGE(id), body)
    return unwrap(res)
  },
  async togglePackage(id: string): Promise<AdminTokenPackage> {
    const res = await apiClient.post(`${ENDPOINTS.ADMIN_PACKAGE(id)}/toggle`)
    return unwrap(res)
  },
  async deletePackage(id: string) {
    const res = await apiClient.delete(ENDPOINTS.ADMIN_PACKAGE(id))
    return unwrap<{ deleted: boolean; id: string }>(res)
  },
}