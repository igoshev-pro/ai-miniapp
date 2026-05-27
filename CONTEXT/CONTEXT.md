📚 MASTER CONTEXT: SPICHKI AI Frontend

🗂️ Навигатор по контекстам


CONTEXT/
├── 01_common.md      ⚙️  Стек, конфиг, Docker, env
├── 02_structure.md   🗺️  Роутинг, дерево файлов
├── 03_styles.md      🎨  globals.css, дизайн-система
├── 04_components.md  🧩  30 компонентов, SpichkiApp
├── 05_tg.md          📱  TelegramContext, WebApp SDK
├── 06_hooks.md       🪝  12 хуков, бизнес-логика
├── 07_lib.md         📦  api/, ws/, telegram.ts, data.ts
├── 08_stores.md      🏪  6 Zustand сторов
└── 09_types.md       📐  Admin domain types (5 файлов)
🎯 Что за проект

SPICHKI AI — агрегатор нейросетей с двумя режимами работы:

Telegram Mini App (основной) — автоавторизация через initData
Веб-сайт (fallback) — логин через Telegram Login Widget
Валюта платформы: «Спички» (токены). 1 спичка ≈ не доллар, не рубль — внутренняя единица.

Генерация поддерживает: текст (LLM чат), изображения, видео, аудио (ElevenLabs + Suno).

🛠️ Стек (быстрая справка)

Слой	Технология
Framework	Next.js 16, App Router, output: standalone
UI	React 19, TypeScript 5, Tailwind v4 + BEM CSS
State	Zustand 5 (persist только auth)
HTTP	axios (REST), native fetch (SSE), XHR (upload)
Realtime	socket.io-client 4 (WS)
Telegram	window.Telegram.WebApp SDK
Deploy	Docker, node:20-alpine, порт 3000
Env переменные (build-time):


NEXT_PUBLIC_API_URL          → baseURL для axios
NEXT_PUBLIC_WS_URL           → URL WebSocket (⚠️ не используется в socket.ts — хардкод!)
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME → для Login Widget
🏛️ Архитектура одной картиной


Next.js App Router
│
├── /                    → <SpichkiApp> (SPA, весь основной UI)
│   │
│   └── SpichkiApp.tsx   → state-роутер (page: Page)
│       ├── Loading gates (3 барьера перед рендером)
│       ├── TelegramLoginButton (если нет auth в браузере)
│       └── 14 страниц через условный рендер
│
└── /admin/*             → Next.js multi-route (отдельный layout)
    ├── users/
    ├── billing/
    ├── models/
    ├── promo-codes/
    ├── transactions/
    └── settings/

Провайдеры (layout.tsx):
  <TelegramProvider>           → инициализация SDK, CSS-vars, haptics
    <ModelsInitializer />      → loadModels() при старте
    <SpichkiApp />
    <ToastContainer />
  </TelegramProvider>
🚦 Init Flow (критический путь)


Браузер загружает страницу
  │
  ├─ Telegram SDK (beforeInteractive script)
  │   └─ window.Telegram.WebApp доступен до React
  │
  ├─ TelegramProvider mount
  │   ├─ getWebApp() → проверяет initData.length > 0
  │   ├─ Если TG: ready(), expand(), setHeaderColor(), applySafeArea()
  │   ├─ setWebApp(), setIsTelegram(true/false)
  │   └─ setIsReady(true)  ← 1-й барьер снят
  │
  ├─ Zustand persist hydration (async)
  │   └─ localStorage['spichki-auth'].token восстановлен
  │       └─ hydrated = true  ← 2-й барьер снят
  │
  ├─ useAuth mount
  │   ├─ Если token есть → setReady() (skip backend)
  │   ├─ Если initData → POST /auth/telegram → setToken() + setUser()
  │   └─ authReady = true  ← 3-й барьер снят
  │
  └─ SpichkiApp рендерит основной UI
Важно: все три isReady && authReady && hydrated должны быть true. Пока нет — экран загрузки.

🗺️ Навигация (SpichkiApp)

Typescript

type Page = 'home' | 'all-models' | 'chat' | 'image-generation' |
            'video-generation' | 'audio-generation' | 'chats-history' |
            'profile' | 'topup' | 'transactions' | 'subscription' |
            'referral' | 'favorites' | 'support'
Стек навигации: pageHistory: Page[] — не браузерная History API. При F5 всегда home.

Ключевые методы:

navigateTo(page) → push в стек
goBack() → pop (или home)
openChat(modelSlug?, chatId?) → устанавливает chatModel + chatId, page='chat'
openGeneration(type) → page='image-generation'|'video-generation'|'audio-generation'
💾 State Management

Zustand сторы (все в src/stores/)


auth.store    → { token, isReady }          persist → localStorage
user.store    → { user: UserProfile, isLoaded }
chat.store    → { chats, messages, activeChatId, isStreaming, streamingContent }
generation.store → { generations, activeGeneration, historyLoaded }
models.store  → { models, categories, isLoaded, isLoading }
toast.store   → { toasts[] }
⚠️ useGenerationStore и useModelsStore не в barrel stores/index.ts — импортируются напрямую.

Ключевые паттерны

Persist hydration gate (в useAuth, useAdminAuth):

Typescript

const [hydrated, setHydrated] = useState(
  () => useAuthStore.persist?.hasHydrated() ?? true
)
getState() вне React (в client.ts, sse.ts, upload.ts, socket.ts):

Typescript

const token = useAuthStore.getState().token  // Zustand работает вне компонентов
Toast глобально:

Typescript

import { toast } from '@/stores/toast.store'
toast.error('Ошибка')  // без React, без хуков
🔌 API слой

Три HTTP клиента (намеренно разные)


apiClient (axios)  → все обычные запросы + JWT interceptor + error normalization
streamChat (fetch) → SSE стриминг (axios не поддерживает ReadableStream)
uploadImage (XHR)  → файлы с прогрессом (fetch не поддерживает upload progress)
Error normalization (ApiError)

Typescript

{
  status: number
  message: string
  isAuth: boolean      // 401
  isBalance: boolean   // 402 — недостаточно спичек
  isRateLimit: boolean // 429
  isServer: boolean    // 5xx
}
// При 401 → автоматически clearToken()
WebSocket (socket.io)


Namespace: /generation (хардкод)
URL: https://spichki.tw1.ru (хардкод! ⚠️ не из env)
События:
  ← generation:status     { generationId, status }
  ← generation:progress   { generationId, progress, eta? }
  ← generation:completed  { generationId, resultUrls }
  ← generation:failed     { generationId, errorMessage, refunded }
  → generation:subscribe  { generationId }
🎨 Генерация — общий flow


Компонент (Image/Video/AudioGenerationPage)
  │
  ├─ useModelUIConfig(slug) → GET /generation/ui-config/:slug
  │   └─ возвращает UIParameter[], pricingMatrix[], inputCapabilities
  │
  ├─ usePriceCalculator(slug, params, { debounceMs: 300 })
  │   └─ POST /generation/calculate-price { modelSlug, params }
  │   └─ Кэш lastPriceRef (анти-flicker)
  │
  └─ useGeneration.generate({ type, modelSlug, prompt, settings })
      ├─ POST /generation/{image|video|audio}
      ├─ addGeneration(pending) → стор
      ├─ subscribeToGeneration(id) → WS
      └─ startPolling(id) → fallback каждые 3-5 сек
          │
          WS event OR poll:
          └─ updateGeneration(id, { status, progress, resultUrls })
              └─ shownToasts dedup → toast.success once
💬 LLM Стриминг — flow


ChatPage.handleSend()
  │
  └─ streamChat({ conversationId, modelSlug, content, imageUrls? })
      │   (native fetch + ReadableStream, НЕ axios)
      │
      ├─ onConversation → addChat() если новый
      ├─ onToken → appendStreamingContent(chunk) → ре-рендер Zustand
      ├─ onDone → addMessage(assistant) + resetStreaming() + updateBalance()
      └─ onError → resetStreaming() + toast
      
AbortController → abortRef.current.abort() при нажатии Stop
⚠️ useChat.sendMessage() существует, но не используется ChatPage — дубликат.

🔑 Auth слой

Три точки входа


1. Telegram Mini App  → initData → POST /auth/telegram
2. Web + cached JWT   → token в localStorage → setReady() без запроса
3. Web без JWT        → <TelegramLoginButton> → POST /auth/telegram-widget
Реферальный код (3 источника)


start_param: "ref_XXX" → ref_XXX → XXX
URL: ?ref=XXX || ?referral=XXX
localStorage: pending_referral_code (fallback)
Logout (проблема!)

clearToken() очищает token, но НЕ вызывает useUserStore.getState().clear(). User остаётся в сторе.

📱 Telegram интеграция

CSS-переменные от TelegramProvider

Css

--safe-area-top              /* notch + TG header height */
--tg-viewport-height         /* текущая высота */
--tg-viewport-stable-height  /* без клавиатуры */
body.tg-app

Класс форсирует мобильный layout через CSS !important. Где выставляется — неизвестно (не в TelegramProvider, не в SpichkiApp из того что видно).

Детекция Telegram

Typescript

const isRealTelegram = !!wa.initData && wa.initData.length > 0
// window.Telegram.WebApp существует и в браузере, но initData пустой
Haptics (везде через useTelegram)

Typescript

haptic('light')                    // тап по кнопке
hapticNotification('success')      // успешное действие
hapticSelection()                  // смена пункта
🎨 Дизайн-система

Основные токены

Css

--bg-primary:       #08080a    /* фон */
--accent-yellow:    #facc15    /* CTA, активные */
--accent-red:       #ef4444    /* FAB, danger */
--bg-glass:         rgba(18,18,22,0.72) + blur(20px)  /* glassmorphism */
--header-height:    56px
Layout режимы (только CSS, без JS)


< 768px          → mobile (sticky header + bottom nav)
768-1023px       → tablet (sidebar 72px, icons only)
≥ 1024px         → desktop (sidebar 240px, full)
body.tg-app      → forced mobile (!important overrides)
Стилизация — гибридная (проблема!)

Typescript

// BEM (globals.css)
className="bottom-nav__item bottom-nav__item--active"

// Tailwind utilities
className="flex items-center gap-2 rounded-xl bg-white/[0.04]"

// CSS-переменные через arbitrary
className="bg-[var(--bg-glass)] text-[var(--accent-yellow)]"

// Inline стили
style={{ background: 'linear-gradient(...)' }}
Нет единого стандарта — компоненты смешивают все 4 подхода.

💳 Биллинг

Балансы пользователя


tokenBalance    — основной (куплен)
bonusTokens     — бонусный (промокоды, рефераллы)
totalBalance    — вычисляется на фронте (= tokenBalance + bonusTokens)
cashbackBalance — ⚠️ ТОЛЬКО в AdminUser, НЕ в UserProfile
Правило списания


Сначала тратятся bonusTokens → потом tokenBalance
Платёжные провайдеры


stars      → Telegram Stars
tochka     → Точка (РФ ₽)
freedompay → FreedomPay (KZ ₸)
heleket    → Crypto (USDT/BTC)
Курс USD — хардкод в двух местах с разными значениями!


TopUpPage:       R = 75
SubscriptionPage: RATE = 90
🤖 Модели

Типы (три разных enum для одного!)


lib/data.ts (ModelItem.category): 'text' | 'image' | 'video' | 'audio'
generation.store (GenerationType): 'image' | 'video' | 'audio'  (нет 'text'!)
admin-model.ts (GenerationType):   'chat' | 'image' | 'video' | 'audio' | 'embedding'
Маппинг: 'text' (UI) ↔ 'chat' (backend AdminModel.type)

Загрузка


layout.tsx → <ModelsInitializer> → useModels.loadModels()
  → GET /models → modelsStore.setModels()
  → Пока не загружено → fallbackModels из data.ts (38 моделей)
Ценообразование модели (3 уровня + override)


1. tokenCost (override — если задан, игнорирует всё)
2. fixedCostPerGeneration (для image/video/audio)
3. pricingMatrix[conditions → costInTokens] (catch-all последним)
4. costPerMillionTokens (для LLM, с minTokenCost порогом)
👮 Админка

Auth

Typescript

// useAdminAuth.ts
GET /admin/check → { ok, role: 'admin'|'super_admin', userId }
// При ok=false или 401/403 → router.replace('/')
API объекты (src/lib/api/admin-*.ts)


adminUsersApi        → list, getById, changeRole, toggleBan, adjustBalance, remove
adminTransactionsApi → list, getById, getStats
adminPromoCodesApi   → list, getOne, stats, create, update, toggle, remove
adminModelsApi       → list, getOne, update, toggle, create, remove
adminBillingApi      → listPlans/Packages, create/update/toggle/delete Plans/Packages
unwrap паттерн (все admin API)

Typescript

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}
// Бэк: { success: true, data: T }
// axios: { data: { success: true, data: T } }
// unwrap: T
⭐ Избранное

Два разных API endpoint (!)


useFavorites.toggle()         → POST /favorites/toggle  (для чатов и моделей)
useGeneration.toggleFavorite() → PUT /generation/:id/favorite  (для генераций)
Optimistic UI


1. cache[key] = !current  (мгновенно)
2. POST /favorites/toggle
3. cache[key] = server.isFavorite  (синхронизация)
4. catch → cache[key] = current  (rollback)
⚠️ Cache не инициализируется — isFavorite() всегда false пока не дёрнут toggle.

🔴 Критические проблемы (топ-10)

WS_URL хардкод в socket.ts — не берётся из NEXT_PUBLIC_WS_URL
disconnectSocket() не вызывается при logout — старый токен в WS
clearToken() не очищает userStore — данные юзера остаются после logout
useChat.sendMessage дублирует ChatPage — мёртвый код в хуке
useBilling.loadPackages/loadPlans не используются — компоненты с хардкодом
Рассинхронизация SubscriptionPlan: 'free'|'pro'|'premium' vs 'free'|'basic'|'pro'|'unlimited'
Рассинхронизация UserRole: 'moderator' vs 'premium' в разных типах
s.onAny(console.log) в продакшне — логирует все WS пакеты
uploadAudio() не существует — endpoint есть, функции нет
useFavoritesStore вне src/stores/ — лежит в хуке
🟡 Средние проблемы (топ-10)

streamingContent в Zustand → 50+ ре-рендеров в секунду при стриминге
body.tg-app неизвестно где выставляется — не в TelegramProvider
chatFeedData в data.ts — 12 захардкоженных чатов, скорее мёртвый код
useFavorites cache не инициализируется — всегда false до toggle
Два жёлтых цвета: #facc15 (CSS var) и #fbbf24 (hardcode) — рассинхронизация
--accent-green не объявлен в :root — используется в profile CSS
maxAttempts = 120 в polling — 9.8 мин, мало для длинных видео (10-15 мин)
useBilling локальный state — каждый вызов = отдельная копия данных
GenerationType = ... | string — TypeScript не защищает от опечаток
Курс USD разный: R=75 в TopUpPage, RATE=90 в SubscriptionPage
🗑️ Мёртвый код (удалить)

Файл	Причина
Header.tsx	Заменён StickyHeader.tsx
HistoryList.tsx	Заменён ChatFeed.tsx
BalanceCard.tsx	Захардкоженные 12 450
FeaturedCard.tsx	Закомментирован в SpichkiApp
TestModels.tsx	Dev компонент
globals.backup.css × 3	Бэкапы CSS
CSS .referral-*	Старая версия (используется .ref-*)
CSS .subscription-card*	Старая версия (используется .sub-card*)
CSS .gen-settings-modal	Старая версия (используется .gen-settings-sheet)
📐 Типы — быстрая справка

UserProfile (клиентский)

Typescript

// src/stores/user.store.ts
{ id, telegramId, firstName, role, tokenBalance, bonusTokens,
  totalBalance, subscription: { plan, expiresAt, isActive }, referralCode }
AdminUser (полная БД-модель)

Typescript

// src/types/admin-user.ts
{ _id, tokenBalance, bonusTokens, cashbackBalance, cashbackEarnedTotal,
  totalTokensSpent, totalDeposited, dailyGenerations, isBanned, ... }
ModelItem (фронтенд)

Typescript

// src/lib/data.ts
{ id, name, slug, provider, category, description, cost, supportsVision }
AdminModel (бэкенд/админка)

Typescript

// src/types/admin-model.ts
{ _id, slug, type, uiParameters[], pricingMatrix[], inputCapabilities,
  providerMappings[], fixedCostPerGeneration, tokenCost, ... }
🔧 Часто используемые паттерны

1. Полноэкранные страницы (генерация + чат)

Typescript

<div className="fs-page fixed inset-0 z-[5] flex flex-col">
  <div className="fs-page__bar shrink-0">      {/* header */}
  <div className="fs-page__scroll flex-1 min-h-0 overflow-y-auto">
  <div className="fs-page__input shrink-0">    {/* input */}
</div>
// CSS сдвигает на left: 240px на desktop, сбрасывает при body.tg-app
2. Telegram BackButton (во всех полноэкранных)

Typescript

useEffect(() => {
  if (!webApp?.BackButton) return
  webApp.BackButton.show()
  const handler = () => {
    if (showSettings) { setShowSettings(false); return }
    onBack?.()
  }
  webApp.BackButton.onClick(handler)
  return () => { webApp.BackButton.offClick(handler); webApp.BackButton.hide() }
}, [webApp, onBack, showSettings])
3. Infinite scroll

Typescript

const loaderRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (!loaderRef.current || !hasMore) return
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting && !loadingMore) loadMore() },
    { threshold: 0.1 }
  )
  observer.observe(loaderRef.current)
  return () => observer.disconnect()
}, [hasMore, loadingMore])
4. One-shot effect guard (против Strict Mode double-invoke)

Typescript

const attempted = useRef(false)
useEffect(() => {
  if (attempted.current) return
  attempted.current = true
  // ...
}, [deps])
5. Antificker цена при пересчёте

Typescript

const lastPriceRef = useRef<PriceData | null>(null)
// При изменении slug → lastPriceRef.current = null
// При получении цены → сохранить в ref
// При isCalculating → показывать lastPriceRef.current ?? modelMinCost
📊 Размеры и лимиты (хардкод в коде)


MAX_IMAGES = 10         (ChatPage, image attachments)
MAX_FILE_SIZE = 10MB    (validateImageFile, audio upload)
THRESHOLD = 70px        (PullToRefresh)
maxAttempts = 120       (WS polling ≈ 9.8 мин)
reconnectionAttempts = 15 (WS reconnect)
Toast duration = 3000ms (по умолчанию)
Chat page limit = 50    (сообщений за раз)
Chats limit = 50        (чатов за раз)
Generation history = 50 (генераций за раз)
ElevenLabs voices = 19  (хардкодом в AudioGenerationPage)
ElevenLabs languages = 12 (хардкодом)
🔗 Как связаны блоки (dependency graph)


09_types      ←── 07_lib (admin API используют типы)
     ↑
08_stores ←────── 06_hooks (хуки читают/пишут в сторы)
     ↑                ↑
07_lib ────────────── 06_hooks (хуки вызывают API)
     ↑
05_tg ─────────────── 06_hooks (useAuth использует useTelegram)
     ↑
04_components ─────── 06_hooks + 08_stores + 07_lib
     ↑
02_structure ──────── 04_components (SpichkiApp = корень)
     ↑
01_common ─────────── всё (конфиг, env, пакетный менеджер)
03_styles ─────────── 04_components (классы используются в JSX)
💡 Что спросить/уточнить при работе

При получении задачи проверить:

Какой слой затрагивается? → смотреть соответствующий блок
Есть ли fallback? → модели (data.ts), пакеты (useBilling), планы (SubscriptionPage)
Это Telegram или веб? → isTelegram из useTelegram()
Нужен ли haptic? → добавить haptic('light') на интерактивные элементы
Затрагивает ли баланс? → проверить updateBalance() и логику bonus-first
Это admin или user? → разные типы _id vs id, разные роли, разные планы
Нужен ли desktop layout? → учесть body.tg-app override и left: 240px сдвиги
Затрагивает ли генерацию? → проверить оба источника статуса (WS + polling), shownToasts dedup, mergeHistory при загрузке
Нужна ли пагинация? → IntersectionObserver паттерн, проверить есть ли hasMore в ответе бэка
Затрагивает ли стриминг? → appendStreamingContent вызывает ре-рендер Zustand ~50 раз/сек, осторожно с тяжёлыми вычислениями в подписчиках
Это новый компонент или правка существующего? → проверить нет ли уже мёртвого кода с похожей функциональностью (Header, HistoryList, BalanceCard)
Затрагивает ли избранное? → два разных endpoint (/favorites/toggle vs /generation/:id/favorite), cache не инициализирован
🔍 Быстрый поиск по задачам

"Нужно добавить новую страницу в основное приложение"


1. Добавить тип в SpichkiApp.tsx → type Page
2. Добавить условный рендер в JSX
3. Добавить навигационный метод (navigateTo / openXxx)
4. Добавить пункт в BottomNav или DesktopSidebar если нужно
5. Telegram BackButton через useEffect паттерн (блок 04/06)
6. Использовать .fs-page структуру для полноэкранных
"Нужно добавить новую модель AI"


1. Добавить в src/lib/data.ts (allModels) как fallback
2. Бэк должен вернуть через GET /models
3. Если видеомодель — добавить в FALLBACK в VideoGenerationPage
4. Если аудиомодель — добавить в FALLBACK_BY_TYPE + detectType() в AudioGenerationPage
5. Проверить guessProvider() в useModels.ts если нужен новый провайдер
"Нужно добавить новый параметр генерации"


1. Добавить UIParameter на бэке (или в FALLBACK_BY_TYPE на фронте)
2. Если affectsPrice=true → бэк должен обновить /generation/calculate-price
3. Добавить в body building в useGeneration.generate() (selective fields)
4. Добавить в settings state компонента генерации
5. Обновить PricingRule conditions если влияет на матрицу цен
"Нужно исправить баланс пользователя"


Источники правды (по приоритету):
1. useUser.refetch() → GET /user/me → setUser() (авторитетный)
2. useUser.refreshBalance() → GET /user/me → updateBalance()
3. useChat (после стриминга) → updateBalance(newMain, newBonus) вручную
4. WS completed event → бэк должен вернуть новый баланс
5. useBilling.applyPromo() → после промокода делает GET /user/me
"Нужно добавить новый тип тоста / уведомления"


// Из любого места без React:
import { toast } from '@/stores/toast.store'
toast.success('Текст')   // 3000ms
toast.error('Текст')
toast.warning('Текст')
toast.info('Текст')

// ⚠️ Нет API для кастомного duration — всегда 3000ms
// Для persistent тоста: useToastStore.getState().add('info', msg, 0)
"Нужно добавить новую admin страницу"


1. Создать src/app/admin/new-section/page.tsx
2. Добавить пункт в src/app/admin/layout.tsx навигацию
3. Создать API функции в src/lib/api/admin-new-section.ts (по паттерну admin-*.ts)
4. Создать типы в src/types/admin-new-section.ts
5. Использовать useAdminAuth() для проверки прав
6. unwrap<T>(res) паттерн для API ответов
"Нужно добавить новый провайдер оплаты"


1. Добавить в PaymentProvider union в useBilling.ts
2. Добавить кнопку в TopUpPage.tsx (провайдеры секция)
3. Бэк POST /billing/pay/tokens должен поддерживать новый provider
4. Если нужна иконка/валюта — добавить в маппинги в TopUpPage
"Нужно починить Telegram BackButton"


// Правильный паттерн (блок 04):
useEffect(() => {
  if (!webApp?.BackButton) return
  webApp.BackButton.show()
  const handler = () => { /* логика */ onBack?.() }
  webApp.BackButton.onClick(handler)
  return () => {
    webApp.BackButton.offClick(handler)  // ← обязательно offClick!
    webApp.BackButton.hide()
  }
}, [webApp, onBack, /* все зависимости */])

// ⚠️ showBackButton() из TelegramContext НЕ делает offClick
// Используй webApp.BackButton напрямую
"Нужно добавить загрузку файла"


// Для изображений (уже реализовано):
import { uploadImage, validateImageFile } from '@/lib/api'
const error = validateImageFile(file)  // проверка до загрузки
const result = await uploadImage(file, { signal, onProgress: (p) => setProgress(p) })
result.url  // публичный URL в S3

// Для аудио:
// ⚠️ uploadAudio() НЕ существует! Только endpoint POST /upload/audio
// Нужно реализовать по аналогии с uploadImage()
📋 Структура типичного хука

Typescript

// Паттерн из блока 06 — основной шаблон хука

'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores'
import { apiClient } from '@/lib/api'
import { toast } from '@/stores/toast.store'
import { isApiError } from '@/lib/api'

export function useFeature() {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Persist hydration gate (если нужен токен)
  const token = useAuthStore((s) => s.token)

  // One-shot guard (если нужна одноразовая инициализация)
  const initialized = useRef(false)

  const load = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<ApiResponse<T>>(ENDPOINTS.FEATURE)
      setData(res.data.data)
    } catch (err) {
      if (isApiError(err)) {
        if (err.isBalance) toast.warning('Недостаточно спичек')
        else if (err.isRateLimit) toast.warning('Слишком много запросов')
        else toast.error(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load()
  }, [load])

  return { data, isLoading, reload: load }
}
🧱 Структура типичного компонента генерации

Typescript

// Все 4 страницы генерации следуют этому скелету:

'use client'

export default function XxxGenerationPage({ initialModel, onBack }) {

  // 1. Модели категории
  const { models: allModels } = useModels()
  const categoryModels = useMemo(
    () => allModels.filter(m => m.category === 'xxx'),
    [allModels]
  )

  // 2. Текущая модель (slug)
  const [slug, setSlug] = useState<string>(resolveInitialSlug())
  const [syncedSlug, setSyncedSlug] = useState<string | null>(slug)

  // 3. UI конфиг с бэка
  const { config: uiConfig } = useModelUIConfig(slug)

  // 4. Capabilities (бэк + fallback)
  const caps = useMemo(() => uiConfig?.inputCapabilities ?? FALLBACK_CAPS, [uiConfig, slug])

  // 5. Параметры генерации
  const [quality, setQuality] = useState(caps.defaultQuality ?? 'standard')
  // ... другие параметры

  // 6. Цена с дебаунсом
  const { price, isCalculating } = usePriceCalculator(slug, priceParams, {
    enabled: !!uiConfig && syncedSlug === slug,
    debounceMs: 300,
  })

  // 7. AntiFlicker кэш цены
  const lastPriceRef = useRef(null)
  useEffect(() => {
    if (price && !isCalculating) lastPriceRef.current = price
  }, [price, isCalculating])
  useEffect(() => { lastPriceRef.current = null }, [slug])

  // 8. Сброс параметров при смене модели
  useEffect(() => {
    if (!uiConfig || syncedSlug === slug) return
    // reset state to uiConfig.defaultParams
    setSyncedSlug(slug)
  }, [uiConfig, slug, syncedSlug])

  // 9. Initial model sync (один раз)
  const initialAppliedRef = useRef(false)
  useEffect(() => {
    if (initialAppliedRef.current || !initialModel || !categoryModels.length) return
    const match = categoryModels.find(m =>
      m.slug?.toLowerCase() === initialModel.toLowerCase()
    )
    if (match) { setSlug(match.slug); initialAppliedRef.current = true }
  }, [initialModel, categoryModels])

  // 10. Telegram BackButton
  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    const handler = () => {
      if (showSettings) { setShowSettings(false); return }
      if (showModelPicker) { setShowModelPicker(false); return }
      onBack?.()
    }
    webApp.BackButton.onClick(handler)
    return () => { webApp.BackButton.offClick(handler); webApp.BackButton.hide() }
  }, [webApp, onBack, showSettings, showModelPicker])

  // 11. Layout
  return (
    <div className="fs-page fixed inset-0 z-[5] flex flex-col">
      <div className="fs-page__bar shrink-0">  {/* model picker + params */}
      <div className="fs-page__scroll flex-1 min-h-0 overflow-y-auto">
        {/* results */}
      </div>
      <div className="fs-page__input shrink-0">  {/* prompt + generate button */}
      
      {/* Settings sheet */}
      {showSettings && (
        <>
          <div className="gen-settings-overlay" onClick={() => setShowSettings(false)} />
          <div className="gen-settings-sheet"> {/* params */ }
        </>
      )}
    </div>
  )
}
🗺️ Полный список файлов проекта


src/
├── app/
│   ├── admin/
│   │   ├── _components/          (приватные компоненты админки)
│   │   ├── billing/page.tsx
│   │   ├── models/page.tsx
│   │   ├── promo-codes/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── users/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx              (дашборд)
│   ├── favicon.ico
│   ├── globals.css               ← АКТИВНЫЙ (остальные удалить)
│   ├── globals.backup.css        ← удалить
│   ├── globals.css.backup        ← удалить
│   ├── globals.css.backup2       ← удалить
│   ├── layout.tsx                (root: TelegramProvider + ModelsInitializer)
│   └── page.tsx                  (→ <SpichkiApp />)
│
├── components/
│   ├── auth/
│   │   └── TelegramLoginButton.tsx
│   ├── providers/
│   │   └── ModelsInitializer.tsx
│   ├── ui/
│   │   ├── MediaResult.tsx
│   │   ├── MessageContent.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── ToastContainer.tsx
│   ├── ActionCards.tsx
│   ├── AllModelsPage.tsx
│   ├── AudioGenerationPage.tsx   (самый сложный — 6 типов аудио)
│   ├── Background.tsx
│   ├── BalanceCard.tsx           ← мёртвый код
│   ├── BottomNav.tsx
│   ├── Categories.tsx
│   ├── ChatFeed.tsx
│   ├── ChatPage.tsx              (~1500 строк)
│   ├── ChatsHistoryPage.tsx
│   ├── DesktopSidebar.tsx
│   ├── FavoritesPage.tsx
│   ├── FeaturedCard.tsx          ← мёртвый код (закомментирован)
│   ├── Header.tsx                ← мёртвый код
│   ├── HistoryList.tsx           ← мёртвый код
│   ├── ImageGenerationPage.tsx
│   ├── ProfilePage.tsx
│   ├── ReferralPage.tsx
│   ├── SpichkiApp.tsx            ← ROOT компонент
│   ├── StickyHeader.tsx
│   ├── SubscriptionPage.tsx
│   ├── SupportPage.tsx
│   ├── TestModels.tsx            ← мёртвый код
│   ├── TopUpPage.tsx
│   ├── TransactionsPage.tsx
│   └── VideoGenerationPage.tsx
│
├── context/
│   └── TelegramContext.tsx       (TelegramProvider + useTelegram)
│
├── hooks/
│   ├── index.ts                  (barrel — 11 хуков)
│   ├── useAdminAuth.ts           (не в barrel)
│   ├── useAdminModels.ts         (не в barrel)
│   ├── useAuth.ts
│   ├── useBilling.ts
│   ├── useChat.ts
│   ├── useFavorites.ts           (содержит useFavoritesStore!)
│   ├── useGeneration.ts          (самый сложный)
│   ├── useModelUIConfig.ts
│   ├── useModels.ts
│   ├── useOffline.ts
│   ├── usePriceCalculator.ts
│   └── useUser.ts
│
├── lib/
│   ├── api/
│   │   ├── index.ts              (barrel)
│   │   ├── admin-billing.ts
│   │   ├── admin-models.ts
│   │   ├── admin-promo-codes.ts
│   │   ├── admin-transactions.ts
│   │   ├── admin-users.ts
│   │   ├── client.ts             (axios instance + interceptors)
│   │   ├── endpoints.ts          (70+ URL констант)
│   │   ├── sse.ts                (streamChat — SSE стриминг)
│   │   └── upload.ts             (uploadImage — XHR)
│   ├── ws/
│   │   ├── index.ts              (barrel)
│   │   └── socket.ts             (socket.io singleton)
│   ├── data.ts                   (38 fallback моделей + chatFeedData)
│   └── telegram.ts               (WebApp тип + утилиты)
│
├── stores/
│   ├── index.ts                  (barrel — 4 стора)
│   ├── auth.store.ts             (token persist)
│   ├── chat.store.ts
│   ├── generation.store.ts       (не в barrel!)
│   ├── models.store.ts           (не в barrel!)
│   ├── toast.store.ts            (+ toast глобальный объект)
│   └── user.store.ts
│
├── types/
│   ├── admin-billing.ts
│   ├── admin-model.ts
│   ├── admin-promo.ts
│   ├── admin-transaction.ts
│   └── admin-user.ts
│
└── upload/                       (нестандартное расположение — проверить содержимое)
⚡ Быстрые ответы на типовые вопросы

Q: Как узнать текущий план пользователя?

Typescript

const { subscription } = useUser()
subscription.plan  // 'free' | 'basic' | 'pro' | 'unlimited'
subscription.isActive
Q: Как проверить что приложение в Telegram?

Typescript

const { isTelegram } = useTelegram()
Q: Как открыть внешнюю ссылку корректно?

Typescript

const { webApp, isTelegram } = useTelegram()
if (isTelegram && webApp) {
  webApp.openLink(url)           // обычная ссылка
  webApp.openTelegramLink(url)   // t.me/ ссылка
} else {
  window.open(url, '_blank')
}
Q: Как получить список генераций конкретного типа?

Typescript

import { useGenerationStore } from '@/stores/generation.store'
const images = useGenerationStore((s) => s.generations.filter(g => g.type === 'image'))
// или через метод:
const images = useGenerationStore.getState().getByType('image')
Q: Как добавить endpoint?

Typescript

// src/lib/api/endpoints.ts
export const ENDPOINTS = {
  // ...существующие
  NEW_FEATURE: '/new/endpoint',
  NEW_FEATURE_BY_ID: (id: string) => `/new/endpoint/${id}`,
}
Q: Как использовать apiClient вне React компонента?

Typescript

import { apiClient } from '@/lib/api'
// JWT подставляется автоматически через interceptor
// Токен читается через useAuthStore.getState().token
const res = await apiClient.get('/some/endpoint')
Q: Где хранится JWT токен?

Typescript

// localStorage ключ: 'spichki-auth'
// Zustand: useAuthStore.getState().token
// В axios: подставляется автоматически через request interceptor
// В WS: socket.auth = { token } при connectSocket(token)
// В SSE (streamChat): вручную в Authorization header
// В upload: вручную в XHR headers
Q: Как определить аудио-тип модели?

Typescript

// AudioGenerationPage.tsx → detectType(slug):
// 'suno'           → slug.includes('suno')
// 'elevenlabs-tts' → slug.includes('elevenlabs') && slug.includes('tts')
// 'elevenlabs-sfx' → slug.includes('sfx') || slug.includes('sound')
// 'elevenlabs-isolation' → slug.includes('isolation') || slug.includes('isol')
// 'elevenlabs-stt' → slug.includes('stt') || slug.includes('speech-to')
// 'elevenlabs-dialogue' → slug.includes('dialogue') || slug.includes('conv')
// default → 'generic'
Q: Как правильно обновить баланс после действия?

Typescript

const { refreshBalance } = useUser()
await refreshBalance()  // GET /user/me → updateBalance в сторе
// НЕ обновляй вручную если нет конкретной причины
Q: Как добавить новый CSS компонент?


1. globals.css → новый BEM блок в конце файла
2. Или Tailwind utilities прямо в JSX
3. Если нужны --css-переменные: bg-[var(--accent-yellow)]
4. Для desktop sidebar offset: добавить left: 240px / left: 72px
   и body.tg-app override с !important
Q: Как работает mergeHistory в generation store?


Цель: не перезаписать in-flight (pending/processing) генерации
      данными из истории API

1. Найти activeIds = { id всех pending/processing }
2. activeGens = generations.filter(id in activeIds)   ← in-flight
3. fromHistory = historyGens.filter(id NOT in activeIds)  ← только завершённые
4. result = [...activeGens, ...fromHistory]  ← in-flight всегда первые
Q: Почему иногда цена генерации не обновляется?


Возможные причины:
1. syncedSlug !== slug → usePriceCalculator.enabled = false
2. showSettings = false → enabled = false (в некоторых компонентах)
3. debounce 300ms ещё не прошёл
4. params ключи в разном порядке → JSON.stringify даёт разные строки → лишние запросы
5. isCalculating = true → показывается lastPriceRef кэш
Q: Почему SpichkiApp показывает loading screen?

Typescript

// 3 независимых барьера — все должны быть true:
if (!isReady) return <Loading />     // TelegramProvider не закончил init
if (!authReady) return <Loading />   // useAuth не завершил flow
if (!hydrated) return <Loading />    // Zustand persist не восстановил token

// Если завис — проверить:
// 1. isReady: TelegramProvider → setIsReady(true) в конце init useEffect
// 2. authReady: useAuth → setToken() или setReady()
// 3. hydrated: useAuthStore.persist?.hasHydrated()

Q: Почему isFavorite() всегда возвращает false?


useFavorites cache не инициализируется при загрузке.
Значение появляется только после первого toggle.

Workaround: при загрузке списка (чаты, модели) 
вручную прогревать кэш через setCache():

const { setCache } = useFavorites()
chats.forEach(chat => {
  if (chat.isFavorite) setCache('conversation', chat.id, true)
})
Q: Как правильно показать аватар пользователя?

Typescript

const { user, userInitials } = useTelegram()
const { user: profile } = useUser()

// Фото из Telegram SDK (приоритет):
user?.photo_url
// Фото из профиля:
profile?.photoUrl
// Fallback — инициалы:
userInitials  // 'ИП' через getUserInitials()
Q: Как узнать минимальную стоимость модели для отображения?

Typescript

// Из AdminModel (в админке):
model.minTokenCost

// Из ModelItem (в основном приложении):
model.cost  // минимальная стоимость в спичках

// При отображении цены в UI (анти-flicker паттерн):
const displayedCost = (() => {
  if (!isConfigReady) return model.cost         // нет данных → fallback
  if (price && !isCalculating) return price.costInTokens
  if (lastPriceRef.current) return lastPriceRef.current.cost  // кэш
  return model.cost
})()
Q: Как работает referral deep link?


Пользователь делится ссылкой:
  https://t.me/BOT_NAME?start=ref_XXXXX

При открытии Mini App:
  webApp.initDataUnsafe.start_param = 'ref_XXXXX'
  
extractReferralCode() → 'XXXXX'
  └─ сохраняется в localStorage['pending_referral_code']
  
POST /auth/telegram { initData, referralCode: 'XXXXX' }
  └─ clearPendingReferral() после успеха
🔗 Связи компонентов с хуками (полная карта)


SpichkiApp
  ├── useTelegram()     isReady, isTelegram, webApp, user
  ├── useAuth()         isReady (authReady), loginWithWidget
  ├── useAuthStore()    hydrated (persist)
  ├── useChat()         switchToNewChat
  └── useUser()         (косвенно через дочерние)

StickyHeader
  └── useUser()         balance, subscription.plan

BottomNav
  └── useTelegram()     haptic

DesktopSidebar
  └── useUser()         tokenBalance, bonusTokens, subscription

Categories
  └── useModels()       models (для count)

ChatFeed
  └── useChat()         chats, loadChats, deleteChat
  └── useFavorites()    toggle, isFavorite

ChatPage
  ├── useTelegram()     webApp (BackButton), haptic, isTelegram
  ├── useUser()         user (balance check)
  ├── useChatStore()    messages, isStreaming, streamingContent, activeChatId
  ├── useModelsStore()  models (resolve modelSlug → name)
  ├── useAuthStore()    token
  ├── useFavorites()    toggle, isFavorite
  └── streamChat()      напрямую из @/lib/api

ImageGenerationPage
  ├── useTelegram()     webApp, haptic
  ├── useModels()       allModels (filter by 'image')
  ├── useModelUIConfig()  config, isLoading
  ├── usePriceCalculator()  price, isCalculating
  ├── useGeneration()   generate, generations (filter by 'image')
  └── uploadImage()     напрямую из @/lib/api

VideoGenerationPage
  ├── useTelegram()     webApp, haptic
  ├── useModels()       allModels (filter by 'video')
  ├── useModelUIConfig()
  ├── usePriceCalculator()
  └── useGeneration()   generate, generations

AudioGenerationPage
  ├── useTelegram()     webApp, haptic
  ├── useModels()       allModels (filter by 'audio')
  ├── useModelUIConfig()
  ├── usePriceCalculator()
  ├── useGeneration()   generate, generations
  └── POST /upload/audio напрямую через apiClient

AllModelsPage
  ├── useModels()       models, categories
  └── useFavorites()    toggle, isFavorite

ChatsHistoryPage
  ├── useChat()         chats, loadChats, deleteChat
  └── useFavorites()    toggle

FavoritesPage
  ├── useTelegram()     webApp (BackButton)
  └── apiClient         напрямую (GET /favorites + POST /favorites/toggle)

ProfilePage
  ├── useTelegram()     webApp, user, isTelegram
  └── useUser()         user, subscription, referralCode

TopUpPage
  ├── useTelegram()     webApp (openInvoice для stars)
  ├── useUser()         subscription.plan
  └── useBilling()      purchaseTokens, applyPromo

SubscriptionPage
  ├── useTelegram()     webApp (openLink)
  ├── useUser()         subscription
  └── useBilling()      subscribe, loadPlans

ReferralPage
  ├── useTelegram()     webApp (openTelegramLink для share)
  └── useBilling()      loadReferralInfo, referralInfo

TransactionsPage
  └── useBilling()      loadTransactions, transactions, transactionsTotal

SupportPage
  ├── useTelegram()     webApp (BackButton)
  └── apiClient         напрямую (GET/POST /support/tickets)

MediaResult
  ├── useTelegram()     webApp (downloadFile)
  └── useGeneration()   toggleFavorite

ui/ToastContainer
  └── useToastStore()   toasts, remove
📊 Endpoints полный реестр

Typescript

// AUTH
/auth/telegram                    POST  initData авторизация
/auth/telegram-widget             POST  widget авторизация

// USER
/users/me                         GET   профиль текущего юзера

// MODELS
/models                           GET   список моделей
/models/:slug                     GET   детали модели

// CHAT
/chats/conversations              GET   список чатов
/chats/conversations              POST  создать чат
/chats/conversations/:id          GET   детали чата
/chats/conversations/:id          DELETE удалить чат
/chats/conversations/:id/messages GET   сообщения чата
/chats/conversations/:id/pin      POST  закрепить чат
/chats/stream                     POST  SSE стриминг (fetch, не axios)

// GENERATION
/generation/image                 POST  запуск генерации изображения
/generation/video                 POST  запуск генерации видео
/generation/audio                 POST  запуск генерации аудио
/generation/history               GET   история генераций
/generation/:id/status            GET   статус генерации
/generation/:id/favorite          PUT   toggle избранное
/generation/calculate-price       POST  расчёт стоимости

// GENERATION UI CONFIG
/generation/ui-config/:slug       GET   UIParameter[], pricingMatrix[]

// BILLING
/billing/packages                 GET   пакеты токенов
/billing/plans                    GET   планы подписок
/billing/pay/tokens               POST  оплата пакета → paymentUrl
/billing/pay/subscription         POST  оплата подписки → paymentUrl
/billing/promo                    POST  применить промокод
/billing/transactions             GET   история транзакций
/billing/transactions/:id         GET   детали транзакции

// FAVORITES
/favorites                        GET   список избранного
/favorites/toggle                 POST  toggle избранное (чаты/модели)

// SUPPORT
/support/tickets                  GET   список тикетов
/support/tickets                  POST  создать тикет
/support/tickets/:id/message      POST  ответить в тикет

// REFERRAL
/referral/info                    GET   реферальная статистика
/referral/withdraw                POST  запрос вывода

// UPLOAD
/upload/image                     POST  загрузка изображения → { url, key }
/upload/audio                     POST  загрузка аудио → { url }
/upload/download                  GET   proxy download (?url=&filename=)

// ADMIN
/admin/check                      GET   проверка прав администратора
/admin/users                      GET   список юзеров
/admin/users/:id                  GET   детали юзера
/admin/users/:id/role             PUT   сменить роль
/admin/users/:id/ban              PUT   заблокировать
/admin/users/:id/balance          PUT   скорректировать баланс
/admin/users/:id                  DELETE удалить юзера
/admin/transactions               GET   список транзакций
/admin/transactions/:id           GET   детали транзакции
/admin/transactions/stats         GET   статистика (за N дней)
/admin/promo-codes                GET   список промокодов
/admin/promo-codes                POST  создать промокод
/admin/promo-codes/:id            GET   детали промокода
/admin/promo-codes/:id            PUT   обновить промокод
/admin/promo-codes/:id/toggle     POST  вкл/выкл промокод
/admin/promo-codes/:id            DELETE удалить промокод
/admin/promo-codes/:id/stats      GET   статистика промокода
/admin/models                     GET   список моделей
/admin/models                     POST  создать модель
/admin/models/:slug               GET   детали модели
/admin/models/:slug               PUT   обновить модель
/admin/models/:slug/toggle        POST  вкл/выкл модель
/admin/models/:slug               DELETE удалить модель
/admin/billing/plans              GET   список планов
/admin/billing/plans              POST  создать план
/admin/billing/plans/:id          GET   детали плана
/admin/billing/plans/:id          PUT   обновить план
/admin/billing/plans/:id/toggle   POST  вкл/выкл план
/admin/billing/plans/:id          DELETE удалить план
/admin/billing/packages           GET   список пакетов
/admin/billing/packages           POST  создать пакет
/admin/billing/packages/:id       GET   детали пакета
/admin/billing/packages/:id       PUT   обновить пакет
/admin/billing/packages/:id/toggle POST вкл/выкл пакет
/admin/billing/packages/:id       DELETE удалить пакет
🎯 Приоритеты рефакторинга

🔴 Срочно (влияет на безопасность/данные)


1. WS_URL из env (сейчас хардкод)
   → socket.ts: const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://spichki.tw1.ru'

2. disconnectSocket() при logout
   → useAuth.logout() должен вызывать disconnectSocket()

3. clearToken() → clear() userStore
   → auth.store: clearToken должен также вызывать useUserStore.getState().clear()

4. s.onAny(console.log) убрать из prod
   → socket.ts: if (process.env.NODE_ENV === 'development') { s.onAny(...) }

5. Унифицировать SubscriptionPlan тип
   → один источник: 'free' | 'basic' | 'pro' | 'unlimited'
   → обновить admin-user.ts
🟡 Важно (влияет на UX/качество кода)


6. uploadAudio() реализовать
   → по аналогии с uploadImage() в upload.ts

7. useFavoritesStore → src/stores/favorites.store.ts

8. useGenerationStore и useModelsStore добавить в barrel
   → stores/index.ts

9. streamingContent → useRef в ChatPage
   → убрать из Zustand, ре-рендер только при onDone

10. Курс USD единый
    → constants.ts: export const USD_RATE = 90
    → убрать RATE=75 из TopUpPage

11. chatFeedData проверить и удалить если мёртвый

12. body.tg-app найти где выставляется
    → скорее всего нужно добавить в TelegramProvider:
       if (isRealTelegram) document.body.classList.add('tg-app')
🟢 Желательно (техдолг)


13. Мёртвые компоненты удалить (5 файлов)
14. Бэкап CSS удалить (3 файла)
15. Старые CSS секции удалить (.referral-*, .subscription-card*, .gen-settings-modal)
16. ApiEnvelope<T> централизовать в src/types/api.ts
17. GenerationType | string убрать | string
18. useBilling.loadPackages/loadPlans подключить к компонентам
19. Двойные console.log убрать / добавить logger
20. maxFileSizeMB разделить по типам (image/video/audio)
📌 Ключевые числа для быстрой справки


Polling:
  интервал 1-6 попытки:  3 сек
  интервал 7+:           5 сек
  maxAttempts:           120  (≈ 9.8 мин)
  WS reconnect:          15 попыток × до 10 сек = до 2.5 мин

UI:
  header-height:         56px
  sidebar desktop:       240px
  sidebar tablet:        72px
  bottom-nav:            ~84px
  safe-area iOS min:     44px
  blur:                  20px (cards), 40px (header/modals)
  border-radius:         16px (cards), 12px (buttons), 8px (chips)

Лимиты:
  image attachments:     10
  image size:            10MB
  audio size:            10MB (нет валидации на фронте!)
  chat history:          50
  generation history:    50
  toast duration:        3000ms

Финансы:
  USD rate TopUp:        75 (⚠️ рассинхрон)
  USD rate Subscription: 90 (⚠️ рассинхрон)
  min withdrawal:        из /referral/info
  base price:            3 руб/спичка (TopUpPage)
  default model cost:    text=1, image=2, video=5, audio=1
🆘 Troubleshooting

Приложение застряло на loading screen


Проверить в порядке:
1. window.Telegram?.WebApp → есть ли SDK?
2. TelegramProvider setIsReady(true) вызван?
3. useAuthStore.persist.hasHydrated() = true?
4. useAuth attempted.current = true? (one-shot guard)
5. Нет ли ошибки в POST /auth/telegram?
6. В браузере без Telegram: setReady() вызван без токена?
Генерация запущена, но статус не обновляется


Проверить:
1. connectSocket(token) вызван в useGeneration?
2. WS подключён? (socket.connected)
3. subscribeToGeneration(id) вызван?
4. pendingSubscriptions.has(id)?
5. Polling запущен? (pollingTimers.has(id))
6. shownToasts.has(id)? (если toast не показан)
7. Консоль — WS events приходят? (s.onAny логирует всё)
Баланс не обновляется после генерации


Приоритет источников:
1. WS completed event → бэк должен возвращать новый баланс в данных
2. useUser.refetch() → принудительное обновление
3. useChat после стриминга → updateBalance() вручную

Если WS не возвращает баланс:
→ добавить refetch() в onDone callback генерации
Модели не загружаются


1. ModelsInitializer в layout.tsx? (рендерится?)
2. GET /models вернул ошибку? → fallbackModels из data.ts
3. useModels.isLoaded = false?
4. Проверить: useModelsStore.getState().isLoaded
5. Дублирующий вызов loadModels? (защита: if (isLoaded || isLoading) return)
Цена не считается


1. uiConfig загружен? useModelUIConfig.isLoading = false?
2. syncedSlug === slug? (если нет → enabled = false)
3. enabled = true в usePriceCalculator опциях?
4. POST /generation/calculate-price возвращает ошибку?
5. Debounce 300ms прошёл?
6. params ключи стабильны? (JSON.stringify одинаковый между рендерами?)
Telegram haptic не работает


1. isTelegram = true?
2. webApp.HapticFeedback существует?
3. Версия WebApp >= определённая для haptic?
4. haptic() из useTelegram() обёрнут в try/catch → ошибки молча игнорируются
5. В браузере haptic всегда no-op (это нормально)
Admin страница редиректит на /


1. token в localStorage? (useAuthStore.persist.hasHydrated())
2. GET /admin/check → ok: true?
3. role = 'admin' или 'super_admin'?
4. cancelled flag не срабатывает? (размонтирование до ответа)
5. Проверить console.log('[useAdminAuth] check ok:')
📝 Соглашения кодовой базы

Typescript

// Именование
PascalCase         → компоненты, типы, интерфейсы
camelCase          → хуки, функции, переменные
UPPER_SNAKE_CASE   → константы (ENDPOINTS, WS_EVENTS, FALLBACK_BY_TYPE)
kebab-case         → CSS классы BEM, URL пути

// Файлы
ComponentName.tsx  → компоненты
useCamelCase.ts    → хуки
camel.store.ts     → сторы
kebab-api.ts       → API модули
admin-domain.ts    → типы

// Импорты (через алиас @/)
@/components/...
@/hooks
@/stores
@/lib/api
@/lib/telegram
@/lib/data
@/context/TelegramContext
@/types/admin-*

// 'use client' — все компоненты и хуки
// нет 'use server' — SSR не используется (SPA паттерн)

// Стор вне React:
useXxxStore.getState().method()  // в lib/, callbacks

// Стор в React:
useXxxStore((s) => s.field)      // selector (ре-рендер только при изменении поля)
useXxxStore()                    // весь стор (ре-рендер при любом изменении)
🔄 Версионирование и деплой


Сборка:
  yarn build → .next/standalone + .next/static

Docker:
  Stage 1 (builder): node:20-alpine → yarn install --frozen-lockfile → yarn build
  Stage 2 (runner):  node:20-alpine → nextjs:nodejs (UID 1001) → node server.js

ENV при билде (ARG → ENV в Dockerfile):
  NEXT_PUBLIC_API_URL
  NEXT_PUBLIC_WS_URL           (⚠️ не используется в socket.ts!)
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

Порт: 3000
Hostname: 0.0.0.0

⚠️ NEXT_PUBLIC_* встраиваются в JS бандл при билде.
   Изменить без пересборки НЕЛЬЗЯ.

⚠️ typescript.ignoreBuildErrors: true
   eslint.ignoreDuringBuilds: true
   → ошибки TS/ESLint не блокируют деплой
   → нужен жёсткий контроль в PR review
Контекст актуален на момент создания. При получении новых файлов — обновлять соответствующие секции.