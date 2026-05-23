export interface FreeModelAccess {
  modelSlug: string
  displayName: string
  hourlyLimit: number | null
  dailyLimit: number | null
}

export interface PlanFeatures {
  maxDailyGenerations: number
  priorityQueue: boolean
  exclusiveModels: boolean
  noWatermark: boolean
  maxContextMessages: number
}

export interface AdminSubscriptionPlan {
  _id: string
  planKey: string
  name: string
  description: string
  priceRub: number
  tokensPerMonth: number
  bonusTokens: number
  modelsAccess: 'limited' | 'full'
  freeModels: FreeModelAccess[]
  features: PlanFeatures
  capabilities: string[]
  color: string
  icon: string
  isPopular: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminTokenPackage {
  _id: string
  packageId: string
  label: string
  tokens: number
  priceRub: number
  bonusPercent: number
  popular: boolean
  best: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}