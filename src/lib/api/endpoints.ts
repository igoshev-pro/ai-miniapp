// src/lib/api/endpoints.ts

export const ENDPOINTS = {
  AUTH_TELEGRAM: '/auth/telegram',
  USER_ME: '/users/me',

  CHAT_LIST: '/chat',
  CHAT_CREATE: '/chat',
  CHAT_MESSAGES: (chatId: string) => `/chat/${chatId}/messages`,
  CHAT_STREAM: '/chat/stream',

  GENERATION_IMAGE: '/generation/image',
  GENERATION_VIDEO: '/generation/video',
  GENERATION_AUDIO: '/generation/audio',
  GENERATION_STATUS: (id: string) => `/generation/${id}/status`,

  BILLING_PACKAGES: '/billing/packages',
  BILLING_PAY: '/billing/pay/tokens',
  BILLING_SUBSCRIBE: '/billing/subscribe',
  BILLING_TRANSACTIONS: '/billing/transactions',
  BILLING_PROMO: '/billing/promo/apply',

  FAVORITES: '/favorites',
  FAVORITE_TOGGLE: (id: string) => `/favorites/${id}`,

  SUPPORT_TICKETS: '/support/tickets',
  SUPPORT_TICKET: (id: string) => `/support/tickets/${id}`,

  REFERRAL_INFO: '/referral/info',
  REFERRAL_STATS: '/referral/stats',
} as const