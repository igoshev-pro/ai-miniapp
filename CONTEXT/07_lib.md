📚 Контекст: Frontend — Блок 7: lib/telegram + lib/data + lib/ws + lib/api

📋 Метаданные блока

⚠️ Каждый файл продублирован 2-3 раза в сообщении — артефакт копипасты. В проекте файлы в единственном экземпляре.

Структура блока


src/lib/
├── telegram.ts                    🔑 Типы WebApp SDK + утилиты
├── data.ts                        📦 Fallback данные (модели, чаты, категории)
├── ws/
│   ├── index.ts                   📤 Barrel export
│   └── socket.ts                  🔌 Socket.io клиент + очередь подписок
└── api/
    ├── index.ts                   📤 Barrel export
    ├── client.ts                  🌐 axios instance + interceptors
    ├── endpoints.ts               🗺️ Полный реестр URL
    ├── sse.ts                     📡 SSE стриминг (LLM)
    ├── upload.ts                  📤 XHR upload → S3
    ├── admin-users.ts             👮 Admin API: пользователи
    ├── admin-transactions.ts      👮 Admin API: транзакции
    ├── admin-promo-codes.ts       👮 Admin API: промокоды
    ├── admin-models.ts            👮 Admin API: модели
    └── admin-billing.ts           👮 Admin API: планы и пакеты
🔑 src/lib/telegram.ts

Назначение

Низкоуровневый слой для работы с Telegram WebApp SDK. Только типы и утилиты без state.

Типы

TelegramUser (export)

Ts

{
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}
WebApp (export) — полный интерфейс SDK

Ts

{
  // Data
  initData: string                        // raw строка для авторизации на бэке
  initDataUnsafe: InitDataUnsafe          // { user, query_id, auth_date, hash, start_param }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  
  // Viewport
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  
  // Components
  BackButton: BackButton                  // { show, hide, onClick, offClick }
  MainButton: MainButton                  // { setParams, show, hide, onClick, offClick, ... }
  HapticFeedback: HapticFeedback          // { impactOccurred, notificationOccurred, selectionChanged }
  
  // Safe Area
  safeAreaInset?: SafeAreaInset           // { top, bottom, left, right }
  contentSafeAreaInset?: SafeAreaInset
  
  // Methods
  ready(), expand(), close()
  sendData(data: string)
  setHeaderColor(color: string)
  setBackgroundColor(color: string)
  setBottomBarColor(color: string)        // только >= 7.10
  enableClosingConfirmation()
  disableClosingConfirmation()
  disableVerticalSwipes?()               // optional — не все версии
  enableVerticalSwipes?()
  isVersionAtLeast(version: string): boolean
  requestFullscreen()                    // ⚠️ нет реализации на всех платформах
  
  // Events
  onEvent(eventType: string, callback: (...args: unknown[]) => void)
  offEvent(eventType: string, callback: (...args: unknown[]) => void)
  
  // Navigation
  openLink(url: string, options?: { try_instant_view?: boolean })
  openTelegramLink(url: string)
  openInvoice(url: string, callback?: (status: string) => void)
}
SafeAreaInset (не export — только internal)

Ts

{ top: number; bottom: number; left: number; right: number }
Используется для safeAreaInset и contentSafeAreaInset.

declare global — расширение Window

Ts

interface Window {
  Telegram?: any  // any — не типизировано строго
}
Утилиты

getWebApp(): WebApp | null

Ts

if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
  return window.Telegram.WebApp as WebApp
}
return null
SSR-safe. any cast → WebApp через type assertion.

haptic(style = 'medium') / hapticNotification(type) / hapticSelection()

Все три обёрнуты в try/catch {} — полностью safe, ничего не бросают.

Каждый вызывает getWebApp() повторно (не кэшируется) — минор O(1), но 3 closure каждый вызов.

getUserInitials(user) → string

Ts

const first = user.first_name?.[0] ?? ''
const last = user.last_name?.[0] ?? ''
return (first + last).toUpperCase() || '?'
Для Telegram user "Иван Петров" → "ИП". Null → "?".

getUserDisplayName(user) → string

Ts

const parts = [user.first_name, user.last_name].filter(Boolean)
return parts.join(' ') || 'Гость'
"Иван Петров" или "Иван" (если нет фамилии) или "Гость".

Связь с TelegramContext

TelegramContext.tsx импортирует из этого файла:

getWebApp() — для инициализации
haptic, hapticNotification, hapticSelection — прокидывает в context value
getUserInitials, getUserDisplayName — для вычисляемых значений
type WebApp, type TelegramUser
📦 src/lib/data.ts

Назначение

Статические данные — fallback для работы без бэкенда. Фактически это «seed data» для первого рендера.

Экспортируемые типы

ModelItem

Ts

{
  id: string                              // 't1', 'i2', 'v3', 'a4'
  name: string                            // display name
  slug: string                            // для API запросов
  provider: string                        // 'OpenAI', 'Anthropic', ...
  category: 'text' | 'image' | 'video' | 'audio'
  description: string
  cost: number                            // минимальная стоимость в спичках
  hasVariants?: boolean                   // true = "от X 🔥" в UI
  supportsVision?: boolean                // показывать ли кнопку attach image
}
ModelCategory

Ts

{ id: string; label: string; count: number }
ChatItem

Ts

{
  id: string
  title: string
  model: string
  preview: string
  time: string                            // '14:32'
  date: 'today' | 'yesterday' | 'earlier'
  iconKey: 'message' | 'image' | 'video' | 'audio'
  isFavorite: boolean
}
CategoryCardData

Ts

{
  id: string
  title: string
  description: string
  coverUrl: string                        // '/covers/text.webp' etc
  modelCount: number
}
Модели в allModels (38 штук)

Категория	Кол-во	Диапазон стоимости
text	11	0.10 – 0.40 спичек
image	10	0.70 – 6.00 спичек
video	9	4.30 – 86.00 спичек
audio	6	0.10 – 6.70 спичек
⚠️ Заметка: в комментарии "11 моделей" для видео, но объектов v1–v9 = 9. Нет v10 и v11. Возможно были удалены или ещё не добавлены.

Провайдеры в fallback

Провайдер	Категории
OpenAI	text + image
Anthropic	text
Google	text + image + video
DeepSeek	text
xAI	text
Perplexity	text
Midjourney	image
Black Forest	image
ByteDance	image
Community	image
Kuaishou	video
Runway	video
MiniMax	video
OpenRouter	text
Suno	audio
ElevenLabs	audio
chatFeedData (12 элементов)

Это захардкоженные демо-чаты. Используются:

Ранее использовались для отображения в ленте (HomeTab) как fallback
Сейчас заменены реальными данными из useChat.loadChats()
Возможно мёртвые данные — нужно проверить где используется
Вспомогательные константы

Ts

export const dateOrder = ['today', 'yesterday', 'earlier'] as const
export const dateLabels = { today: 'Сегодня', yesterday: 'Вчера', earlier: 'Ранее' }
categoriesData (4 элемента)

Карточки для главной страницы → /covers/text.webp, /covers/image.webp, etc.

modelCount считается динамически из allModels.filter(...) при импорте модуля.

🔌 src/lib/ws/ — WebSocket Client

Структура


lib/ws/
├── index.ts    (barrel re-export)
└── socket.ts   (вся логика)
Модульные переменные в socket.ts

Ts

const WS_URL = 'https://spichki.tw1.ru'   // хардкод! не из env

let socket: Socket | null = null                    // singleton
let pendingSubscriptions: Set<string> = new Set()   // очередь при disconnect
let listenersRegistered = false                     // флаг one-time setup
⚠️ WS_URL хардкод — в отличие от API_BASE_URL в client.ts, не использует process.env.NEXT_PUBLIC_WS_URL. При смене окружения нужно менять код.

getSocket(): Socket

Lazy singleton. Создаёт io('/generation', { autoConnect: false, ... }) один раз.

Параметры подключения:

Ts

{
  autoConnect: false,              // не подключается автоматически
  transports: ['websocket', 'polling'],  // WebSocket primary, polling fallback
  reconnection: true,
  reconnectionAttempts: 15,        // максимум 15 попыток
  reconnectionDelay: 1000,         // начальная задержка 1 сек
  reconnectionDelayMax: 10000,     // максимум 10 сек между попытками
}
connectSocket(token): Socket

Устанавливает s.auth = { token } и соединяется.

One-time system listeners (через listenersRegistered):

connect → resend all pendingSubscriptions (если были до соединения)
disconnect → log reason
connect_error → log error
s.onAny → логирует ВСЕ события (development tool, не убрано из prod!)
Ts

s.onAny((event, ...args) => {
  console.log('[WS] Event received:', event, args)  // ⚠️ в проде тоже логирует
})
disconnectSocket()

Ts

socket.removeAllListeners()
socket.disconnect()
socket = null
listenersRegistered = false
pendingSubscriptions.clear()
Полный reset. Вызывается нигде автоматически — только если импортировать и вызвать вручную.

⚠️ Не вызывается при logout — токен протухает, но сокет продолжает работать со старым auth.

subscribeToGeneration(id) — с очередью

Ts

pendingSubscriptions.add(id)      // всегда в очередь

if (s.connected) {
  s.emit('generation:subscribe', { generationId })
}
// иначе — отправится в обработчике 'connect'
Это ключевой механизм: если generate() вызывается до установки WS-соединения — подписка не теряется.

unsubscribeFromGeneration(id)

Ts

pendingSubscriptions.delete(id)
if (s.connected) {
  s.emit('generation:unsubscribe', { generationId })
}
⚠️ Нигде не вызывается автоматически — после завершения генерации сервер продолжает отправлять события (хотя уже нечего отправлять). Но у pendingSubscriptions нет TTL, в него накапливаются IDs завершённых генераций.

Типы событий (WS_EVENTS → Socket.io events)

Ts

WS_EVENTS = {
  STATUS:      'generation:status',      // { generationId, status }
  PROGRESS:    'generation:progress',    // { generationId, progress, eta?, status }
  COMPLETED:   'generation:completed',   // { generationId, resultUrls, resultContent?, responseTimeMs? }
  FAILED:      'generation:failed',      // { generationId, errorMessage, refunded }
  SUBSCRIBE:   'generation:subscribe',   // emit only
  UNSUBSCRIBE: 'generation:unsubscribe', // emit only
} as const
🌐 src/lib/api/ — HTTP Client

client.ts — axios instance

Конфигурация

Ts

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,          // 30 секунд
  headers: { 'Content-Type': 'application/json' },
})
Request interceptor — JWT авто-подстановка

Ts

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token   // читает из Zustand, не из хука
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
Использует getState() напрямую — можно вызывать вне React-компонентов.

Response interceptor — error normalization

Ts

return Promise.reject({
  status: status || 0,
  message,
  isAuth: status === 401,       // bool флаги для удобной обработки
  isBalance: status === 402,
  isRateLimit: status === 429,
  isServer: !!status && status >= 500,
} satisfies ApiError)
При 401 → useAuthStore.getState().clearToken().

ApiError тип

Ts

interface ApiError {
  status: number
  message: string
  isAuth: boolean
  isBalance: boolean
  isRateLimit: boolean
  isServer: boolean
}
isApiError(err): err is ApiError

Ts

return typeof err === 'object' && err !== null && 'isBalance' in err
Duck typing — проверяет наличие поля isBalance. Надёжно, т.к. это уникальное поле.

endpoints.ts — Реестр URL

Полный список (70+ endpoints) сгруппированных по доменам:

Группа	Кол-во	Базовый путь
Auth	2	/auth/*
User	1	/users/me
Models	2	/models/*
Chat	7	/chat/*
Generation	7	/generation/*
Billing	7	/billing/*
Favorites	2	/favorites/*
Support	2	/support/*
Referral	2	/referral/*
Upload	2	/upload/*
Admin	~25	/admin/*
Все статические пути — string. Параметризованные — (id: string) => string.

⚠️ Несоответствие: USER_ME: '/users/me' — но в ответе AdminCheckResponse есть userId, telegramId — базовый путь /users/ (с s), хотя интуитивно ожидается /user/me.

Двойной комментарий // Admin Models — артефакт редактирования.

sse.ts — SSE стриминг

Назначение

streamChat() — единственный способ получать LLM ответы. Использует Fetch API + ReadableStream, не EventSource (т.к. нужен POST с body).

Формат SSE протокола


event: conversation
data: {"id":"...","title":"Новый чат"}
← (пустая строка — разделитель)
event: message_start
data: {"messageId":"..."}

event: text_delta
data: {"content":"привет"}

event: text_delta
data: {"content":", мир!"}

event: message_end
data: {"messageId":"...","usage":{...},"tokensCost":3}

← или event: error
← или event: done
Парсинг SSE

Ключевые переменные:

Ts

let buffer = ''         // неполная строка между чанками
let currentEvent = ''   // текущее имя события
let messageId = ''      // сохраняем для onDone fallback
Алгоритм:


chunk → buffer += decode(chunk)
split('\n') → lines
buffer = lines.pop()   // сохраняем незавершённую строку

for line of lines:
  '' → сброс currentEvent (разделитель)
  'event: X' → currentEvent = 'X'
  'data: {json}' → parse + dispatch
SSECallbacks интерфейс

Ts

{
  onConversation?: (data: { id, title }) => void    // optional
  onMessageStart?: (data: { messageId }) => void    // optional
  onToken: (token: string) => void                  // required
  onDone: (data: { messageId, tokensUsed?, usage? }) => void  // required
  onError: (error: string) => void                  // required
}
SSERequest интерфейс

Ts

{
  conversationId?: string   // null = новый чат
  modelSlug: string
  content: string
  imageUrls?: string[]      // vision
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}
Error handling в стриминге

Ts

if (status === 401) { clearToken(); onError('Сессия истекла') }
if (status === 402) { onError('Недостаточно спичек') }
if (status === 429) { onError('Слишком много запросов') }
// иначе: onError(data.message || 'Ошибка сервера (N)')
Legacy fallback

Ts

default:  // неизвестный event
  if (data.type === 'token') → onToken
  if (data.type === 'done') → onDone
  if (data.type === 'error') → onError
Обеспечивает совместимость со старым форматом бэка.

Возврат

Ts

return controller  // AbortController для отмены стрима
Передаётся вызывающему, который может вызвать controller.abort().

upload.ts — File Upload

Почему XHR, а не fetch?

Fetch не поддерживает upload progress. XHR → xhr.upload.addEventListener('progress', ...).

validateImageFile(file) → string | null

Ts

ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
MAX_SIZE = 10 * 1024 * 1024  // 10 MB
Возвращает строку с ошибкой или null если OK.

⚠️ Нет валидации для аудио — UPLOAD_AUDIO endpoint есть в ENDPOINTS, но нет validateAudioFile() и нет uploadAudio(). Возможно не реализовано.

uploadImage(file, options) → Promise<UploadResult>

Использует useAuthStore.getState().token напрямую (не хук)
При 401 → clearToken()
Поддерживает AbortSignal для отмены
uploadImages(files[]) → Promise<UploadResult[]>

Promise.all — параллельная загрузка всех файлов.

UploadResult

Ts

{ url: string; key: string; size: number; mimetype: string }
url — публичный URL в S3 (Timeweb Cloud). Используется в imageUrls[] при отправке чата.

Admin API файлы — паттерн unwrap<T>

Все 4 admin API файла используют один паттерн:

Ts

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}
Логика: бэк возвращает { success: true, data: T }, axios оборачивает в { data: ... } → итого res.data.data = T. Но есть fallback'и на случай плоского ответа.

admin-users.ts — adminUsersApi

Ts

adminUsersApi = {
  list(params: AdminUsersQuery): Promise<AdminUsersResponse>
  getById(id: string): Promise<AdminUserDetails>
  changeRole(id: string, role: UserRole): Promise<AdminUser>
  toggleBan(id: string, ban: boolean, reason?: string): Promise<AdminUser>
  adjustBalance(id: string, { balanceType, amount, reason }): Promise<BalanceResult>
  remove(id: string): Promise<{ deleted: boolean; userId: string }>
}
BalanceType = 'tokenBalance' | 'bonusTokens' | 'cashbackBalance'

⚠️ Заметка: cashbackBalance появляется только здесь — в UserProfile в useUser.ts такого поля нет. Возможно новый тип баланса, не синхронизированный с фронтом.

AdminUserDetails содержит recentTransactions: any[] и recentGenerations: any[] — не типизировано.

admin-transactions.ts — adminTransactionsApi

Ts

adminTransactionsApi = {
  list(params: AdminTransactionsQuery): Promise<AdminTransactionsListResponse>
  getById(id: string): Promise<AdminTransactionDetails>
  getStats(days = 30): Promise<AdminTransactionsStats>
}
Типы приходят из @/types/admin-transaction (файл не показан).

admin-promo-codes.ts — adminPromoCodesApi

Ts

adminPromoCodesApi = {
  list(query): Promise<AdminPromoListResponse>   // фильтры: page, limit, search, type, status, sortBy, order
  getOne(id): Promise<AdminPromoCode>
  stats(id): Promise<AdminPromoStats>
  create(body): Promise<AdminPromoCode>
  update(id, body): Promise<AdminPromoCode>
  toggle(id): Promise<AdminPromoCode>            // активировать/деактивировать
  remove(id): Promise<{ deleted: boolean; id: string }>
}
⚠️ Нотация inconsistency: поиск по ID через getOne(id), но эндпоинт использует ADMIN_PROMO_CODES + '/' + id (без ADMIN_PROMO_CODE(code) из ENDPOINTS). Значит id здесь — это _id MongoDB, не сам code.

admin-models.ts — adminModelsApi

Дублирует функциональность useAdminModels/useModelActions из хуков, но как чистый API-объект (без React state).

Ts

adminModelsApi = {
  list(filters): Promise<ModelsListResponse>
  getOne(slug): Promise<AdminModel>
  update(slug, payload): Promise<AdminModel>
  toggle(slug): Promise<AdminModel>
  create(payload): Promise<AdminModel>
  remove(slug, hard?): Promise<void>
}
⚠️ Дублирование: функции те же что в useAdminModels.ts хуке. Хук использует apiClient напрямую, а этот файл — тоже. Но компоненты могут использовать либо хук (для реактивного state), либо прямой API (для одиночных действий).

Использует хардкоденные пути /admin/models/... вместо ENDPOINTS.ADMIN_MODEL(slug) в некоторых местах — inconsistency с остальными admin API файлами.

admin-billing.ts — adminBillingApi

Ts

adminBillingApi = {
  // Plans
  listPlans(), getPlan(id), createPlan(body), updatePlan(id, body), togglePlan(id), deletePlan(id)
  
  // Packages
  listPackages(), getPackage(id), createPackage(body), updatePackage(id, body), togglePackage(id), deletePackage(id)
}
Типы из @/types/admin-billing:

AdminSubscriptionPlan
AdminTokenPackage
🏛️ Архитектурные решения

1. Singleton WS + pending queue


connectSocket(token)
  ↓ getSocket() — один раз
  ↓ если не connected → connect()
  ↓ 'connect' event → flush pendingSubscriptions

subscribeToGeneration(id)
  ↓ pendingSubscriptions.add(id) — всегда
  ↓ if (connected) → emit сразу
  ↓ else → будет в pending
Гарантирует что подписка не теряется при disconnect/reconnect.

2. Axios interceptors как middleware

Вместо хендлинга в каждом хуке:

Request: добавить JWT
Response error: нормализовать в ApiError
401: очистить токен глобально
Это значит хуки могут писать просто:

Ts

if (isApiError(err) && err.isBalance) { toast.warning(...) }
3. useAuthStore.getState() в не-React коде

Ts

// client.ts, sse.ts, upload.ts — вне компонентов
const token = useAuthStore.getState().token
Это Zustand паттерн для использования стора вне React дерева. Работает потому что Zustand — не Context-based, а module-level.

4. Fetch (не axios) для SSE

EventSource не поддерживает POST. Fetch + ReadableStream — стандартный паттерн для SSE с телом запроса. Axios не поддерживает streaming response из коробки.

5. XHR (не fetch) для upload

fetch не предоставляет upload progress events (xhr.upload.onprogress — уникально для XHR).

⚠️ Замеченные проблемы

🔴 Критичные

WS_URL = 'https://spichki.tw1.ru' хардкод в socket.ts. При деплое на другой домен — нужно менять код. Должно быть:

Ts

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://spichki.tw1.ru'
s.onAny(console.log) в production — логирует каждый WS-пакет в консоль. При активных генерациях это сотни логов в секунду. Должно быть только в development:

Ts

if (process.env.NODE_ENV === 'development') {
  s.onAny((event, ...args) => console.log('[WS]', event, args))
}
pendingSubscriptions никогда не очищается от completed IDs — бесконечный рост. При reconnect будут resent подписки на давно завершённые генерации.

disconnectSocket() не вызывается при logout — старый токен остаётся в s.auth. При смене пользователя предыдущая сессия может получить события нового.

chatFeedData из data.ts — 12 хардкоженных чатов. Нужно проверить используется ли ещё, или это dead code.

uploadAudio endpoint есть, но функции uploadAudio() в upload.ts нет. Аудио файлы нельзя загрузить.

🟡 Средние (продолжение)

isApiError duck typing через 'isBalance' in err — не идеально. Если какой-то другой объект имеет поле isBalance, он пройдёт проверку. Лучше добавить discriminant:

Ts

export interface ApiError {
  __type: 'ApiError'   // добавить
  status: number
  // ...
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && '__type' in err && (err as any).__type === 'ApiError'
}
На практике сейчас не вызывает багов, т.к. isBalance достаточно уникальное поле.

timeout: 30000 (30 сек) для всех запросов в apiClient — слишком долго для простых GET запросов (/users/me, /models). Для стриминга и генераций может быть мало. Лучше задавать per-request или иметь разные инстансы.

admin-models.ts хардкодит пути /admin/models/... вместо ENDPOINTS.ADMIN_MODEL(slug). Если endpoint изменится — обновить нужно в двух местах. Остальные admin API файлы используют ENDPOINTS.* правильно.

Дублирование ApiEnvelope<T> — определён отдельно в admin-models.ts и в useAdminModels.ts. Должен быть в src/types/api.ts или в client.ts как экспорт.

unwrap<T>(res: any): T — cast any без runtime проверки. Если бэк вернёт неожиданную структуру, TypeScript не поможет. Три цепочки ?? хрупки:

Ts

res?.data?.data ?? res?.data ?? res
// Если бэк вернул { success: false, data: null } → unwrap вернёт null, а T говорит иначе
AdminUserDetails.recentTransactions: any[] и recentGenerations: any[] — потеря типизации в самом детальном месте (страница деталей юзера в админке). Должны быть типизированы.

cashbackBalance присутствует только в BalanceType в admin-users.ts, но отсутствует в UserProfile в useUser.ts. Это третий тип баланса о котором основное приложение не знает.

validateImageFile не используется для аудио/видео файлов — нет validateVideoFile(), нет validateAudioFile(). Только изображения валидируются на клиенте до отправки.

🟢 Минорные

getWebApp() вызывается при каждом haptic*() вызове — не кэшируется. window.Telegram?.WebApp ищется заново каждый раз. Не критично (O(1)), но при анимациях с haptic на каждый frame — мусор.

getUserInitials и getUserDisplayName дублируют логику которая есть в TelegramContext.tsx — там тоже собирается display name. Нет единой точки.

allModels в data.ts имеет cost в долларах (0.20, 1.30, 86.00), тогда как в комментариях написано "в спичках". Это критичная смысловая путаница — реальный cost в спичках другой (умножается на курс). Нужно разделить или явно пометить единицу измерения в типе:

Ts

costInDollars: number   // вместо cost
// или
cost: number            // @unit: spichki (matches backend)
SSERequest.imageUrls?: string[] есть в интерфейсе, но в ChatPage компонент передаёт их через отдельный параметр. Нужно проверить что реально используется при vision-запросах.

streamChat не очищает reader при abort — если controller.abort() вызван в середине стрима, reader.cancel() не вызывается явно. Браузер должен закрыть соединение автоматически через signal, но явный reader.cancel() был бы надёжнее.

reconnectionAttempts: 15 в WS — 15 × 10 сек (max delay) = 2.5 минуты максимального reconnect. При длинных генерациях (видео 10+ мин) сокет может умереть и не восстановиться. Backup — polling, но всё же.

WS namespace /generation хардкод — в getSocket():

Ts

socket = io(`${WS_URL}/generation`, ...)
Нет параметра namespace. Если добавится namespace /chat — нужен новый singleton.

🗺️ Полная карта зависимостей lib-слоя


src/lib/
│
├── telegram.ts
│   └── window.Telegram.WebApp (global)
│   ← используется: TelegramContext, useAuth
│
├── data.ts
│   └── (статика, нет deps)
│   ← используется: useModels (fallback), useGeneration (fallback), 
│                    useChat (getModelName fallback)
│
├── ws/socket.ts
│   ├── socket.io-client
│   └── (нет React deps — module-level state)
│   ← используется: useGeneration
│
└── api/
    ├── client.ts
    │   ├── axios
    │   └── useAuthStore.getState()    ← Zustand вне React
    │   ← используется: все хуки, все admin API
    │
    ├── endpoints.ts
    │   └── (нет deps)
    │   ← используется: все хуки, все admin API
    │
    ├── sse.ts
    │   └── useAuthStore.getState()    ← напрямую, не через apiClient
    │   ← используется: ChatPage (напрямую!), useChat.sendMessage
    │
    ├── upload.ts
    │   └── useAuthStore.getState()    ← напрямую, не через apiClient
    │   ← используется: ChatPage (image attach), GenerationPage
    │
    ├── admin-users.ts
    │   └── client.ts + endpoints.ts
    │   ← используется: AdminUsersPage, AdminUserDetailPage
    │
    ├── admin-transactions.ts
    │   └── client.ts + endpoints.ts
    │   ← используется: AdminTransactionsPage
    │
    ├── admin-promo-codes.ts
    │   └── client.ts + endpoints.ts
    │   ← используется: AdminPromoPage
    │
    ├── admin-models.ts
    │   └── client.ts (хардкод путей!)
    │   ← используется: AdminModelsPage (через useAdminModels хук?)
    │
    └── admin-billing.ts
        └── client.ts + endpoints.ts
        ← используется: AdminBillingPage (планы и пакеты)
🔥 Ключевые инсайты для разработки

1. Токен в трёх местах одновременно


useAuthStore (Zustand persist → localStorage)
  ↓
apiClient.interceptors.request  → Authorization header (axios)
sse.ts / streamChat             → Authorization header (fetch)
upload.ts / uploadImage         → Authorization header (XHR)
ws/socket.ts / connectSocket    → s.auth = { token } (Socket.io)
Все четыре читают useAuthStore.getState().token напрямую. При clearToken → axios и fetch сразу перестают слать токен, но WS сокет остаётся с протухшим auth до явного disconnectSocket().

2. SSE vs REST — разные HTTP клиенты


Обычные API запросы → apiClient (axios)
Стриминг LLM → streamChat (native fetch)
Загрузка файлов → uploadImage (native XHR)
Все три отдельно читают токен, отдельно обрабатывают 401. Это намеренно — axios не поддерживает ReadableStream, XHR нужен для прогресса.

3. Fallback цепочка для моделей


1. useModels.loadModels() → GET /models → setModels(mapped)
2. Если ошибка → setModels(fallbackModels из data.ts)
3. Пока загружается → useModels возвращает fallbackModels немедленно
4. useGeneration ищет модель в modelsStore.models || fallbackModels
5. useChat.getModelName тоже: modelsStore || fallbackModels
Три независимых места используют fallbackModels как резерв. Главное — все смотрят в data.ts.

4. unwrap паттерн в admin API


Axios ответ:      res.data      = { success: true, data: T }
После unwrap:     res.data.data = T
Fallback:         res.data      = T (если бэк вернул плоско)
Fallback 2:       res           = T (совсем нестандартный ответ)
Это защита от inconsistency бэка. Хрупко но работает для текущего API.