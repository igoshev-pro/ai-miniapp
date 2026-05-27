📚 Контекст: Frontend — Блок 8: Stores (Zustand)

📋 Метаданные блока


src/stores/
├── index.ts              📤 Barrel export
├── auth.store.ts         🔑 JWT токен + isReady
├── user.store.ts         👤 UserProfile + балансы
├── chat.store.ts         💬 Чаты + сообщения + стриминг
├── generation.store.ts   🎨 Генерации (image/video/audio)
├── models.store.ts       🤖 Список моделей + категории
└── toast.store.ts        🍞 Toast-уведомления
⚠️ Файл продублирован — каждый store повторяется дважды. В проекте единственный экземпляр каждого.

Что НЕ в barrel index.ts: useGenerationStore и useModelsStore — не экспортируются из index.ts. Импортируются напрямую из файлов.

🏛️ Общая архитектура

Все сторы — Zustand без middleware (кроме auth.store с persist).


Нет persist:  user, chat, generation, models, toast
Есть persist: auth (только token → localStorage)
Это намеренно: при перезагрузке страницы все данные кроме токена сбрасываются. Данные перегружаются из API при mount (через хуки useUser, useChat, useGeneration, useModels).

🔑 auth.store.ts

State

Ts

{
  token: string | null     // JWT Bearer токен
  isReady: boolean         // auth flow завершён (не значит авторизован!)
}
Actions

Ts

setToken(token: string)    // set({ token, isReady: true })
setReady()                 // set({ isReady: true }) — без токена (анон пользователь)
clearToken()               // set({ token: null }) — НЕ трогает isReady!
⚠️ Важная тонкость: clearToken() не сбрасывает isReady. После logout isReady остаётся true. Это намеренно — чтобы приложение понимало что auth flow завершён (просто без токена), а не завис.

Persist config

Ts

{
  name: 'spichki-auth',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ token: state.token })   // только token!
}
isReady намеренно не персистится — при каждой загрузке страницы isReady = false, затем useAuth проходит init-flow и вызывает setToken() или setReady().

Жизненный цикл при загрузке


localStorage['spichki-auth'] = { token: "eyJ..." }
  ↓
Zustand persist hydration (async)
  ↓
token = "eyJ..." (восстановлен)
isReady = false (не персистится)
  ↓
useAuth mount → проходит init-flow
  ↓
useAuth вызывает setToken() → isReady = true
Именно поэтому в useAuth и useAdminAuth нужен hydration gate — токен появляется не сразу.

👤 user.store.ts

UserProfile тип (полный)

Ts

{
  id: string
  telegramId: number | null
  authProvider: 'telegram' | 'email' | 'google'
  email: string | null
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  role: 'user' | 'premium' | 'admin' | 'super_admin'
  
  // Балансы
  tokenBalance: number       // основной баланс (куплен)
  bonusTokens: number        // бонусный баланс (промокоды, реферралы)
  totalBalance: number       // = tokenBalance + bonusTokens (вычисляется на фронте)
  
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'unlimited'
    expiresAt: string | null
    isActive: boolean
  }
  
  referralCode: string
  createdAt: string | null
}
Ключевое: totalBalance не приходит с бэка — вычисляется в setUser():

Ts

setUser: (user) => set({
  user: { ...user, totalBalance: user.tokenBalance + user.bonusTokens },
  isLoaded: true,
})
И в updateBalance():

Ts

updateBalance: (tokenBalance, bonusTokens) =>
  set((s) => ({
    user: s.user
      ? { ...s.user, tokenBalance, bonusTokens, totalBalance: tokenBalance + bonusTokens }
      : null,
  }))
⚠️ cashbackBalance отсутствует — есть в admin-users.ts как BalanceType, но не в UserProfile. Третий тип баланса недоступен основному приложению.

State

Ts

{
  user: UserProfile | null
  isLoaded: boolean
}
Actions

Ts

setUser(user: UserProfile)                    // полная замена + totalBalance
updateBalance(tokenBalance, bonusTokens)      // частичное обновление балансов
clear()                                       // set({ user: null, isLoaded: false })
clear() вызывается при logout.

Роли

Роль	Доступ
user	Базовый
premium	Расширенный (подписка)
admin	Адмнка
super_admin	Полный доступ
⚠️ Роль premium и subscription.plan — два способа выразить одно. Если subscription.isActive && plan !== 'free' → пользователь premium. Но роль 'premium' это отдельное поле. Возможна рассинхронизация.

💬 chat.store.ts

Типы

ChatMessage

Ts

{
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  imageUrls?: string[]       // vision: картинки в user-сообщении
  model?: string             // какая модель ответила (для assistant)
  tokensUsed?: number
  createdAt: string
}
Chat

Ts

{
  id: string
  title: string
  model: string              // display name ("GPT-5.4")
  modelSlug: string          // для API ("gpt-5.4")
  category: 'text' | 'image' | 'video' | 'audio'
  lastMessage?: string       // превью последнего сообщения
  messageCount: number
  createdAt: string
  updatedAt: string
}
⚠️ Chat не имеет isPinned — в хуке useChat есть pinChat() метод и CHAT_PIN endpoint, но в типе нет поля. При pin операции UI не знает что чат закреплён (нет visual indicator в типе).

State

Ts

{
  chats: Chat[]              // список всех чатов пользователя
  chatsLoaded: boolean
  activeChatId: string | null
  messages: ChatMessage[]    // сообщения ТОЛЬКО активного чата
  messagesLoaded: boolean
  isStreaming: boolean
  streamingContent: string   // накапливаемый текст во время стриминга
}
⚠️ Один массив messages для всех сообщений — всегда только активного чата. При переключении чата messages полностью заменяется. Нет кэша сообщений по chatId.

Actions

Управление списком чатов

Ts

setChats(chats)              // полная замена + chatsLoaded = true
addChat(chat)                // prepend (новый чат в начало)
removeChat(chatId)           // фильтрация по id
Навигация между чатами

Ts

setActiveChatId(chatId)      // просто меняет id (без сброса messages)
switchChat(chatId)           // меняет id + сбрасывает messages/streaming
switchToNewChat()            // activeChatId = null + сбрасывает messages/streaming
⚠️ Разница setActiveChatId vs switchChat: setActiveChatId не сбрасывает messages. Используется когда уже загружены сообщения нового чата и нужно просто синхронизировать ID.

Управление сообщениями

Ts

setMessages(messages)         // полная замена + messagesLoaded = true
addMessage(message)           // append
updateMessage(messageId, content)  // замена content по id
updateMessage используется для обновления assistant сообщения после завершения стрима — заменяет streamingContent на финальный текст.

Стриминг

Ts

setStreaming(v: boolean)
setStreamingContent(content: string)   // полная замена (не append)
appendStreamingContent(chunk: string)  // s.streamingContent + chunk
resetStreaming()                        // isStreaming=false, streamingContent=''
Паттерн стриминга в компоненте:


setStreaming(true)
setStreamingContent('')             // очистить
→ SSE tokens: appendStreamingContent(chunk) × N
→ onDone: 
  addMessage({ content: streamingContent })
  resetStreaming()
🎨 generation.store.ts

⚠️ Не в barrel index.ts — импортируется напрямую:

Ts

import { useGenerationStore } from '@/stores/generation.store'
Типы

GenerationStatus

Ts

'pending' | 'processing' | 'completed' | 'failed'
GenerationType

Ts

'image' | 'video' | 'audio'
Generation (полный тип)

Ts

{
  id: string
  type: GenerationType
  model: string              // display name
  modelSlug: string
  prompt: string
  status: GenerationStatus
  progress: number           // 0-100
  
  // Результаты
  resultUrl?: string         // один URL (legacy / single result)
  resultUrls?: string[]      // массив URL (multiple results)
  thumbnailUrl?: string      // превью для видео
  
  // Ошибка
  error?: string
  
  // Биллинг
  tokensUsed?: number
  refunded?: boolean         // true если токены вернули при ошибке
  
  // Прочее
  isFavorite?: boolean
  settings?: Record<string, unknown>   // параметры генерации (size, quality, etc)
  createdAt: string
}
⚠️ resultUrl и resultUrls оба опциональны — нет гарантии что хоть один из них будет при status = 'completed'. UI должен проверять оба.

State

Ts

{
  generations: Generation[]          // все генерации (pending + history)
  activeGeneration: Generation | null
  historyLoaded: boolean
}
Actions

addGeneration(gen)

Ts

set((s) => ({
  generations: [gen, ...s.generations.filter((g) => g.id !== gen.id)]
}))
Prepend + дедупликация по id. Если генерация уже есть — удаляется и добавляется заново в начало.

updateGeneration(id, update)

Ts

// Обновляет ОБА места одновременно:
generations: s.generations.map((g) => g.id === id ? { ...g, ...update } : g)
activeGeneration: activeGeneration?.id === id ? { ...activeGeneration, ...update } : activeGeneration
Атомарное обновление — нет рассинхронизации между списком и активной генерацией.

mergeHistory(historyGens) — ключевой алгоритм

Ts

mergeHistory: (historyGens) => set((s) => {
  // 1. Находим активные (in-flight)
  const activeIds = new Set(
    s.generations
      .filter((g) => g.status === 'pending' || g.status === 'processing')
      .map((g) => g.id)
  )
  
  // 2. Берём только активные из текущего стора
  const activeGens = s.generations.filter((g) => activeIds.has(g.id))
  
  // 3. Из истории берём все КРОМЕ активных
  const fromHistory = historyGens.filter((g) => !activeIds.has(g.id))
  
  // 4. Активные в начало, история после
  return { generations: [...activeGens, ...fromHistory] }
})
Зачем: при загрузке истории нельзя затереть in-flight генерации. История из бэка может не содержать ещё pending генерации (они только что созданы).

getByType(type) — единственный getter

Ts

getByType: (type) => get().generations.filter((g) => g.type === type)
Не selector, а метод. Вызывается из хука useGeneration:

Ts

const images = useGenerationStore.getState().getByType('image')
🤖 models.store.ts

⚠️ Не в barrel index.ts — импортируется напрямую.

State

Ts

{
  models: ModelItem[]        // из @/lib/data (тот же тип что в fallback)
  categories: ModelCategory[]
  isLoaded: boolean
  isLoading: boolean
}
setModels(models) — с вычислением категорий

Ts

setModels: (models) => {
  // Подсчёт по категориям
  const categoryCounts: Record<string, number> = {}
  for (const m of models) {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1
  }
  
  // Фиксированный порядок: text → image → video → audio
  const categories = ['text', 'image', 'video', 'audio']
    .filter((id) => categoryCounts[id])    // только если есть хоть одна модель
    .map((id) => ({ id, label: categoryLabels[id], count: categoryCounts[id] }))
  
  set({ models, categories, isLoaded: true, isLoading: false })
}
Категории вычисляются при каждом setModels — не хранятся отдельно от моделей. Порядок категорий фиксированный (не зависит от того в каком порядке пришли модели).

⚠️ categoryLabels хардкод внутри setModels — дублирует то что уже есть в data.ts в modelCategories. Два источника правды для одних и тех же labels.

🍞 toast.store.ts

Toast тип

Ts

{
  id: string       // Date.now().toString(36) + random (коллизии маловероятны)
  type: ToastType  // 'success' | 'error' | 'warning' | 'info'
  message: string
}
add(type, message, duration = 3000)

Ts

add: (type, message, duration = 3000) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
  
  if (duration > 0) {
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  }
}
duration = 0 → тост не удаляется автоматически (только вручную через remove).

toast — глобальный объект (не хук!)

Ts

export const toast = {
  success: (msg: string) => useToastStore.getState().add('success', msg),
  error:   (msg: string) => useToastStore.getState().add('error', msg),
  warning: (msg: string) => useToastStore.getState().add('warning', msg),
  info:    (msg: string) => useToastStore.getState().add('info', msg),
}
Использует getState() — работает вне React компонентов. Вызывается из:

Хуков (useGeneration, useFavorites, useOffline)
lib/api/sse.ts
Anywhere без импорта React
⚠️ duration не передаётся через toast.* — всегда 3000ms. Нет API для toast.error(msg, 5000).

🗺️ Полная карта stores

Зависимости между stores (нет cross-store зависимостей!)


auth.store    → (нет зависимостей от других stores)
user.store    → (нет)
chat.store    → (нет)
generation.store → (нет)
models.store  → ModelItem, ModelCategory из @/lib/data (типы)
toast.store   → (нет)
Stores полностью независимы. Координация — только в хуках:


useChat → useChatStore + useUserStore (для баланса)
useGeneration → useGenerationStore + useAuthStore + useUserStore + useModelsStore
useAuth → useAuthStore + useUserStore
Кто читает каждый store

Store	Читает
auth.store	useAuth, useAdminAuth, apiClient interceptor, sse.ts, upload.ts, ws/socket.ts
user.store	useUser, useChat, useGeneration, useBilling
chat.store	useChat, ChatPage
generation.store	useGeneration, GenerationPage
models.store	useModels, useChat, useGeneration
toast.store	useToastStore hook (ToastContainer), toast.* везде
Кто пишет в каждый store

Store	Пишет
auth.store	useAuth (setToken/setReady), apiClient/sse/upload (clearToken при 401)
user.store	useUser (setUser/updateBalance), useAuth (clear при logout), useBilling (applyPromo)
chat.store	useChat (все операции)
generation.store	useGeneration (все операции)
models.store	useModels (setModels/setLoading)
toast.store	toast.* везде, useToastStore.getState().add()
⚠️ Замеченные проблемы

🔴 Критичные

Chat тип не имеет isPinned — useChat.pinChat() вызывает CHAT_PIN endpoint, но после успешного ответа нет способа отразить pin-статус в UI через стор. Либо надо делать refetch чатов, либо добавить поле в тип.

useGenerationStore и useModelsStore не в barrel — инконсистентно. useAuthStore, useUserStore, useChatStore, useToastStore — экспортируются из index.ts. Эти два — нет. Импорты разбросаны.

clearToken() не вызывает useUserStore.getState().clear() — при logout токен очищается, но user в useUserStore остаётся. Если компонент читает user без проверки token — покажет данные разлогиненного пользователя. Правильный logout должен очищать оба стора.

totalBalance вычисляется на фронте но UserProfile.totalBalance в TypeScript объявлен как обязательное поле. Если бэк вернёт totalBalance отличный от суммы — setUser молча перезапишет его вычисленным значением. Нет валидации.

🟡 Средние

messages — один массив без кэша по chatId — при переключении между чатами каждый раз делается запрос к API. Если пользователь переключается туда-обратно — 2 запроса вместо 1 (нет кэша). Архитектурно можно добавить messagesCache: Record<chatId, ChatMessage[]>.

streamingContent хранится в сторе — каждый appendStreamingContent(chunk) вызывает ре-рендер всех подписчиков useChatStore. При 50+ чанках в секунду это 50+ ре-рендеров. Для производительности лучше хранить streamingContent в useRef компонента и только по завершению писать в стор.

Toast ID генерируется как Date.now().toString(36) + Math.random() — при одновременном вызове двух toast.* в одном tick Date.now() одинаковый. Random снижает вероятность коллизии, но не исключает. Безопаснее crypto.randomUUID().

categoryLabels дублируется — в models.store.ts внутри setModels и в data.ts в modelCategories. Изменение одного не меняет другое.

Generation.settings: Record<string, unknown> — слабая типизация. Для разных типов генерации (image/video/audio) settings разные. Было бы лучше:

Ts

settings?: ImageSettings | VideoSettings | AudioSettings
authProvider: 'telegram' | 'email' | 'google' — в текущем приложении используется только telegram. email и google — планируемые провайдеры, которые не реализованы. Хуки и компоненты не обрабатывают эти случаи.

subscription.plan: 'free' | 'basic' | 'pro' | 'unlimited' — конкретные планы хардкодированы в типе. При изменении планов на бэке нужно обновлять тип. Лучше string с type guard'ами или отдельный SubscriptionPlan enum.

useToastStore не имеет maxToasts — теоретически можно накопить бесконечное число тостов если duration=0 или очень быстрое добавление. Нет cap на количество одновременных тостов.

🟢 Минорные

isReady в auth.store — не сбрасывается при clearToken — технически правильно (см. выше), но неинтуитивно. isReady значит "auth flow done", а не "авторизован". Название могло быть authFlowCompleted для ясности.

getByType в generation.store — метод стора вместо selector — нестандартный паттерн. Обычно getByType был бы селектором в компоненте:

Ts

const images = useGenerationStore((s) => s.generations.filter(g => g.type === 'image'))
Метод в сторе не реагирует на изменения реактивно при вызове вне компонента.

addGeneration делает filter + prepend — O(n) операция при каждой новой генерации. При большой истории (1000+ генераций) может быть заметно. Можно использовать Map для O(1) lookup.

mergeHistory создаёт new Set при каждом вызове — аллокация при каждом poll (каждые 3-5 сек). Некритично, но при длинных генерациях — 100+ Set allocations.

Chat.category поле — при наличии modelSlug категорию можно вычислить из useModelsStore. Дублирование данных, но удобно для рендера без обращения к стору моделей.

🔥 Ключевые паттерны

1. isReady как барьер init flow


Страница загружается
  ↓ isReady = false (не персистится)
  ↓ AppInitializer или useAuth запускает init
  ↓ setToken() или setReady()
  ↓ isReady = true
  ↓ Компоненты получают доступ к данным
Без isReady компонент не знает завершился ли init или ещё идёт.

2. Оптимистичный баланс


useGeneration.generate()
  ↓ проверяет user.totalBalance >= estimatedCost
  ↓ POST /generation/image → 402 если недостаточно
  ↓ после WS completed: updateBalance(newBalance, newBonus)
Баланс обновляется не оптимистично (до ответа), а по факту (после WS события или refetch).

3. mergeHistory — merge без потери in-flight


Store: [pending-A, processing-B, completed-C]
History API returns: [completed-C, completed-D, completed-E]

After merge:
  activeIds = {A, B}
  activeGens = [pending-A, processing-B]
  fromHistory = [completed-C, completed-D, completed-E]
  
  result = [pending-A, processing-B, completed-C, completed-D, completed-E]
In-flight генерации всегда в начале списка.

4. Toast как глобальный сервис

Ts

// Без React, без хуков, из любого места:
import { toast } from '@/stores/toast.store'
toast.error('Ошибка соединения')
Аналог toastify но реализован на Zustand. Компонент <ToastContainer> читает useToastStore и рендерит тосты.

5. updateGeneration — атомарный double update

Ts

// Обновляет generations[] И activeGeneration одновременно
// Нет промежуточного состояния где они рассинхронизированы
updateGeneration(id, { status: 'completed', resultUrls: [...] })
Критично для UI: если activeGeneration и элемент в generations[] обновляются в разных set() — между ними может быть рендер с inconsistent state.

📊 Итоговая сводка stores

Store	Persist	Размер state	Сложность	Потребители
auth	✅ token	2 поля	🟢 Низкая	7+ файлов
user	❌	2 поля + UserProfile	🟢 Низкая	4 хука
chat	❌	7 полей	🟡 Средняя	useChat, ChatPage
generation	❌	3 поля	🟡 Средняя	useGeneration
models	❌	4 поля	🟢 Низкая	3 хука
toast	❌	1 массив	🟢 Низкая	везде
