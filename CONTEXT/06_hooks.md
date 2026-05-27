🪝 Контекст: Frontend — Блок 6: Хуки

📋 Метаданные блока

Локация: src/hooks/
Всего файлов: 12
Index file: src/hooks/index.ts (barrel export)
Все хуки: 'use client'
Общий стиль: смесь useState + useCallback + useEffect + работа со сторами Zustand
⚠️ Замечание о повторе: сообщение содержит файлы дважды (артефакт чата). В проекте они в одном экземпляре.

🌳 Структура


src/hooks/
├── index.ts                  📦 Barrel export (11 хуков)
├── useAuth.ts                🔐 Auth flow (initData / widget)
├── useUser.ts                👤 Профиль (тонкая обёртка)
├── useChat.ts                💬 Чаты + SSE стриминг
├── useGeneration.ts          🎨 Генерации + WS + polling (САМЫЙ СЛОЖНЫЙ)
├── useBilling.ts             💰 Платежи, подписки, транзакции, рефералы
├── useFavorites.ts           ⭐ Избранное (+ свой Zustand-стор!)
├── useModels.ts              🤖 Каталог моделей + fallback
├── useModelUIConfig.ts       ⚙️ UI-конфиг модели с бэка (+ кэш)
├── usePriceCalculator.ts     💸 Real-time расчёт цены (debounced)
├── useOffline.ts             📡 online/offline detection
├── useAdminAuth.ts           🔑 Проверка админских прав (для /admin)
└── (используется в useAdminModels.ts — НЕ в index!) 
🚨 Несоответствие: в index.ts экспортируется 11 хуков. Но в файлах есть useAdminModels.ts (с useAdminModels + useModelActions), который НЕ экспортируется через barrel. Импортируется напрямую где нужно.

📦 index.ts — Barrel Export

Ts

export { useAuth } from './useAuth'
export { useUser } from './useUser'
export { useChat } from './useChat'
export { useGeneration } from './useGeneration'
export { useBilling } from './useBilling'
export { useOffline } from './useOffline'
export { useFavorites } from './useFavorites'
export { useModels } from './useModels'
export { useModelUIConfig, type ModelUIConfig, type UIParameter } from './useModelUIConfig'
export { usePriceCalculator, type PriceCalculation } from './usePriceCalculator'
export { useAdminAuth } from './useAdminAuth'
⚠️ useAdminModels отсутствует в barrel — потенциальная inconsistency.

🔐 useAuth.ts

Назначение

Единая точка входа авторизации. Поддерживает 2 сценария + 3 источника реферального кода.

Сценарии авторизации


mount
  ↓
[1] Ждём hydrated (persist storage) + isReady (Telegram SDK)
  ↓
[2] attempted.current ? return : attempted.current = true
  ↓
[3] token уже есть (из localStorage) → setReady(), return  // skip backend
  ↓
[4] webApp.initData есть? 
   ├─ Yes → POST /auth/telegram { initData, referralCode } → setToken + setUser
   └─ No  → setReady() (ждём widget login)
extractReferralCode(webApp) — 3 источника

webApp.initDataUnsafe.start_param → ref_XXX → XXX (или сам start_param)
URL query: ?ref=XXX или ?referral=XXX
localStorage (pending_referral_code) — fallback при retry
После извлечения → сохраняется в localStorage (чтобы не потерять при перезагрузке). После успешной авторизации → clearPendingReferral().

loginWithWidget(widgetData, referralCode?)

Для веб-режима через Telegram Login Widget:

Принимает TelegramWidgetData { id, first_name, ..., auth_date, hash }
POST /auth/telegram-widget
Тост приветствия: Добро пожаловать, ${user.firstName}!
Зависимости стора

useAuthStore: token, isReady, setToken, setReady
useUserStore: setUser
useTelegram: webApp, isReady
Защиты от гонок

attempted.current (useRef) — гарантирует один-shot
hydrated через persist.onFinishHydration
Проверка if (token) до запроса к бэку
👤 useUser.ts

Самый простой хук — обёртка над useUserStore + 2 fetch-метода:

Ts

return {
  user,                                    // UserProfile | null
  isLoaded,
  balance: user?.totalBalance ?? 0,
  tokenBalance: user?.tokenBalance ?? 0,
  bonusTokens: user?.bonusTokens ?? 0,
  subscription: user?.subscription ?? { plan: 'free', expiresAt: null, isActive: false },
  referralCode: user?.referralCode ?? '',
  refetch,         // GET /user/me → setUser
  refreshBalance,  // GET /user/me → updateBalance
}
⚠️ Дублирование: refetch() и refreshBalance() делают тот же запрос GET /user/me, но обновляют разные части стора. Логично слить в один.

💬 useChat.ts

Назначение

Управление чатами и LLM-стриминг.

Backend mappings

BackendConversation → Chat через mapConversationToChat
BackendMessage → ChatMessage через mapBackendMessage
getModelName(slug) — из useModelsStore или fallback'а
slugToCategory() — всегда возвращает 'text' (все чаты текстовые)
Методы

loadChats()

Pre-check token: если нет токена → store.setChats([]) и выход (защита от 401 на старте)
GET /chats/conversations?page=1&limit=50
При 401/403 не показывает ошибку — нормально на старте сессии
При любой ошибке → пустой массив, не падает
loadMessages(chatId)

GET /chats/conversations/:id/messages?page=1&limit=50
Фильтрует isStreaming || isError сообщения
Тост ошибки Не удалось загрузить сообщения
sendMessage(chatId, modelSlug, content)

Главный метод чата. Использует streamChat() из @/lib/api.


1. Проверка баланса > 0 (грубая, без учёта стоимости модели)
2. addMessage(userMessage) с temp ID
3. setStreaming(true) + setStreamingContent('')
4. streamChat({ conversationId, modelSlug, content }, callbacks)
   ├─ onConversation(data): setActiveChatId + addChat если нет
   ├─ onMessageStart: пусто
   ├─ onToken(token): appendStreamingContent
   ├─ onDone(data): addMessage(assistantMessage) + resetStreaming + updateBalance
   └─ onError(error): resetStreaming + toast
⚠️ Эта функция дублируется внутри ChatPage.tsx — там она реализована напрямую через streamChat(). Этот метод в useChat фактически не используется компонентом.

createChat(modelSlug)

Заглушка. Бэкенд создаёт чат при первом сообщении, поэтому возвращает temp Chat с ID pending-${Date.now()}. Сохранён для совместимости.

stopStreaming()

abortRef.current?.abort()
Если есть streamingContent.trim() — сохраняет как ассистентское сообщение
resetStreaming()
deleteChat(chatId)

DELETE /chats/conversations/:id
store.removeChat(chatId)
Toast: "Чат удалён"
Balance update logic (после стриминга)

Ts

const newBonus = Math.max(0, user.bonusTokens - data.tokensUsed)
const usedFromBonus = user.bonusTokens - newBonus
const usedFromMain = data.tokensUsed - usedFromBonus
const newMain = Math.max(0, user.tokenBalance - usedFromMain)
updateBalance(newMain, newBonus)
Правило: сначала тратятся бонусы, потом основной баланс. Логика дублируется в ChatPage.tsx.

🎨 useGeneration.ts (самый сложный)

Назначение

Орхестрация генераций — image / video / audio. Combines 3 источника статусов:

REST — старт + status polling
WebSocket — real-time обновления (status / progress / completed / failed)
History API — загрузка прошлых генераций при mount
Глобальное состояние (вне хука)

Ts

const shownToasts = new Set<string>()  // переживает ремаунты
Назначение: предотвратить дублирование тостов "Генерация завершена" когда событие приходит и из WS, и из polling одновременно.

Helpers внутри хука

Ts

showCompletedToast(generationId)        // toast.success once
showFailedToast(id, msg, refunded)      // toast.error once + refund info
Маппинг

Ts

mapBackendGeneration(g) → Generation {
  id: g.id || g._id,
  type: g.type,
  modelSlug: g.modelSlug,
  status: g.status,
  progress: status === 'completed' ? 100 : g.progress || 0,
  resultUrl: g.resultUrls?.[0],
  resultUrls: g.resultUrls,
  ...
}
Жизненный цикл

1️⃣ Загрузка истории (useEffect [token])

Один раз через historyLoadAttempted.current
GET /generation/history?limit=50
store.mergeHistory(mapped) + setHistoryLoaded(true)
Для completed/failed → shownToasts.add(g.id) (чтобы не показывать старые тосты)
Для pending/processing → subscribeToGeneration(id) + startPolling(id)
2️⃣ WebSocket подключение (useEffect [token])

connectSocket(token) из @/lib/ws
4 события: WS_EVENTS.STATUS / PROGRESS / COMPLETED / FAILED
При completed/failed → отменяет polling таймер
Cleanup: socket.off + wsSetup.current = false
3️⃣ Polling (startPolling(generationId))

Backup механизм на случай если WS не доставит событие.


attempts = 0, maxAttempts = 120 (≈ 10 минут с разными интервалами)
↓
Каждые 3 секунды первые 6 попыток (~18 сек), потом каждые 5 сек
↓
GET /generation/:id/status
↓
Обновляет стор
↓
Если completed/failed → cleanup + return
Защита от дублирования:

Ts

if (pollingTimers.current.has(generationId)) return  // уже опрашиваем
generate(request) — публичный метод

Pre-check

Поиск modelData (по slug или name) в modelsStore или fallbackModels
Default cost: 5
Если баланс < cost → toast.warning + return null
Endpoint resolution

Ts

const endpointMap = {
  image: ENDPOINTS.GENERATION_IMAGE,
  video: ENDPOINTS.GENERATION_VIDEO,
  audio: ENDPOINTS.GENERATION_AUDIO,
}
Body building (selective)

Для каждого типа — свой набор полей из settings:

image: aspectRatio, resolution, quality, outputFormat, negativePrompt, seed, style, inputUrls, numImages
video: aspectRatio, resolution, duration, imageUrl, imageUrls, style, mode, quality, sound, removeWatermark, promptOptimizer, waterMark
audio: style, duration, instrumental, voiceId, language, customMode, stability, similarity, speed, loop, promptInfluence, audioUrl, dialogue
Поля добавляются только если не undefined → отправляется минимальный body.

После запроса

Ts

1. addGeneration(generation) — добавить в стор со статусом pending
2. setActiveGeneration(generation)
3. subscribeToGeneration(generationId) — WS подписка
4. startPolling(generationId) — fallback polling
5. toast.info('Генерация запущена...')
Error handling

Ts

if (err.isBalance) toast.warning('Недостаточно спичек')
else if (err.isRateLimit) toast.warning('Слишком много запросов, подождите')
else toast.error(err.message)
checkStatus(id) и toggleFavorite(id)

checkStatus — ad-hoc проверка через GET /generation/:id/status
toggleFavorite — PUT /generation/:id/favorite (НЕ POST как в useFavorites)
⚠️ Inconsistency: для генераций favorite — через useGeneration.toggleFavorite (PUT). Для всего остального — через useFavorites.toggle (POST). Это разные API endpoints, не баг — но запутывает.

💰 useBilling.ts

Types

Ts

PaymentProvider = 'yookassa' | 'cryptomus' | 'stars' | 'freedompay' | 'tochka' | 'heleket'
                  └─ legacy (не на UI) ─┘  └────── активные ──────┘
PaymentCurrency = 'RUB' | 'USD'
Локальный state хука

Ts

packages: TokenPackage[]           // [] → fallback 5 шт
plans: SubscriptionPlan[]          // [] → fallback 3 шт
transactions: Transaction[]
transactionsTotal: number
referralInfo: ReferralInfoData | null
isLoading: boolean
⚠️ Не Zustand: данные хранятся локально в хуке. Поэтому каждый компонент вызывающий useBilling() получит свою копию state. Это означает что loadTransactions нужно вызывать в каждом компоненте, который их показывает.

Методы

Метод	Endpoint	Возврат
loadPackages()	GET /billing/packages	→ state
loadPlans()	GET /billing/plans	→ state + return
purchaseTokens(packageId, provider, currency)	POST /billing/pay/tokens	`paymentUrl
subscribe(plan, provider, currency)	POST /billing/pay/subscription	`paymentUrl
applyPromo(code)	POST /billing/promo	boolean
loadTransactions(page, limit)	GET /billing/transactions	`txData
loadReferralInfo()	GET /referral/info	`info
Fallback данные (если бэк не вернул)

5 пакетов: 100 / 300 / 700 / 1500 / 4000 спичек (попа = "Популярный")
3 плана: basic 299₽ / pro 699₽ / unlimited 1999₽
⚠️ Конфликт fallback'ов: в useBilling packages фолбэк не совпадает с тем что хардкодом в TopUpPage (там PKGS — 5 пакетов 100/300/700/1500/5000). И plans-фолбэк не совпадает с тем что в SubscriptionPage (4 плана Basic/Plus/Max/Ultimate).

👉 По факту используется хардкод в компонентах, а не данные с бэка → loadPackages/loadPlans не вызываются нигде.

applyPromo — побочный эффект

После успеха → apiClient.get(USER_ME) → setUser(profile.data.data) — обновление баланса в userStore. Поэтому хук импортирует useUserStore.

⭐ useFavorites.ts (особый)

Уникальное: свой Zustand-стор

Ts

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  cache: {},                            // "type:itemId" → boolean
  set: (key, value) => ...,
  get: (key) => ...,
}))
⚠️ Этот стор НЕ в src/stores/ — он внутри хука. Все остальные сторы Zustand живут в src/stores/. Inconsistency.

Хук

Ts

isFavorite(type, itemId): boolean      // sync, читает из cache
toggle(type, itemId, title?, previewUrl?): Promise<boolean>
setCache(type, itemId, value)
Optimistic UI в toggle

Ts

1. cache[key] = !current  // оптимистично переключаем
2. POST /favorites/toggle { type, itemId, title, previewUrl }
3. серверный ответ → cache[key] = server.isFavorite
4. toast.success/info
5. catch: rollback cache[key] = current
Минусы

Cache не инициализируется — пока юзер не дёрнет toggle для itemId, isFavorite() будет возвращать false. То есть при показе списка чатов, чтобы узнать какие из них в избранном, надо отдельно загрузить весь список fav (FavoritesPage).
Состояние "из избранного" в фиде чатов не синхронизировано с сервером — пока пользователь не tap'нет star, считается false.
🤖 useModels.ts

Маппинг бэка

Ts

BackendModel { slug, name, displayName, type, provider, cost, minCost, capabilities, supportsVision, ... }
   ↓
ModelItem { id, name, slug, provider, category, description, cost, hasVariants, supportsVision }
supportsVision detection

Ts

const supportsVision =
  m.supportsVision === true ||
  (Array.isArray(m.capabilities) &&
   m.capabilities.some((c) => c?.toLowerCase().includes('vision')))
Двойная проверка — явный флаг ИЛИ capability "vision". Используется в ChatPage для UI 👁.

guessProvider(slug) — fallback

Если бэк не вернул provider — определяется по подстроке в slug:


gpt/dall-e/chatgpt/sora → OpenAI
claude → Anthropic
gemini/imagen/veo → Google
deepseek → DeepSeek
grok → xAI
perplexity → Perplexity
qwen → Alibaba
midjourney → Midjourney
flux → Black Forest
stable → Stability
seedream → ByteDance
nano → Community
kling → Kuaishou
runway → Runway
hailuo → MiniMax
suno → Suno
eleven → ElevenLabs
default → AI
guessCost(type) — fallback

Ts

text: 1, image: 2, video: 5, audio: 1
loadModels() — защита от гонок

Ts

const state = useModelsStore.getState()
if (state.isLoaded || state.isLoading) return  // skip если уже
state.setLoading(true)
// ... fetch ...
// в catch: проверяем !isLoaded чтобы fallback не затёр успешный ответ другого вызова
Возврат

Ts

return {
  models: isLoaded ? models : fallbackModels,        // ⚠️ возвращает fallback пока не загрузили
  categories: isLoaded ? categories : fallbackCategories,
  isLoaded,
  isLoading,
  loadModels,
}
🔥 Это критично — компоненты могут получить fallback модели до загрузки. Поэтому ModelsInitializer дёргает loadModels в layout.tsx сразу.

⚙️ useModelUIConfig.ts

Уникальное: глобальный кэш + in-flight dedup

Ts

const cache = new Map<string, ModelUIConfig>()             // навсегда
const inflight = new Map<string, Promise<ModelUIConfig | null>>()  // в процессе
Логика


slug = null → setConfig(null), return
↓
cache.get(slug) → setConfig(cached), return  // мгновенно
↓
inflight.has(slug) → подписываемся на существующий promise
↓
new request:
  setIsLoading(true)
  apiClient.get(GENERATION_UI_CONFIG(slug))
    .then(cfg => cache.set(slug, cfg))
    .finally(() => inflight.delete(slug))
  inflight.set(slug, promise)
  promise.then(cfg => setConfig(cfg))
Типы (экспортируются)

Ts

UIParameterOption { value, label }
UIParameter { key, label, type, affectsPrice?, defaultValue?, options?, min?, max? }
InputCapabilities { acceptsImages?, maxInputImages?, acceptsVideos? }
PricingRule { conditions, costInTokens, costInDollars?, label? }
ModelUIConfig { slug, displayName?, uiParameters[], pricingMatrix[], inputCapabilities, defaultParams? }
Защита от race conditions

mounted = useRef(true) → не вызываем setState на unmount'нутом компоненте
Дедупликация через inflight
💸 usePriceCalculator.ts

Уникальное: debounce + request cancellation by ID

Ts

const reqIdRef = useRef(0)
const myReqId = ++reqIdRef.current
// ... await ...
if (myReqId !== reqIdRef.current) return  // устарел
Логика


slug changed OR paramsKey changed
↓
clearTimeout(timerRef)
↓
setTimeout(debounceMs = 300):
  reqId++
  setIsCalculating(true)
  POST /generation/calculate-price { modelSlug, params }
  if (myReqId !== current) return  // отбрасываем устаревший
  setPrice(data)
  setIsCalculating(false)

  paramsKey = JSON.stringify(params) — нужен потому что params объект, React сравнивает по ссылке. Без сериализации эффект бы триггерился на каждый рендер.

⚠️ Тонкость: если у params ключи в разном порядке между рендерами → JSON.stringify даст разные строки → лишние запросы. Решение — либо отсортировать ключи перед сериализацией, либо использовать useMemo для params в компонентах. На практике компоненты строят params одинаково, поэтому проблем нет.

Возврат

Ts

{ price: PriceCalculation | null, isCalculating: boolean }
Опции

Ts

{ enabled?: boolean (default: true), debounceMs?: number (default: 300) }
enabled = false используется для условного включения (например при showSettings = false).

📡 useOffline.ts

Самый компактный (~40 строк). Слушает window.online / window.offline events.

Ts

useEffect(() => {
  if (typeof window === 'undefined') return  // SSR-safe
  
  const goOffline = () => { setIsOffline(true); toast.warning('Нет соединения...') }
  const goOnline = () => { setIsOffline(false); toast.success('Соединение восстановлено') }
  
  if (!navigator.onLine) setIsOffline(true)  // initial check
  
  window.addEventListener('offline', goOffline)
  window.addEventListener('online', goOnline)
  return () => { /* cleanup */ }
}, [])

return { isOffline }
Возврат

Ts

{ isOffline: boolean }
Используется в SpichkiApp для показа OfflineIndicator баннера.

⚠️ Тосты при каждом switch — может раздражать пользователей с нестабильным WiFi. Лучше debounce или показывать только если offline > 3 сек.

🔑 useAdminAuth.ts

Назначение

Защита админских страниц (/admin/*). Проверяет JWT + права через /admin/check.

Жизненный цикл


1. mount
2. useEffect[]: wait hydration (persist storage)
   ├─ persist.onFinishHydration → setHydrated(true)
   ├─ persist.hasHydrated() → setHydrated(true) сразу
   └─ нет persist API → setHydrated(true) (fallback)
3. useEffect[hydrated, token]:
   if (!hydrated) return
   if (!token) → router.replace('/')
   GET /admin/check → AdminCheckResponse
     ├─ data.ok = false → router.replace('/')
     ├─ 401/403 → router.replace('/')
     └─ success → setUser(data)
Тип ответа

Ts

AdminCheckResponse {
  ok: boolean
  role: 'admin' | 'super_admin'
  telegramId: number
  username?: string
  userId: string
}
Возврат

Ts

{
  loading: boolean,        // loading || !hydrated
  isAdmin: boolean,        // !!user
  isSuperAdmin: boolean,   // user?.role === 'super_admin'
  role: AdminRole | null,
  user: AdminCheckResponse | null
}
Защиты

cancelled flag — против race condition при unmount
hydrated gate — против ложных редиректов до загрузки persist
Console logs для дебага ([useAdminAuth] check ok:)
⚠️ Использует useRouter Next.js — это единственный хук, использующий Next.js навигацию. Остальное приложение — state-роутинг через pageHistory. Логично — /admin это отдельный раздел на отдельном URL.

🔧 useAdminModels.ts (не в barrel)

Два экспорта

useAdminModels(initialFilters) — список моделей

Ts

state: {
  items: AdminModel[]
  total: number
  loading, error
  filters: ModelsFilters
}

return {
  items, total, loading, error, filters,
  setFilters,
  refetch,
  patchLocal(slug, patch),   // optimistic UI
  removeLocal(slug),
  addLocal(model),
}
GET /admin/models?search&type&isActive&isPremium (params условно)

useModelActions() — CRUD операции

Ts

return {
  busy: boolean,
  update(slug, payload): Promise<AdminModel | null>      // PUT /admin/models/:slug
  toggle(slug): Promise<AdminModel | null>               // POST /admin/models/:slug/toggle
  create(payload): Promise<AdminModel | null>            // POST /admin/models
  remove(slug, hard?): Promise<boolean>                  // DELETE /admin/models/:slug?hard=true
}
ApiEnvelope<T> (локальный тип)

Ts

{ success: boolean, data: T }
Видимо, везде на бэке этот формат — но в каждом хуке свой алиас (ApiResponse, ApiEnvelope, etc.).

⚠️ Не централизован общий тип — это тех долг.

Optimistic UI pattern

В useAdminModels есть три helper'а (patchLocal, removeLocal, addLocal) для локальных обновлений списка после действия — без refetch всего списка.

🔥 Сводная таблица хуков

Хук	Сложность	State location	Стор Zustand	API endpoints	Особенности
useAuth	🟡 Средне	useRef + store	auth, user	/auth/telegram, /auth/telegram-widget	3 источника referralCode
useUser	🟢 Низкая	store	user	/user/me	Тонкая обёртка
useChat	🔴 Высокая	store + useRef	chat	4 endpoint'а + SSE	Стриминг
useGeneration	🔴🔴 Очень высокая	store + useRef + global Set	generation, user, models	5 endpoint'ов + WS	Polling+WS dual
useBilling	🟡 Средне	local useState	user (для applyPromo)	7 endpoint'ов	Локальный state!
useFavorites	🟢 Низкая	свой Zustand	свой (useFavoritesStore)	/favorites/toggle	Optimistic UI
useModels	🟢 Низкая	store	models	/models	Provider guessing
useModelUIConfig	🟡 Средне	local + module cache	—	/generation/ui-config/:slug	Глобальный кэш + dedup
usePriceCalculator	🟡 Средне	local + useRef	—	/generation/calculate-price	Debounce + req cancellation
useOffline	🟢 Низкая	local	—	—	window events
useAdminAuth	🟡 Средне	local + store	auth	/admin/check	Next router redirect
useAdminModels	🟡 Средне	local	—	4 admin endpoint'а	Optimistic UI helpers
🎯 Архитектурные паттерны

1. Persist hydration gate

В useAuth и useAdminAuth:

Ts

const [hydrated, setHydrated] = useState(
  () => useAuthStore.persist?.hasHydrated() ?? true
)

useEffect(() => {
  if (hydrated) return
  const unsub = useAuthStore.persist?.onFinishHydration(() => setHydrated(true))
  if (useAuthStore.persist?.hasHydrated()) setHydrated(true)
  return unsub
}, [hydrated])
Зачем: Zustand persist хранит token в localStorage, но восстанавливает его асинхронно. Без этой защиты первый рендер видит token = null и редиректит/уходит в anonymous mode.

2. One-shot effect guard

Ts

const attempted = useRef(false)

useEffect(() => {
  if (attempted.current) return
  attempted.current = true
  // ...
}, [...])
В useAuth, useGeneration (для history loading). Strict Mode-safe.

3. Global Set для дедупликации тостов

Ts

const shownToasts = new Set<string>()  // вне хука

if (shownToasts.has(id)) return
shownToasts.add(id)
toast.success(...)
В useGeneration. Переживает ремаунты компонентов. Никогда не очищается → memory leak теоретически возможен (но за сессию накопится максимум 50-100 ID).

4. Stale request cancellation by ID

Ts

const reqIdRef = useRef(0)
const myReqId = ++reqIdRef.current
await fetch(...)
if (myReqId !== reqIdRef.current) return  // устарел
В usePriceCalculator. Альтернатива AbortController.

5. Module-level cache + in-flight dedup

Ts

const cache = new Map<string, T>()
const inflight = new Map<string, Promise<T | null>>()
В useModelUIConfig. Запрос за одним и тем же slug → один HTTP-запрос даже если хук используется в 5 компонентах одновременно.

6. Optimistic UI с rollback

Ts

const oldValue = cache[key]
setCache(key, newValue)  // оптимистично
try {
  await api.toggle(...)
} catch {
  setCache(key, oldValue)  // rollback
}
В useFavorites. Также в useAdminModels.patchLocal.

7. getState() в callbacks (избегаем замыканий)

Ts

const loadModels = useCallback(async () => {
  const state = useModelsStore.getState()  // актуальное состояние
  if (state.isLoaded) return
  // ...
}, [])  // ← пустые deps, callback стабилен
В useModels, useGeneration. Используется когда нужно прочитать актуальный state в useCallback без перерендера.

8. Dual WS + Polling

В useGeneration:

WS для real-time
Polling как fallback (если WS отвалился или event потерян)
Оба источника проверяют shownToasts — нет дублей
9. Fallback при ошибке API

В useModels, useBilling:

Ts

catch (err) {
  setModels(fallbackModels)  // или setPackages(fallbackPackages)
}
Приложение остаётся работоспособным даже при недоступном бэке.

⚠️ Замеченные проблемы

🔴 Критичные

useChat.sendMessage дублируется в ChatPage.tsx: компонент реализует streamChat() напрямую, не используя метод хука. Это мёртвый код внутри useChat.

useBilling.loadPackages/loadPlans не используются: компоненты TopUpPage и SubscriptionPage имеют свои хардкодные PKGS и планы. Метод вызывается только в useBilling-внутреннем state, но компоненты к нему не обращаются.

useFavoritesStore в неправильном месте: лежит внутри src/hooks/useFavorites.ts, хотя все Zustand-сторы должны быть в src/stores/.

useUser.refetch и refreshBalance делают тот же запрос — один из них лишний.

useAdminModels не экспортируется из barrel — inconsistency.

🟡 Средне

Локальный state в useBilling вместо стора → каждый компонент получает свой state. Если 2 компонента вызывают loadTransactions() — будет 2 запроса.

useFavorites cache не инициализируется: при показе списка элементов isFavorite() всегда возвращает false до первого toggle. Нет batch load.

shownToasts Set никогда не очищается — memory leak (хоть и маленький).

useChat.createChat — заглушка для совместимости. Если она нигде не нужна — удалить.

maxAttempts = 120 в polling: 6 × 3 сек + 114 × 5 сек = 18 + 570 = ~9.8 мин. Для аудио/видео генерации может быть мало (длинные ролики делаются 5-15 мин). Хорошо бы вынести в конфиг по типу.

Inconsistency в ApiResponse / ApiEnvelope — в каждом хуке свой алиас. Должен быть один общий тип в src/types/api.ts.

useGeneration mounts loadHistory только когда есть token — но что если token приходит после mount хука? Эффект сработает (deps [token]), но historyLoadAttempted.current — однократно. ✅ Логично.

Inconsistency favorite API:

useFavorites.toggle → POST /favorites/toggle
useGeneration.toggleFavorite → PUT /generation/:id/favorite
Два разных endpoint'а для concept "favorite". Запутывает.

🟢 Минор

slugToCategory в useChat всегда возвращает 'text' — заглушка, можно упростить.

guessProvider хардкодом в useModels — бэк должен возвращать provider обязательно.

guessCost(type) фолбэки — magic numbers. Должны быть в конфиге.

console.log/warn разбросаны по коду — нужен единый logger с уровнями.

isApiError импортируется не везде: в useChat используется err: any и парсится вручную (err?.response?.status).

useFavorites: cache key через шаблон строки ${type}:${itemId} — могут быть коллизии если type/itemId содержат :. Лучше Map с tuple-ключом или объект.

extractReferralCode разбросана между start_param, URL и localStorage — много путей. Логично, но usefulness localStorage fallback под вопросом — когда он реально срабатывает?

TypeScript any:

mapBackendGeneration(g: any) в useGeneration
err: any в useChat
g.params без типа
apiClient.get<ApiResponse<any>> в applyPromo
useGeneration хранит pollingTimers как useRef Map — но при unmount хука таймеры НЕ очищаются. Если переключиться на /admin → размонтировать → таймеры продолжат тикать (хотя cleanup нет в useEffect).

useAuth.loginWithWidget throw err — но также показывает toast.error. Calling code должен учитывать оба пути.

🔌 Зависимости между хуками (graph)


useAuth
  ├─ useAuthStore
  ├─ useUserStore
  └─ useTelegram (context)

useUser
  └─ useUserStore

useChat
  ├─ useChatStore
  ├─ useUserStore (баланс)
  ├─ useModelsStore (имена моделей)
  └─ useAuthStore (token check)

useGeneration
  ├─ useGenerationStore
  ├─ useAuthStore (token для WS)
  ├─ useUserStore (баланс check)
  ├─ useModelsStore (поиск модели)
  └─ @/lib/ws (connectSocket, subscribeToGeneration)

useBilling
  └─ useUserStore (applyPromo обновляет профиль)

useFavorites
  └─ useFavoritesStore (СВОЙ!)

useModels
  └─ useModelsStore

useModelUIConfig
  └─ (module-level cache)

usePriceCalculator
  └─ (только локальный state)

useOffline
  └─ (только window events)

useAdminAuth
  ├─ useAuthStore
  └─ useRouter (Next.js!)

useAdminModels
  └─ (только локальный state)
🔥 Что критично для понимания

1. Source of Truth для пользователя


Backend (/user/me)
  ↓
useUserStore.user: UserProfile | null
  ↓
useUser hook (читает stores)
  ↓
Компоненты
Балансы списываются оптимистично в useChat (после стриминга) и useGeneration (косвенно через WS). Авторитетный источник — /user/me, можно перезагрузить через useUser.refetch().

2. Загрузка моделей (критический путь)


layout.tsx → <ModelsInitializer>
  ↓
useEffect → useModels.loadModels()
  ↓
GET /models → modelsStore.setModels
  ↓ 
Если ошибка → fallback из @/lib/data
До успешной загрузки useModels возвращает fallbackModels. Это значит компоненты могут получить устаревший список в первые миллисекунды.

3. Streaming flow (LLM)


ChatPage.handleSend
  ↓
streamChat() напрямую из @/lib/api (НЕ через useChat!)
  ↓
chatStore: streamingContent, isStreaming
  ↓
Render через useChatStore
useChat.sendMessage существует, но не используется компонентами. Дубликат.

4. Generation flow (image/video/audio)


GenerationPage.handleGenerate
  ↓
useGeneration.generate(request)
  ↓
POST /generation/{image|video|audio}
  ↓
addGeneration(pending)
  ↓
WS subscribe + Polling start
  ↓
WS event OR poll → updateGeneration(progress/completed/failed)
  ↓
shownToasts dedup → toast.success once
5. Кэширование стратегии

useModelUIConfig: module-level Map (между ремаунтами) + in-flight dedup
usePriceCalculator: НЕТ кэша — каждый запрос свежий (но debounced)
useModels: store level
useFavorites: свой store
