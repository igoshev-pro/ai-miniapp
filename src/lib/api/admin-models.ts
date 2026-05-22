// src/lib/api/admin-models.ts
import { apiClient } from './client'; // твой axios-инстанс
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

  async update(slug: string, payload: UpdateModelPayload): Promise<AdminModel> {
    const { data } = await apiClient.put<ApiEnvelope<AdminModel>>(
      `/admin/models/${slug}`,
      payload,
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
    const { data } = await apiClient.post<ApiEnvelope<AdminModel>>(
      '/admin/models',
      payload,
    );
    return data.data;
  },

  async remove(slug: string, hard = false): Promise<void> {
    await apiClient.delete(`/admin/models/${slug}`, {
      params: hard ? { hard: 'true' } : undefined,
    });
  },
};