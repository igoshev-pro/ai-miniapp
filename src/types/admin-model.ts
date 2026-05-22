// src/types/admin-model.ts

export type GenerationType =
  | 'chat' | 'image' | 'video' | 'audio' | 'embedding' | string;

export interface ProviderMapping {
  providerId: string;
  providerSlug: string;
  modelId: string;
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface AdminModel {
  _id: string;
  slug: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  type: GenerationType;

  isActive: boolean;
  isPremium: boolean;
  supportsVision: boolean;

  sortOrder: number;

  costPerMillionInputTokens: number;
  costPerMillionOutputTokens: number;
  fixedCostPerGeneration: number;
  tokensPerDollar: number;
  minTokenCost: number;
  tokenCost?: number;

  providerMappings: ProviderMapping[];
  capabilities: string[];

  defaultParams?: Record<string, any>;
  limits?: Record<string, any>;
  pricingMatrix?: any[];
  uiParameters?: any[];
  inputCapabilities?: Record<string, any>;
  stats?: {
    totalRequests?: number;
    avgResponseTime?: number;
    successRate?: number;
  };

  createdAt: string;
  updatedAt: string;
}

export interface ModelsFilters {
  search?: string;
  type?: GenerationType;
  isActive?: 'true' | 'false';
  isPremium?: 'true' | 'false';
}

export interface UpdateModelPayload {
  name?: string;
  displayName?: string;
  description?: string;
  icon?: string;
  type?: GenerationType;
  isActive?: boolean;
  isPremium?: boolean;
  supportsVision?: boolean;
  sortOrder?: number;
  costPerMillionInputTokens?: number;
  costPerMillionOutputTokens?: number;
  fixedCostPerGeneration?: number;
  tokensPerDollar?: number;
  minTokenCost?: number;
  tokenCost?: number;
  capabilities?: string[];
}

export interface CreateModelPayload extends UpdateModelPayload {
  slug: string;
  name: string;
  displayName: string;
  type: GenerationType;
}

export interface ModelsListResponse {
  items: AdminModel[];
  total: number;
}