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
    supportsWebSearch: boolean;

    sortOrder: number;

    costPerMillionInputTokens: number;
    costPerMillionOutputTokens: number;
    fixedCostPerGeneration: number;
    tokensPerDollar: number;
    minTokenCost: number;
    tokenCost?: number;

    providerMappings: ProviderMapping[];
    capabilities: string[];

    limits?: Record<string, any>;
    uiParameters?: UIParameter[]
    pricingMatrix?: PricingRule[]
    inputCapabilities?: InputCapabilities
    defaultParams?: Record<string, any>
    stats?: {
        totalRequests?: number;
        avgResponseTime?: number;
        successRate?: number;
    };

    createdAt: string;
    updatedAt: string;

    preview?: {
        avgCostInTokens?: number
        minCostInTokens?: number
        maxCostInTokens?: number
        pricingType?: string
        details?: Record<string, any>
    }
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

    // 🆕 ДОБАВЬ ЭТО:
    uiParameters?: UIParameter[];
    pricingMatrix?: PricingRule[];
    inputCapabilities?: InputCapabilities;
    defaultParams?: Record<string, any>;
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

// ─── UI Parameters ──────────────────────────────

export type UIParamType = 'select' | 'number' | 'boolean' | 'text' | 'slider'

export interface UIParamOption {
    value: string | number
    label: string
}

export interface UIParameter {
    key: string
    label: string
    type: UIParamType
    affectsPrice: boolean
    defaultValue?: any
    options?: UIParamOption[]
    min?: number
    max?: number
    step?: number
    description?: string
}

// ─── Pricing Matrix ─────────────────────────────

export interface PricingRule {
    conditions?: Record<string, any> // { duration: 8, quality: "hd" } — пусто = catch-all
    costInTokens: number
    label?: string
}

// ─── Input Capabilities ─────────────────────────

export interface InputCapabilities {
    acceptsImage?: boolean
    maxImages?: number
    acceptsVideo?: boolean
    acceptsAudio?: boolean
    maxFileSizeMB?: number
}