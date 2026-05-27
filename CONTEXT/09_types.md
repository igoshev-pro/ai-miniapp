📚 Контекст: Frontend — Блок 9: Types (Admin domain)

📋 Метаданные блока


src/types/
├── admin-billing.ts      💳 Планы подписок + токен-пакеты
├── admin-model.ts        🤖 Модели AI + UI параметры + ценообразование
├── admin-promo.ts        🎟️ Промокоды (enum-based)
├── admin-transaction.ts  💰 Транзакции + статистика
└── admin-user.ts         👤 Пользователи в админке
⚠️ Каждый файл продублирован дважды — артефакт копипасты. В проекте единственный экземпляр.

💳 admin-billing.ts

AdminSubscriptionPlan — полная структура

Ts

{
  _id: string
  planKey: string              // 'free' | 'basic' | 'pro' | 'unlimited' (бизнес-ключ)
  name: string                 // display name ("Базовый")
  description: string
  priceRub: number             // цена в рублях/месяц
  tokensPerMonth: number       // начисляется при оплате
  bonusTokens: number          // бонус сверху
  modelsAccess: 'limited' | 'full'
  freeModels: FreeModelAccess[]
  features: PlanFeatures
  capabilities: string[]       // ['priority_queue', 'no_watermark', ...]
  color: string                // hex для UI карточки
  icon: string                 // emoji или icon key
  isPopular: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
FreeModelAccess

Ts

{
  modelSlug: string
  displayName: string
  hourlyLimit: number | null    // null = безлимит по часам
  dailyLimit: number | null     // null = безлимит по дню
}
Список моделей к которым план даёт бесплатный доступ (с rate limits).

PlanFeatures

Ts

{
  maxDailyGenerations: number   // 0 = безлимит?
  priorityQueue: boolean
  exclusiveModels: boolean
  noWatermark: boolean
  maxContextMessages: number    // для LLM
}
⚠️ maxDailyGenerations: 0 семантика не задокументирована — неизвестно означает ли 0 безлимит или "запрещено". Нужно уточнять из бэка.

AdminTokenPackage — пакет токенов

Ts

{
  _id: string
  packageId: string             // бизнес-ID пакета ('starter', 'basic', ...)
  label: string                 // "100 000 спичек"
  tokens: number                // количество токенов
  priceRub: number              // цена в рублях
  bonusPercent: number          // % бонусных токенов сверху
  popular: boolean              // бейдж "Популярный"
  best: boolean                 // бейдж "Лучший выбор"
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
⚠️ popular и best — два разных бейджа. Технически оба могут быть true на одном пакете. Нет validation rule что только один пакет может быть best.

🤖 admin-model.ts

GenerationType

Ts

type GenerationType = 'chat' | 'image' | 'video' | 'audio' | 'embedding' | string
⚠️ | string делает тип бесполезным для type narrowing — любая строка подходит. TypeScript не предупредит при опечатке 'imge'. Нужно убрать | string и добавлять новые типы явно.

'embedding' — тип для embedding моделей (не показывается пользователям, только для внутреннего использования API).

'chat' — синоним для text в контексте AdminModel (в lib/data.ts тип называется 'text').

AdminModel — полная структура

Ts

{
  _id: string
  slug: string                  // уникальный ключ ('gpt-5.4', 'midjourney')
  name: string                  // внутреннее имя
  displayName: string           // показывается пользователям
  description?: string
  icon?: string
  type: GenerationType

  isActive: boolean
  isPremium: boolean            // только для платных планов
  supportsVision: boolean       // принимает изображения на вход

  sortOrder: number

  // ─── Ценообразование ───────────────────────────
  costPerMillionInputTokens: number
  costPerMillionOutputTokens: number
  fixedCostPerGeneration: number    // для image/video/audio — фиксированная стоимость
  tokensPerDollar: number           // курс конвертации
  minTokenCost: number              // минимальный спишем токенов
  tokenCost?: number                // override (если задан — игнорируется matrix)

  // ─── Провайдеры ────────────────────────────────
  providerMappings: ProviderMapping[]

  // ─── Метаданные ────────────────────────────────
  capabilities: string[]
  limits?: Record<string, any>
  uiParameters?: UIParameter[]      // динамические параметры для UI
  pricingMatrix?: PricingRule[]     // матрица цен по параметрам
  inputCapabilities?: InputCapabilities
  defaultParams?: Record<string, any>

  stats?: {
    totalRequests?: number
    avgResponseTime?: number
    successRate?: number            // 0.0 - 1.0
  }

  createdAt: string
  updatedAt: string
}
ProviderMapping — маппинг на провайдера

Ts

{
  providerId: string        // MongoDB _id провайдера
  providerSlug: string      // 'openai', 'anthropic', 'openrouter'
  modelId: string           // ID модели у провайдера ('gpt-4o', 'claude-3-5-sonnet')
  priority: number          // чем меньше — тем приоритетнее при failover
  isActive: boolean
  metadata?: Record<string, any>
}
Несколько маппингов = failover между провайдерами. Бэкенд пробует по приоритету.

Система ценообразования — 3 уровня


1. fixedCostPerGeneration          ← для image/video/audio
       ↓ если 0
2. pricingMatrix (условия)         ← матрица по параметрам
       ↓ если нет matrix или условие не совпало
3. costPerMillionInputTokens       ← токенная модель (для LLM)
       ↓ применяется minTokenCost  ← минимальный порог

Override: tokenCost → игнорирует всё выше
PricingRule

Ts

{
  conditions?: Record<string, any>  // { duration: 8, quality: 'hd' }
  costInTokens: number
  label?: string                    // 'HD 8 сек — 50 спичек'
}
conditions пустой или не задан = catch-all (базовая цена).

Пример матрицы для video:

Ts

pricingMatrix: [
  { conditions: { duration: 5, quality: 'sd' },  costInTokens: 300,  label: 'SD 5с' },
  { conditions: { duration: 5, quality: 'hd' },  costInTokens: 600,  label: 'HD 5с' },
  { conditions: { duration: 10, quality: 'sd' }, costInTokens: 500,  label: 'SD 10с' },
  { conditions: { duration: 10, quality: 'hd' }, costInTokens: 1000, label: 'HD 10с' },
  { costInTokens: 400 }  // catch-all
]
UIParameter — динамические параметры генерации

Ts

{
  key: string                   // 'quality', 'duration', 'style'
  label: string                 // 'Качество'
  type: UIParamType             // 'select' | 'number' | 'boolean' | 'text' | 'slider'
  affectsPrice: boolean         // если true — при изменении пересчитывается цена
  defaultValue?: any
  options?: UIParamOption[]     // для type='select': [{ value: 'hd', label: 'HD' }]
  min?: number                  // для type='number'|'slider'
  max?: number
  step?: number
  description?: string          // подсказка в UI
}
Пример для Midjourney:

Ts

uiParameters: [
  { key: 'quality', label: 'Качество', type: 'select', affectsPrice: true,
    options: [{ value: 'standard', label: 'Стандарт' }, { value: 'hd', label: 'HD' }] },
  { key: 'style', label: 'Стиль', type: 'select', affectsPrice: false,
    options: [{ value: 'raw', label: 'Raw' }, { value: 'cute', label: 'Cute' }] },
  { key: 'ar', label: 'Соотношение сторон', type: 'select', affectsPrice: false,
    options: [{ value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }] }
]
affectsPrice: true → при изменении параметра UI запрашивает /generation/calculate-price.

InputCapabilities

Ts

{
  acceptsImage?: boolean
  maxImages?: number
  acceptsVideo?: boolean
  acceptsAudio?: boolean
  maxFileSizeMB?: number        // единый лимит для всех типов файлов
}
⚠️ maxFileSizeMB единый — нет разделения лимита для image vs video vs audio. Видео может быть сотни MB, изображение 10 MB — разные лимиты нужны.

ModelsFilters — фильтры для списка

Ts

{
  search?: string
  type?: GenerationType
  isActive?: 'true' | 'false'   // строки, не boolean!
  isPremium?: 'true' | 'false'  // строки для query params
}
⚠️ Строки 'true'/'false' вместо boolean — потому что передаётся как URL query param. Неочевидно при использовании в коде.

UpdateModelPayload — частичное обновление

Все поля из AdminModel опциональные. Плюс:

Ts

uiParameters?: UIParameter[]
pricingMatrix?: PricingRule[]
inputCapabilities?: InputCapabilities
defaultParams?: Record<string, any>
Комментарий // 🆕 ДОБАВЬ ЭТО: — признак что эти поля добавлены позже основной реализации.

CreateModelPayload extends UpdateModelPayload

Обязательные поля при создании:

Ts

{
  slug: string          // required!
  name: string          // required!
  displayName: string   // required!
  type: GenerationType  // required!
}
🎟️ admin-promo.ts

Enums (единственный файл с enum во всём проекте)

PromoCodeType

Ts

enum PromoCodeType {
  BONUS_TOKENS = 'bonus_tokens',           // начисляет токены
  DISCOUNT_PERCENT = 'discount_percent',   // скидка % на покупку
  DISCOUNT_RUB = 'discount_rub',           // скидка в рублях
  SUBSCRIPTION_DAYS = 'subscription_days', // даёт дни подписки
}
PromoApplyTo

Ts

enum PromoApplyTo {
  ANY = 'any',                      // к любой покупке
  SUBSCRIPTION = 'subscription',    // только к подписке
  TOKEN_PACKAGE = 'token_package',  // только к пакетам токенов
  STANDALONE = 'standalone',        // без покупки (просто активируй)
}
STANDALONE + BONUS_TOKENS = промокод который просто даёт токены без покупки.

AdminPromoCode — полная структура

Ts

{
  _id: string
  code: string                        // 'SUMMER2025', 'WELCOME10'
  description: string
  type: PromoCodeType
  applyTo: PromoApplyTo

  // ─── Значения (заполнено только релевантное поле) ───
  bonusTokens: number                 // для BONUS_TOKENS
  discountPercent: number             // для DISCOUNT_PERCENT
  discountRub: number                 // для DISCOUNT_RUB
  subscriptionDays: number            // для SUBSCRIPTION_DAYS
  subscriptionPlan: string | null     // план для SUBSCRIPTION_DAYS

  // ─── Ограничения применения ─────────────────────────
  applicablePlans: string[]           // [] = все планы
  applicablePackages: string[]        // [] = все пакеты
  minPurchaseRub: number              // минимальная сумма покупки

  // ─── Лимиты использования ───────────────────────────
  maxUses: number | null              // null = безлимит
  currentUses: number
  maxUsesPerUser: number              // обычно 1

  // ─── Временные рамки ────────────────────────────────
  startsAt: string | null
  expiresAt: string | null

  isActive: boolean

  // ─── История использования ──────────────────────────
  usages: PromoUsage[]                // массив {userId, usesCount, lastUsedAt}

  // ─── Аналитика ──────────────────────────────────────
  totalDiscountGivenRub: number
  totalBonusTokensGiven: number
  totalSubscriptionDaysGiven: number

  createdBy: string | null            // userId администратора
  internalNote: string | null

  createdAt: string
  updatedAt: string
}
⚠️ usages: PromoUsage[] в теле ответа — при большом числе использований (currentUses = 10000) это массив из 10000 объектов в каждом API ответе. Должна быть пагинация или lazy load.

⚠️ Все числовые поля bonusTokens, discountPercent, discountRub, subscriptionDays всегда в ответе — независимо от type. Если type = 'bonus_tokens', discountPercent = 0, discountRub = 0, etc. Нет discriminated union — UI должен сам знать какие поля смотреть по типу.

AdminPromoListQuery

Ts

{
  page?, limit?, search?,
  type?: PromoCodeType | 'all'
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'exhausted'
  sortBy?: 'createdAt' | 'currentUses' | 'expiresAt' | 'code'
  order?: 'asc' | 'desc'
}
'exhausted' — промокод исчерпан (currentUses >= maxUses). Это вычисляемый статус.

AdminPromoStats — агрегированная статистика одного промокода

Ts

{
  code: string
  type: PromoCodeType
  isActive: boolean
  currentUses: number
  maxUses: number | null
  remainingUses: number | null    // null если maxUses=null
  totalDiscountGivenRub: number
  totalBonusTokensGiven: number
  totalSubscriptionDaysGiven: number
  uniqueUsers: number             // уникальных пользователей
  lastUsedAt: string | null
  startsAt: string | null
  expiresAt: string | null
}
Отдельный endpoint /admin/promo-codes/{id}/stats — не дублирует поля AdminPromoCode.

AdminPromoUpsert — payload create/update

Все поля опциональные кроме description, type, applyTo:

Ts

{
  code?: string                   // если не задан — бэк генерирует?
  description: string             // required
  type: PromoCodeType             // required
  applyTo: PromoApplyTo           // required
  // ...остальные optional
}
⚠️ code опциональный при создании — неясно генерирует ли бэк случайный код или это ошибка типизации.

💰 admin-transaction.ts

TransactionType — все типы транзакций

Ts

| 'deposit'            // пополнение баланса
| 'withdrawal'         // вывод (не реализован в UI)
| 'generation'         // списание за генерацию
| 'refund'             // возврат за неудачную генерацию
| 'referral_bonus'     // бонус за приглашённого
| 'promo_code'         // применение промокода
| 'subscription'       // покупка подписки
| 'admin_adjustment'   // ручная корректировка администратором
PaymentStatus

Ts

| 'pending'    // создана, ожидает оплаты
| 'completed'  // успешно завершена
| 'failed'     // ошибка
| 'refunded'   // возвращена
AdminTransaction — полная структура

Ts

{
  _id: string
  userId: string
  type: TransactionType
  amount: number                  // в токенах (положительное или отрицательное)
  description?: string

  // ─── Платёжные данные ───────────────────────────────
  paymentStatus?: PaymentStatus
  paymentProvider?: string        // 'yookassa', 'telegram_stars'
  paymentAmountRub?: number       // только для deposit/subscription
  externalPaymentId?: string      // ID платежа у провайдера

  // ─── Связанные сущности ─────────────────────────────
  generationId?: string           // для type='generation'|'refund'
  modelSlug?: string              // какая модель
  promoCode?: string              // для type='promo_code'
  referralUserId?: string         // для type='referral_bonus'

  metadata?: Record<string, any>  // доп. данные
  createdAt: string
  updatedAt: string

  user?: AdminTxUserLite | null   // populate при запросе
}
⚠️ amount может быть отрицательным? — нет явного указания в типе. Для generation это списание (отрицательное), для deposit — пополнение (положительное). Без знака неясно как интерпретировать.

AdminTxUserLite — облегчённый юзер в транзакции

Ts

{
  _id: string
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  telegramId?: number | null
  email?: string | null
  tokenBalance?: number
  bonusTokens?: number
  cashbackBalance?: number        // ← третий баланс (есть здесь и в AdminUser)
}
Все поля кроме _id — опциональны. Это результат MongoDB populate/aggregate — не всегда полный.

AdminTransactionsListResponse

Ts

{
  items: AdminTransaction[]
  total: number
  page: number
  pages: number                   // нет limit! (в отличие от AdminPromoListResponse)
  totals: {
    count: number
    tokens: number                // суммарный объём токенов
    rub: number                   // суммарный объём рублей
  }
}
⚠️ Нет limit в ответе — в AdminPromoListResponse есть, здесь нет. Inconsistency.

AdminTransactionsStats — самая сложная структура

Ts

{
  period: { days: number; since: string }

  summary: {
    totalCount: number
    depositsRub: number
    subscriptionsRub: number
    totalRevenueRub: number       // depositsRub + subscriptionsRub
    tokensDeposited: number
    tokensSpent: number
    pendingCount: number
    failedCount: number
  }

  // ─── Агрегации по осям ─────────────────────────────
  byType: Array<{ _id: TransactionType; count: number; tokens: number; rub: number }>
  byStatus: Array<{ _id: PaymentStatus; count: number; rub: number }>
  byProvider: Array<{ _id: string; count: number; rub: number; tokens: number }>

  // ─── Временные ряды ────────────────────────────────
  revenueByDay: Array<{
    _id: { date: string; type: TransactionType }   // группировка по дате+типу
    rub: number
    tokens: number
    count: number
  }>

  generationsByDay: Array<{
    _id: string                   // дата '2025-01-15'
    tokens: number
    count: number
    costDollars: number           // реальная стоимость для нас
  }>

  // ─── Топ-листы ─────────────────────────────────────
  topModels: Array<{
    _id: string                   // modelSlug
    count: number
    tokens: number
    costDollars: number
  }>

  topSpenders: Array<{
    userId: string
    totalRub: number
    totalTokens: number
    paymentsCount: number
    user: AdminTxUserLite         // не nullable! обязательно
  }>

  promoStats: Array<{ _id: string; usageCount: number; bonusTokens: number }>

  refunds: { count: number; tokens: number }
}
Используется для дашборда аналитики в AdminTransactionsPage.

👤 admin-user.ts

Базовые типы

Ts

type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin'
type AuthProvider = 'telegram' | 'email' | 'google'
type SubscriptionPlan = 'free' | 'pro' | 'premium'
⚠️ Комментарии // подгони под свой enum — код не финальный. SubscriptionPlan здесь 'free' | 'pro' | 'premium', но в UserProfile (user.store.ts) — 'free' | 'basic' | 'pro' | 'unlimited'. Рассинхронизация типов.

⚠️ UserRole имеет 'moderator' — роль которой нет в UserProfile.role ('user' | 'premium' | 'admin' | 'super_admin'). 'moderator' в AdminUser, 'premium' в UserProfile — разные наборы ролей для одной сущности.

AdminUser — полная структура (самая богатая)

Ts

{
  _id: string
  authProvider: AuthProvider
  telegramId: number | null
  email: string | null
  googleId: string | null         // ← есть только в AdminUser, нет в UserProfile
  isEmailVerified: boolean        // ← только здесь
  isPremiumTelegram: boolean      // Telegram Premium подписка

  // ─── Профиль ────────────────────────────────────────
  firstName: string               // не optional! (в UserProfile — optional lastName)
  lastName: string                // не optional!
  username: string                // не optional!
  photoUrl: string                // не optional!
  languageCode: string

  // ─── Балансы (3 вида!) ──────────────────────────────
  tokenBalance: number
  bonusTokens: number
  cashbackBalance: number         // третий баланс — нет в UserProfile
  cashbackEarnedTotal: number     // всего заработан кэшбэк за всё время
  totalTokensSpent: number        // всего потрачено токенов
  totalDeposited: number          // всего пополнено рублей

  // ─── Подписка ───────────────────────────────────────
  role: UserRole
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiresAt: string | null

  // ─── Реферальная программа ──────────────────────────
  referralCode: string
  referredBy: string | null       // userId кто пригласил
  referralCount: number           // сколько пригласил
  referralEarnings: number        // заработал на реферралах (в токенах?)

  // ─── Лимиты ─────────────────────────────────────────
  dailyGenerations: number        // использовано сегодня
  dailyGenerationsResetAt: string | null

  // ─── Статус ─────────────────────────────────────────
  isActive: boolean
  isBanned: boolean
  banReason: string               // не optional — пустая строка если не заблокирован
  lastActiveAt: string | null

  createdAt: string
  updatedAt: string
}
AdminUsersResponse

Ts

{
  items: AdminUser[]
  total: number
  page: number
  pages: number                   // нет limit (как у транзакций)
}
AdminUsersQuery

Ts

{
  page?, limit?, search?,
  role?: UserRole | 'all'
  banned?: 'all' | 'banned' | 'active'
  hasBalance?: boolean             // фильтр: только у кого есть баланс
  sortBy?: 'createdAt' | 'lastActiveAt' | 'totalDeposited' | 'totalTokensSpent'
  order?: 'asc' | 'desc'
}
🗺️ Карта зависимостей types


admin-billing.ts
  └── (нет зависимостей от других types)
  ← используется: adminBillingApi, AdminBillingPage

admin-model.ts
  └── (нет зависимостей от других types)
  ← используется: adminModelsApi, useAdminModels, AdminModelsPage, GenerationPage

admin-promo.ts
  └── (нет зависимостей от других types)
  ← используется: adminPromoCodesApi, AdminPromoPage

admin-transaction.ts
  └── (нет зависимостей от других types)
  ← используется: adminTransactionsApi, AdminTransactionsPage

admin-user.ts
  └── (нет зависимостей от других types)
  ← используется: adminUsersApi, AdminUsersPage, AdminUserDetailPage
Все types-файлы полностью независимы друг от друга. Нет cross-imports.

⚠️ Замеченные проблемы

🔴 Критичные

Рассинхронизация SubscriptionPlan между файлами:

Ts

// admin-user.ts
type SubscriptionPlan = 'free' | 'pro' | 'premium'

// user.store.ts → UserProfile.subscription.plan
plan: 'free' | 'basic' | 'pro' | 'unlimited'
Два разных набора планов для одного домена. При сравнении планов — баг.

Рассинхронизация UserRole между файлами:

Ts

// admin-user.ts
type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin'

// user.store.ts → UserProfile.role
role: 'user' | 'premium' | 'admin' | 'super_admin'
'moderator' vs 'premium' — разные роли в разных типах одной сущности.

GenerationType = ... | string делает тип бесполезным для exhaustive checks:

Ts

// TypeScript не покажет ошибку:
const type: GenerationType = 'imge'  // опечатка — но валидно!
usages: PromoUsage[] в AdminPromoCode — N+1 проблема. При currentUses = 50000 — массив из 50000 объектов в каждом API ответе. Для списка промокодов это катастрофично.

cashbackBalance существует в трёх местах но не в основном UserProfile:

AdminUser.cashbackBalance ✅
AdminTxUserLite.cashbackBalance ✅
admin-users.ts → BalanceType = 'cashbackBalance' ✅
UserProfile (user.store.ts) ❌ — нет поля
Пользователь имеет три типа баланса, но видит только два.

🟡 Средние

AdminModel имеет два способа хранить стоимость:

tokenCost?: number — прямое значение
pricingMatrix?: PricingRule[] — матрица условий
Нет документации о приоритете. Код в хуках должен знать что tokenCost override всё.

ModelsFilters.isActive: 'true' | 'false' (строки) — антипаттерн. Всё приложение использует boolean, но здесь строки для URL query params. При использовании:

Ts

// Вместо очевидного:
filters.isActive = true

// Надо писать:
filters.isActive = 'true'   // строка!
Лучше хранить как boolean в типе фильтров и конвертировать в строку только при формировании URL:

Ts

interface ModelsFilters {
  isActive?: boolean   // в коде — boolean
}
// При отправке:
params.isActive = filters.isActive?.toString()
AdminPromoUpsert.code опциональный при создании — неясна семантика. Если бэк генерирует код автоматически, это должно быть задокументировано. Если code обязателен при create — нужен отдельный CreatePromoPayload с code: string.

PricingRule.conditions: Record<string, any> — слабая типизация. Ключи conditions должны соответствовать UIParameter.key той же модели. Нет TypeScript связи между ними — можно написать conditions с ключами которых нет в uiParameters.

AdminModel.limits?: Record<string, any> и defaultParams?: Record<string, any> — два разных Record<string, any> без документации в чём разница. limits — ограничения (max resolution?), defaultParams — значения по умолчанию для uiParameters? Должны быть типизированы.

AdminTransaction.amount: number без знака — нет документации положительное или отрицательное для каждого типа. generation = списание (отрицательное?), deposit = пополнение (положительное?). Нет типа { amount: number; direction: 'credit' | 'debit' }.

revenueByDay._id: { date: string; type: TransactionType } — составной ключ. При построении графика нужно группировать по _id.date, потом по _id.type. Нестандартный MongoDB aggregate формат — легко перепутать при обходе массива.

AdminUser.banReason: string (не optional) — пустая строка '' если не заблокирован. Лучше banReason?: string — тогда наличие поля само по себе семантически значимо.

FreeModelAccess.hourlyLimit: number | null и dailyLimit: number | null — null означает безлимит? Или null означает "не задан" (и тогда применяется другой лимит)? Семантика null не задокументирована. Можно ошибочно интерпретировать null как 0.

AdminTokenPackage.bonusPercent — нет поля bonusTokens: number. UI должен вычислять Math.floor(tokens * bonusPercent / 100) на лету. Нет гарантии что бэк и фронт одинаково округляют.

ProviderMapping.metadata?: Record<string, any> — неизвестная структура. Содержит provider-специфичные данные (API endpoints, rate limits, etc). Без типизации любые изменения в метаданных провайдера невидимы TypeScript.

🟢 Минорные

Все 5 файлов используют _id: string (MongoDB ObjectId) вместо id: string. В UserProfile (user.store.ts) — id: string. При передаче AdminUser в компонент который ожидает UserProfile — TypeScript не поймает что _id ≠ id.

PromoCodeType и PromoApplyTo — единственные enum во всём проекте. Остальные типы — type unions. Enum имеет runtime представление (объект в JS), union — только compile-time. При JSON.stringify(PromoCodeType.BONUS_TOKENS) получится "bonus_tokens" — корректно. Но инконсистентность стиля.

AdminPromoCode.createdBy: string | null — userId или username? По контексту — userId (_id администратора), но строка не самодокументирована.

AdminTransactionsStats.topSpenders[].user: AdminTxUserLite — не nullable, но все поля AdminTxUserLite кроме _id опциональны. Типизация говорит "user всегда есть", но его поля могут все быть undefined. Реальная nullable через опциональность полей.

PlanFeatures.maxContextMessages: number — лимит контекста для LLM. При maxContextMessages = 0 — это безлимит или запрет? Та же проблема что с maxDailyGenerations.

AdminModel.stats?.successRate — number без уточнения диапазона. 0.0 - 1.0 или 0 - 100? Нет JSDoc комментария // 0.0 - 1.0.

🗺️ Полная карта расхождений между domain types

UserProfile vs AdminUser — одна сущность, два типа

Поле	UserProfile (user.store)	AdminUser (admin-user.ts)
ID	id: string	_id: string
Роли	'user'|'premium'|'admin'|'super_admin'	'user'|'admin'|'moderator'|'super_admin'
План	'free'|'basic'|'pro'|'unlimited'	'free'|'pro'|'premium'
Баланс	tokenBalance + bonusTokens + totalBalance	tokenBalance + bonusTokens + cashbackBalance + cashbackEarnedTotal
Подписка	subscription: { plan, expiresAt, isActive }	subscriptionPlan + subscriptionExpiresAt (плоско)
lastName	lastName?: string (optional)	lastName: string (required)
username	username?: string (optional)	username: string (required)
photoUrl	photoUrl?: string (optional)	photoUrl: string (required)
googleId	❌	googleId: string | null
languageCode	❌	languageCode: string
cashbackBalance	❌	✅
dailyGenerations	❌	✅
isBanned	❌	✅
referralEarnings	❌	✅
Вывод: AdminUser — полная БД-модель. UserProfile — проекция для клиентского приложения. Они никогда не взаимозаменяемы, но нет shared базового типа.

GenerationType — три места, разные значения

Ts

// lib/data.ts → ModelItem.category
'text' | 'image' | 'video' | 'audio'

// generation.store.ts → GenerationType
'image' | 'video' | 'audio'   // нет 'text'!

// admin-model.ts → GenerationType
'chat' | 'image' | 'video' | 'audio' | 'embedding' | string
// 'chat' вместо 'text', плюс 'embedding'
Три разных enum для одного концепта:

data.ts: 'text' (пользовательский термин)
generation.store: нет 'text' (текст = chat, не генерация)
admin-model.ts: 'chat' (технический термин бэка)
Маппинг: 'text' (UI) ↔ 'chat' (backend AdminModel.type)

🔥 Ключевые инсайты

1. Pricing flow для генераций


Пользователь выбирает модель
  ↓
UI строит форму из AdminModel.uiParameters
  ↓
Пользователь меняет параметр с affectsPrice=true
  ↓
POST /generation/calculate-price { modelSlug, params }
  ↓
Бэк находит matching PricingRule по conditions
  ↓
Возвращает costInTokens
  ↓
UI показывает цену
  ↓
Пользователь нажимает "Сгенерировать"
  ↓
POST /generation/image|video|audio { modelSlug, params, ... }
  ↓
Бэк снова вычисляет цену и списывает токены
affectsPrice: true на UIParameter → триггер для пересчёта цены в реальном времени.

2. Промокод flow


User вводит код → POST /billing/promo/apply { code }
  ↓
Бэк проверяет: isActive, expiresAt, maxUses, maxUsesPerUser, applyTo, applicablePlans
  ↓
Если type=BONUS_TOKENS && applyTo=STANDALONE → сразу начисляет bonusTokens
Если type=DISCOUNT_* → возвращает скидку для применения к следующей покупке
Если type=SUBSCRIPTION_DAYS → добавляет дни к подписке
3. pricingMatrix catch-all порядок

Бэк должен проверять правила в порядке от специфичных к общим:


[ { conditions: { duration: 10, quality: 'hd' }, cost: 1000 },
  { conditions: { quality: 'hd' }, cost: 600 },
  { cost: 300 }  // catch-all — последним!
]
Нет гарантии порядка в TypeScript типе — PricingRule[] без priority поля. Порядок определяется массивом.
