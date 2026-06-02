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

    // ═══════════════════════════════════════════════════════════════
    // 🆕 НОВАЯ СИСТЕМА ЦЕН (в спичках 🔥 за 1M токенов модели)
    // Именно по этим полям BillingService считает списание для text-моделей
    // ═══════════════════════════════════════════════════════════════
    pricePerMillionInputTokens?: number;   // 🔥 за 1M входных токенов
    pricePerMillionOutputTokens?: number;  // 🔥 за 1M выходных токенов
    avgTokensPerRequest?: number;          // средняя длина запроса (для preview)

    // Себестоимость у провайдера (в $ за 1M) — для контроля маржи в админке
    providerCostPerMillionInput?: number;
    providerCostPerMillionOutput?: number;

    // ═══════════════════════════════════════════════════════════════
    // ⚠️ DEPRECATED — оставлены для обратной совместимости
    // ═══════════════════════════════════════════════════════════════

    /** @deprecated используйте pricePerMillionInputTokens + providerCostPerMillionInput */
    costPerMillionInputTokens: number;
    /** @deprecated используйте pricePerMillionOutputTokens + providerCostPerMillionOutput */
    costPerMillionOutputTokens: number;
    /** @deprecated курс больше не используется, цены сразу в 🔥 */
    tokensPerDollar: number;

    fixedCostPerGeneration: number;
    minTokenCost: number;
    tokenCost?: number;

    providerMappings: ProviderMapping[];
    capabilities: string[];

    limits?: Record<string, any>;
    uiParameters?: UIParameter[];
    pricingMatrix?: PricingRule[];
    inputCapabilities?: InputCapabilities;
    defaultParams?: Record<string, any>;
    stats?: {
        totalRequests?: number;
        avgResponseTime?: number;
        successRate?: number;
    };

    createdAt: string;
    updatedAt: string;

    preview?: {
        avgCostInTokens?: number;
        minCostInTokens?: number;
        maxCostInTokens?: number;
        pricingType?: string;
        details?: Record<string, any>;
    };
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

    // 🆕 НОВЫЕ поля в спичках
    pricePerMillionInputTokens?: number;
    pricePerMillionOutputTokens?: number;
    avgTokensPerRequest?: number;
    providerCostPerMillionInput?: number;
    providerCostPerMillionOutput?: number;

    // ⚠️ Legacy (можно редактировать ради миграции)
    costPerMillionInputTokens?: number;
    costPerMillionOutputTokens?: number;
    tokensPerDollar?: number;

    fixedCostPerGeneration?: number;
    minTokenCost?: number;
    tokenCost?: number;
    capabilities?: string[];

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

export type UIParamType = 'select' | 'number' | 'boolean' | 'text' | 'slider';

export interface UIParamOption {
    value: string | number;
    label: string;
}

export interface UIParameter {
    key: string;
    label: string;
    type: UIParamType;
    affectsPrice: boolean;
    defaultValue?: any;
    options?: UIParamOption[];
    min?: number;
    max?: number;
    step?: number;
    description?: string;
}

// ─── Pricing Matrix ─────────────────────────────

export interface PricingRule {
    conditions?: Record<string, any>;
    costInTokens: number;
    label?: string;
}

// ─── Input Capabilities ─────────────────────────

export interface InputCapabilities {
    acceptsImages?: boolean;
    acceptsVideo?: boolean;
    acceptsAudio?: boolean;
    acceptsFiles?: boolean;
    maxInputImages?: number;
    maxFileSize?: number;
    acceptedMimeTypes?: string[];
}