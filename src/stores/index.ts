// src/stores/index.ts (обновлённый)

export { useAuthStore } from './auth.store'
export { useUserStore, type UserProfile } from './user.store'
export { useToastStore, toast } from './toast.store'
export { useChatStore, type Chat, type ChatMessage } from './chat.store'