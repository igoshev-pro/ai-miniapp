📘 ADMIN_CONTEXT.md

Паспорт админ-панели Spichki AI
Расположение: ai-miniapp/src/app/admin/
Назначение: контекстный документ для AI-сессий. Подгружается первым — после него я знаю, где что лежит, как это работает и по каким правилам менять.
🎯 Как со мной работать

Формат задачи:

Ты пишешь, что нужно сделать (фича / фикс / рефакторинг).
Я смотрю в этот документ → определяю, какие файлы затронуты.
Если нужно — прошу прислать конкретные файлы (точечно, не всё подряд).
Возвращаю готовый код + список того, что изменилось.
Когда я прошу файлы:

Страницы: admin/<раздел>/page.tsx
Компоненты: admin/_components/<...>
Типы: @/types/admin-*.ts
API: @/lib/api/admin-*.ts
Хуки: @/hooks/useAdmin*.ts
1. 🧱 Стек

Слой	Технология
Framework	Next.js 14 (app router)
Стиль страниц	'use client' (всё клиентское)
Язык	TypeScript
UI	Tailwind (zinc + акценты по доменам, dark-only)
Иконки	lucide-react
API	Кастомный apiClient (axios-like) + ENDPOINTS
State	Локальный useState + домашние хуки
Dropdowns	createPortal в document.body
Графики	Инлайн SVG (без recharts/chart.js)
2. 📁 Полная структура


src/app/admin/
├── layout.tsx                    🛡️ Auth-гейт (useAdminAuth) + Sidebar + Header
├── page.tsx                      🏠 Dashboard (QUICK_LINKS карточки)
│
├── _components/                  📦 Приватные компоненты админки
│   │
│   ├── Layout
│   │   ├── AdminSidebar.tsx              {role}
│   │   └── AdminHeader.tsx               {username, telegramId, role}
│   │
│   ├── User Modals (4)
│   │   ├── BanUserModal.tsx              {user, onConfirm(reason)}
│   │   ├── ChangeRoleModal.tsx           {user, onConfirm(role)}
│   │   ├── AdjustBalanceModal.tsx        {user, onConfirm({type, amount, reason})}
│   │   └── DeleteUserModal.tsx           {user, onConfirm()}
│   │
│   ├── Promo Modals (2)
│   │   ├── PromoCodeModal.tsx            {promo?, onConfirm(body)} — create/edit
│   │   └── DeletePromoModal.tsx          {promo, onConfirm()}
│   │
│   ├── Models (4 + 1 ❓)
│   │   ├── ModelsFiltersBar.tsx          {filters, onChange}
│   │   ├── ModelsTable.tsx               {items, busy, onEdit, onToggle, ...}
│   │   ├── EditModelModal.tsx        ⭐  {model, onSave}  → ЭКСПОРТИРУЕТ Modal/Field/Input/Toggle
│   │   ├── CreateModelModal.tsx          {onCreate}        → ИМПОРТИРУЕТ из EditModelModal
│   │   ├── PricingSimulator.tsx      ❓  (файл не передан)
│   │   └── UIParametersEditor.tsx    ⚠️  legacy? (slider/boolean)
│   │
│   ├── Models Editor (4)
│   │   └── editor/
│   │       ├── UiParamsEditor.tsx        {value, onChange}  ← локальный UiParam
│   │       ├── PricingMatrixEditor.tsx   {value, onChange, uiParameters}
│   │       ├── CapabilitiesEditor.tsx    {value, onChange}  ← локальный Caps
│   │       └── RawJsonEditor.tsx         {value, onChange}
│   │
│   └── Misc
│       └── TxBadges.tsx                  TxTypeBadge, TxStatusBadge
│
├── users/
│   ├── page.tsx                  📋 Список (фильтры + таблица + 4 модалки)
│   └── [id]/page.tsx             👤 Карточка (Hero + 8 stats + tx + gen + рефералы)
│
├── transactions/
│   ├── page.tsx                  📋 Список (фильтры + showAdvanced + summary)
│   ├── [id]/page.tsx             🧾 Детали (InfoRow, CopyValue, related)
│   └── stats/page.tsx            📊 Графики (Revenue stacked bars + Generations dual-axis)
│
├── models/
│   ├── page.tsx                  📋 Список (useAdminModels + useModelActions)
│   └── [slug]/page.tsx           ✏️ Редактор (4 таба: ui | pricing | caps | json)
│
├── billing/
│   ├── packages/page.tsx         💎 Пакеты спичек (таблица + PackageModal)
│   └── plans/page.tsx            👑 Тарифы (карточки + PlanModal × 4 таба)
│
├── promo-codes/page.tsx          🎟️ Промокоды (таблица + create/edit/delete)
│
└── settings/
    ├── page.tsx                  ⚙️ Хаб (SETTINGS[] карточки)
    └── tokenomics/page.tsx       🔥 Курс/пачки/бонусы
3. 🛡️ Auth & доступ

layout.tsx — единственная точка проверки доступа:

Ts

const { loading, isAdmin, role, user } = useAdminAuth()

if (loading)                        → <Spinner/>
if (!isAdmin || !role || !user)     → <Нет доступа>
else                                → <Sidebar/> + <Header/> + <main/>
Роли: 'user' | 'moderator' | 'admin' | 'super_admin'

Действие	Кто может
Войти в /admin	admin, super_admin
Видеть /admin/settings	только super_admin
Бан/удаление	защита от admin/super_admin через isProtected
4. 🎨 Дизайн-система

4.1 Цветовые акценты по разделам

Раздел	Палитра
Users	blue/cyan
Transactions	emerald/cyan
Models	orange/red (indigo кнопки)
Plans	amber/orange
Packages	orange/red
Promo-codes	pink/rose
Settings/Tokenomics	orange/red / amber
4.2 Цвета по типам действий (модалки)

Действие	Border / Icon	Кнопка
Ban / Delete	red-500/30	red gradient
Unban	emerald-500/30	emerald gradient
Balance	blue-500/30	blue→cyan gradient
Role change	orange-500/30	orange→amber
Promo	pink-500/30	pink→rose
4.3 Базовые классы (запомнить)

Tsx

// Hero card
"rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6"

// Stat card
"rounded-2xl border bg-gradient-to-br p-4 ${color}"

// Table row
"bg-zinc-900/30 hover:bg-zinc-900/60"

// Status badge
"text-[10px] uppercase font-bold px-2 py-1 rounded bg-X/15 text-X-400 border border-X/30"

// Primary button
"bg-gradient-to-r from-X-600 to-Y-500 hover:from-X-500 hover:to-Y-400"

// Input
"bg-zinc-950 border border-zinc-800 rounded-xl focus:border-X-500/50"

// Modal backdrop
"fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
4.4 Форматирование

Числа: .toLocaleString('ru-RU')
Даты: .toLocaleString('ru-RU') / toLocaleDateString('ru-RU')
Токены: всегда с эмодзи 🔥 (внутренний бренд — «спички»)
₽ — для рублей, $ — для долларовой себестоимости
5. 🔄 Типовые паттерны

5.1 Страница-список (users / transactions / promo-codes)


1. State: items[], total, pages, loading
2. Filters: search (debounced 400ms), type, status, sort
3. fetchList = useCallback(...) → useEffect([filters, page])
4. patchItem(id, partial) — оптимистичный апдейт
5. JSX: <Header/> → <Filters/> → <Table/> → <Pagination/> → <Modals/>
5.2 Debounced search

Ts

useEffect(() => {
  const t = setTimeout(() => {
    setSearch(searchInput.trim())
    setPage(1)
  }, 400)
  return () => clearTimeout(t)
}, [searchInput])
5.3 Структура модалки


Header  ← иконка домена (в круге border-X/30) + заголовок + подзаголовок + X close
Body    ← поля формы + ErrorBox в конце
Footer  ← Отмена (secondary) + Подтвердить (primary gradient)
Backdrop click → close, e.stopPropagation() на контенте, ESC handling.
5.4 Async-обработчик в модалках

Ts

const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handle = async () => {
  setLoading(true); setError(null)
  try {
    await onConfirm(payload)
    onClose()
  } catch (e: any) {
    setError(e?.response?.data?.message || e?.message || 'Не удалось…')
  } finally { setLoading(false) }
}
5.5 Portal-меню (3 точки в таблицах)

Ts

createPortal(<menu/>, document.body)
// + позиционирование через buttonRef.getBoundingClientRect()
// + backdrop для close-on-click-outside
6. 📦 Подробно по разделам

6.1 Dashboard (admin/page.tsx)

Статика: QUICK_LINKS: QuickLink[] → карточки с градиентами → <Link> на разделы.

6.2 Users

Файл	API	Содержание
users/page.tsx	adminUsersApi.{list,remove,toggleBan,changeRole,adjustBalance}	Фильтры (search/role/banned/sort), таблица UserRow, 4 модалки
users/[id]/page.tsx	adminUsersApi.getById → AdminUserDetails	Hero + 8×StatCard + Subscription + 2 колонки tx/gen + 2 колонки рефералов
Sort fields: createdAt | lastActiveAt | totalDeposited | totalTokensSpent | tokenBalance

6.3 Transactions

Файл	API
transactions/page.tsx	adminTransactionsApi.list → {items, total, pages, totals}
transactions/[id]/page.tsx	adminTransactionsApi.getById
transactions/stats/page.tsx	adminTransactionsApi.getStats(days) — 7/30/90/180
Stats page содержит:

8× StatCard (revenue/tokens/count/pending/failed/refunds/AOV)
RevenueChart (stacked bars: deposit + subscription)
GenerationsChart (bars tokens + line cost $, dual axis)
Breakdowns: byType, byStatus, byProvider, topModels, topSpenders, promoStats
Хелперы: formatRub, formatNumber, formatDateShort, formatDateFull
6.4 Models ⭐ САМЫЙ СЛОЖНЫЙ РАЗДЕЛ

Файл	Что делает
models/page.tsx	Хуки useAdminModels() + useModelActions(), inline edit tokenCost, toggle isActive
models/[slug]/page.tsx	Редактор с 4 табами: ui / pricing / caps / json
Поток данных в редакторе:


useAdminModels() → items[] → find(slug) → draft state
       ↓
   <UiParamsEditor value={draft.uiParameters} />
   <PricingMatrixEditor value={draft.pricingMatrix} uiParameters={draft.uiParameters} />
   <CapabilitiesEditor value={draft.capabilities} />
   <RawJsonEditor value={draft} />
       ↓
   Save → actions.update(slug, draft) → patchLocal(slug, draft)
После create: router.push('/admin/models/${slug}')

6.5 Billing

Файл	Layout	Особенности
billing/packages/page.tsx	Таблица	id/label/tokens/priceRub/₽за🔥/bonusPercent + PackageModal
billing/plans/page.tsx	Карточки (responsive 1/2/4 cols)	PlanModal с 4 табами: main / features / models / caps
PlanFeatures: maxDailyGenerations, priorityQueue, exclusiveModels, noWatermark, maxContextMessages
Icon map: Zap / Star / Rocket / Diamond / Crown / Sparkles

6.6 Promo Codes (promo-codes/page.tsx)

PromoCodeType: BONUS_TOKENS | DISCOUNT_PERCENT | DISCOUNT_RUB | SUBSCRIPTION_DAYS
ApplyTo: ANY | SUBSCRIPTION | TOKEN_PACKAGE | STANDALONE
Derived status: expired / exhausted / notStarted / active / inactive
Copy code + portal-меню (Edit/Toggle/Copy/Delete)
6.7 Settings

Файл	Что делает
settings/page.tsx	Хаб с SETTINGS[] карточками + флаг ready (Link / div)
settings/tokenomics/page.tsx	Курс, пачки, бонусы
⚠️ В tokenomics — ручная распаковка ответа (3 уровня): res.data.data || res.data || res — несоответствие формата API.

7. 🔌 API & типы (внешние модули)

7.1 Типы (@/types/)


admin-user           AdminUser, UserRole, AdminUserDetails
admin-transaction    AdminTransaction, AdminTransactionsQuery, TransactionType,
                     PaymentStatus, AdminTransactionDetails, AdminTransactionsStats
admin-model          AdminModel, UIParameter, UIParamType, CreateModelPayload,
                     UpdateModelPayload, GenerationType  (PricingMatrix — TBD)
admin-billing        AdminTokenPackage, AdminSubscriptionPlan, FreeModelAccess, PlanFeatures
admin-promo          AdminPromoCode, AdminPromoListQuery, AdminPromoUpsert,
                     PromoCodeType (enum), PromoApplyTo (enum)
7.2 API-клиенты (@/lib/api/)


client.ts                 apiClient.{get,put,post,delete}
endpoints.ts              ENDPOINTS константы (включая ADMIN_SETTINGS_TOKENOMICS)
admin-users.ts            list, getById, remove, toggleBan, changeRole, adjustBalance
admin-transactions.ts     list, getById, getStats(days)
admin-billing.ts          listPackages/togglePackage/deletePackage/createPackage/updatePackage
                          listPlans/togglePlan/deletePlan/createPlan/updatePlan
admin-promo-codes.ts      list, create, update, toggle, remove
Тип BalanceType: 'tokenBalance' | 'bonusTokens' | 'cashbackBalance' (из admin-users.ts)

7.3 Хуки (@/hooks/)

Ts

useAdminAuth()    → { loading, isAdmin, role, user }
useAdminModels()  → { items, total, loading, filters, setFilters,
                      refetch, patchLocal, removeLocal, addLocal }
useModelActions() → { busy, create, update, remove, toggle }
8. ⚠️ Tech Debt (отсортирован по приоритету)

#	Проблема	Где	Приоритет
1	Два UI-kit'а (Modal/Field/Input/Toggle): models vs user/promo	EditModelModal vs остальное	🔴 high
2	Дубль редактора параметров UIParameters vs UiParams (разные типы)	UIParametersEditor.tsx vs editor/UiParamsEditor.tsx	🔴 high
3	Дубль user-карточки в 3 модалках	Ban/Delete/Adjust	🔴 high
4	ErrorBox копипастится везде	Все модалки	🔴 high
5	ModalFooter (2 кнопки) копипастится	7 модалок	🔴 high
6	Локальные типы вместо @/types/admin-model	editor/*	🟡 med
7	Нативный confirm() (×4)	ModelsTable×2, UIParametersEditor, plans/packages	🟡 med
8	defaultValue + onBlur для conditions.key	editor/PricingMatrixEditor	🟡 med
9	Inconsistent skeleton/loader (везде Loader2)	global	🟡 med
10	any в обработчиках ошибок	global	🟡 med
11	Tokenomics: ручная распаковка ответа	settings/tokenomics/page.tsx	🟡 med
12	Нет глобального toast/error UI	global	🟢 low
13	<img> без next/image	User modals, ModelsTable	🟢 low
14	Inline SVG-графики — не переиспользуются	transactions/stats	🟢 low
15	Slug-sanitize дублируется	Create+Promo	🟢 low
9. 🎯 Готовые направления для рефакторинга

#	Что	Польза
A	UI-kit: Modal, ErrorBox, UserPreview, Field, Button, ConfirmModal	−300 строк дублей
B	useAsyncAction() хук	Убрать loading/error из всех модалок
C	Решить судьбу UIParametersEditor.tsx (legacy?)	Снять путаницу
D	Канонизировать типы в @/types/admin-model	Type-safety + sync с бэком
E	getErrorMessage(e: unknown): string + типы ApiError	Убрать any
F	Дизайн-токены в lib/admin-theme.ts	Цветовые схемы по доменам
G	Заменить все native confirm() на <ConfirmModal/>	Консистентность
H	Toast-система (e.g. sonner)	Глобальные уведомления
10. ❓ Незакрытые пробелы (нужны для 100% контекста)

#	Файл	Почему
1	_components/PricingSimulator.tsx	Импортируется в PricingMatrixEditor, файла не было
2	@/types/admin-model.ts	Канонические UIParameter / PricingMatrix / AdminModel / payloads
3	@/hooks/useAdminAuth.ts	Точные типы AdminRole и формат user
4	@/hooks/useAdminModels.ts + useModelActions.ts	Контракт фильтров и CRUD
5	@/lib/api/client.ts + 1 пример admin-*.ts	Формат apiClient и ошибок
6	@/types/admin-promo.ts	Подтвердить enum'ы
11. 🚦 Чек-лист для AI перед любой задачей в админке

Какой раздел? → выбрать ветку из §2
Какие компоненты затронуты? → из §6
Какой домен (цвета)? → §4.1 / 4.2
Это новая модалка? → следовать паттерну §5.3 + §5.4
Это новая страница-список? → паттерн §5.1
Затрагивает Tech Debt? → §8 — предложить исправить попутно (или НЕ ухудшать)
Нужны ли файлы? → запросить точечно по списку из §10
12. 🧭 Карта файлов VSCode (быстрая навигация)

Из присланного скриншота вижу актуальное дерево:


ai-miniapp/src/app/admin/
  _components/    (свёрнуто)
  billing/        ├ packages/ ├ plans/
  models/         ├ page.tsx  ├ [slug]/page.tsx
  promo-codes/    page.tsx
  settings/       ├ page.tsx  ├ tokenomics/
  transactions/   ├ page.tsx  ├ [id]/   ├ stats/
  users/          ├ page.tsx  ├ [id]/
  layout.tsx
  page.tsx        ← ОТКРЫТ (Dashboard)
Другие важные папки уровня src/:

components/ — общие компоненты приложения (не админки)
context/ — React Context-провайдеры
hooks/ — useAdmin* хуки лежат здесь
lib/ — lib/api/ API-клиенты
stores/ — глобальные сторы
types/ — все типы домена