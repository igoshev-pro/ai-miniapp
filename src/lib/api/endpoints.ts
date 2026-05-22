export const ENDPOINTS = {
  AUTH_TELEGRAM: '/auth/telegram',
  AUTH_TELEGRAM_WIDGET: '/auth/telegram-widget',
  USER_ME: '/users/me',

  // Models
  MODELS: '/models',
  MODEL_DETAIL: (slug: string) => `/models/${slug}`,

  // Chat
  CHAT_CONVERSATIONS: '/chat/conversations',
  CHAT_MESSAGES: (chatId: string) => `/chat/conversations/${chatId}/messages`,
  CHAT_DELETE: (chatId: string) => `/chat/conversations/${chatId}`,
  CHAT_RENAME: (chatId: string) => `/chat/conversations/${chatId}/rename`,
  CHAT_PIN: (chatId: string) => `/chat/conversations/${chatId}/pin`,
  CHAT_SEND: '/chat/send',
  CHAT_STREAM: '/chat/stream',

  // Generation
  GENERATION_IMAGE: '/generation/image',
  GENERATION_VIDEO: '/generation/video',
  GENERATION_AUDIO: '/generation/audio',
  GENERATION_STATUS: (id: string) => `/generation/status/${id}`,
  GENERATION_HISTORY: '/generation/history',
  GENERATION_FAVORITE: (id: string) => `/generation/${id}/favorite`,

  // 🆕 Pricing & UI config
  GENERATION_CALCULATE_PRICE: '/generation/calculate-price',
  GENERATION_UI_CONFIG: (slug: string) => `/generation/models/${slug}/ui-config`,

  // Billing
  BILLING_PACKAGES: '/billing/packages',
  BILLING_PLANS: '/billing/plans',
  BILLING_BALANCE: '/billing/balance',
  BILLING_PAY_TOKENS: '/billing/pay/tokens',
  BILLING_PAY_SUBSCRIPTION: '/billing/pay/subscription',
  BILLING_PROMO: '/billing/promo',
  BILLING_TRANSACTIONS: '/billing/transactions',

  // Favorites
  FAVORITES: '/favorites',
  FAVORITES_TOGGLE: '/favorites/toggle',

  // Support
  SUPPORT_TICKETS: '/support/tickets',
  SUPPORT_TICKET: (id: string) => `/support/tickets/${id}`,

  // Referral
  REFERRAL_INFO: '/referral/info',
  REFERRAL_STATS: '/referral/stats',

  // Upload
  UPLOAD_AUDIO: '/upload/audio',
  UPLOAD_IMAGE: '/upload/image',

  // ============ ADMIN ============
  ADMIN_CHECK: '/admin/check',
  ADMIN_DASHBOARD: '/admin/dashboard',

  // Admin Users
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_ROLE: (id: string) => `/admin/users/${id}/role`,
  ADMIN_USER_BAN: (id: string) => `/admin/users/${id}/ban`,
  ADMIN_USER_BALANCE: (id: string) => `/admin/users/${id}/adjust-balance`,

  // Admin Models
  // Admin Models
  ADMIN_MODELS: '/admin/models',
  ADMIN_MODEL: (slug: string) => `/admin/models/${slug}`,
  ADMIN_MODEL_TOGGLE: (slug: string) => `/admin/models/${slug}/toggle`,

  // Admin Providers
  ADMIN_PROVIDERS: '/admin/providers',
  ADMIN_PROVIDER: (slug: string) => `/admin/providers/${slug}`,

  // Admin Promo codes
  ADMIN_PROMO_CODES: '/admin/promo-codes',
  ADMIN_PROMO_CODE: (code: string) => `/admin/promo-codes/${code}`,

  // Admin Plans & packages (будут в Части 3)
  ADMIN_PLANS: '/admin/plans',
  ADMIN_PLAN: (id: string) => `/admin/plans/${id}`,
  ADMIN_PACKAGES: '/admin/token-packages',
  ADMIN_PACKAGE: (id: string) => `/admin/token-packages/${id}`,

  // Admin Settings (Часть 4)
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_SETTINGS_TOKENOMICS: '/admin/settings/tokenomics',  // 🆕

  // Admin Analytics
  ADMIN_ANALYTICS_REVENUE: '/admin/analytics/revenue',
  ADMIN_ANALYTICS_GENERATIONS: '/admin/analytics/generations',
  ADMIN_ANALYTICS_MODELS: '/admin/analytics/models',
} as const