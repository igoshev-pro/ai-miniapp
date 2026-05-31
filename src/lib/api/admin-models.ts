// src/lib/api/admin-models.ts
import { apiClient } from './client';
import type {
  AdminModel,
  CreateModelPayload,
  ModelsFilters,
  ModelsListResponse,
  UpdateModelPayload,
} from '@/types/admin-model';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const UPDATE_ALLOWED_KEYS: (keyof UpdateModelPayload)[] = [
  'name', 'displayName', 'description', 'icon', 'type',
  'isActive', 'isPremium', 'supportsVision', 'sortOrder',
  'costPerMillionInputTokens', 'costPerMillionOutputTokens',
  'fixedCostPerGeneration', 'tokensPerDollar', 'minTokenCost', 'tokenCost',
  'capabilities', 'uiParameters', 'pricingMatrix',
  'inputCapabilities', 'defaultParams',
];

function pickUpdatePayload(draft: Partial<AdminModel>): UpdateModelPayload {
  const out: Record<string, any> = {};
  for (const key of UPDATE_ALLOWED_KEYS) {
    if (draft[key] !== undefined) out[key] = draft[key];
  }
  return out as UpdateModelPayload;
}

export const adminModelsApi = {
  async list(filters: ModelsFilters = {}): Promise<ModelsListResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.type) params.type = filters.type;
    if (filters.isActive) params.isActive = filters.isActive;
    if (filters.isPremium) params.isPremium = filters.isPremium;

    const { data } = await apiClient.get<ApiEnvelope<ModelsListResponse>>(
      '/admin/models',
      { params },
    );
    return data.data;
  },

  async getOne(slug: string): Promise<AdminModel> {
    const { data } = await apiClient.get<ApiEnvelope<AdminModel>>(
      `/admin/models/${slug}`,
    );
    return data.data;
  },

  async update(
    slug: string,
    payload: UpdateModelPayload | Partial<AdminModel>,
  ): Promise<AdminModel> {
    const { data } = await apiClient.put<ApiEnvelope<AdminModel>>(
      `/admin/models/${slug}`,
      pickUpdatePayload(payload as Partial<AdminModel>),  // 🔑
    );
    return data.data;
  },

  async toggle(slug: string): Promise<AdminModel> {
    const { data } = await apiClient.post<ApiEnvelope<AdminModel>>(
      `/admin/models/${slug}/toggle`,
    );
    return data.data;
  },

  async create(payload: CreateModelPayload): Promise<AdminModel> {
    const clean = {
      ...pickUpdatePayload(payload as Partial<AdminModel>),
      slug: payload.slug,
      name: payload.name,
      displayName: payload.displayName,
      type: payload.type,
    };
    const { data } = await apiClient.post<ApiEnvelope<AdminModel>>(
      '/admin/models',
      clean,
    );
    return data.data;
  },

  async remove(slug: string, hard = false): Promise<void> {
    await apiClient.delete(`/admin/models/${slug}`, {
      params: hard ? { hard: 'true' } : undefined,
    });
  },
};