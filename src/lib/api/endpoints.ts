export const ENDPOINTS = {
  AUTH_TELEGRAM: '/auth/telegram',
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
} as const