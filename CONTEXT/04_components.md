🧩 Контекст: Frontend — Блок 4: React-компоненты

📋 Метаданные блока

Локация: src/components/
Всего файлов: 30 компонентов
Стиль кода: смесь BEM (классы из globals.css) + Tailwind utility-классы (внутри className="")
Все компоненты: 'use client' (Client Components)
Большие монолиты: ChatPage, ImageGenerationPage, VideoGenerationPage, AudioGenerationPage (~1000-2000 строк каждый)
🌳 Структура src/components/


src/components/
├── auth/
│   └── TelegramLoginButton.tsx         🔐 Telegram Login Widget (для веб-режима)
├── providers/
│   └── ModelsInitializer.tsx           ⚙️ Загрузчик AI-моделей при старте
├── ui/                                  🧱 Переиспользуемые UI-примитивы
│   ├── MediaResult.tsx                 🖼️ Универсальный плеер результата генерации
│   ├── MessageContent.tsx              📝 Markdown-рендер (с подсветкой кода)
│   ├── OfflineBanner.tsx               📡 Баннер "нет сети"
│   ├── PullToRefresh.tsx               👆 Pull-to-refresh жест
│   └── ToastContainer.tsx              🔔 Контейнер тостов
│
├── 🏠 ─── Главная страница ───
├── SpichkiApp.tsx                      🎯 ROOT — SPA-роутер всего приложения
├── Background.tsx                      🌌 Фоновая сцена (orbs + grid + image)
├── Header.tsx                          📰 Шапка (НЕ используется в SpichkiApp!)
├── StickyHeader.tsx                    📌 Sticky-хедер с балансом
├── BottomNav.tsx                       📲 Mobile bottom nav (5 пунктов)
├── DesktopSidebar.tsx                  🖥️ Desktop sidebar (240px / 72px)
├── ActionCards.tsx                     ⚡ 3 карточки (Пополнить/Тарифы/Друзья)
├── Categories.tsx                      📂 Сетка категорий моделей
├── BalanceCard.tsx                     💰 Карточка баланса (не используется!)
├── ChatFeed.tsx                        💬 Лента последних чатов на главной
├── HistoryList.tsx                     📜 Старый компонент (не используется!)
├── FeaturedCard.tsx                    ⭐ Промо-карточка (закомментирована)
│
├── 📚 ─── Списки ───
├── AllModelsPage.tsx                   🗂️ Все AI-модели (поиск+фильтры)
├── ChatsHistoryPage.tsx                💬 История всех чатов
├── FavoritesPage.tsx                   ⭐ Избранное
│
├── 🎨 ─── Генерация ───
├── ChatPage.tsx                        💬 LLM чат (стриминг + картинки)
├── ImageGenerationPage.tsx             🖼️ Генерация изображений
├── VideoGenerationPage.tsx             🎥 Генерация видео
├── AudioGenerationPage.tsx             🎵 Генерация аудио (Suno+ElevenLabs)
│
├── 👤 ─── Профиль / Биллинг ───
├── ProfilePage.tsx                     👤 Профиль пользователя
├── TopUpPage.tsx                       💸 Пополнение баланса (4 провайдера)
├── TransactionsPage.tsx                📊 История транзакций
├── SubscriptionPage.tsx                👑 Тарифы (Basic/Plus/Max/Ultimate)
├── ReferralPage.tsx                    🤝 Реферальная программа + вывод
├── SupportPage.tsx                     🆘 Поддержка (тикеты)
│
└── 🧪 ─── Dev ───
    └── TestModels.tsx                  🐛 Тестовый компонент (debug)
🎯 SpichkiApp.tsx — Центр приложения

Назначение: единый клиентский SPA-контейнер. Реализует внутренний роутинг через state (не Next.js App Router).

Архитектура

Tsx

type Page = 'home' | 'all-models' | 'chat' | 'image-generation' | 
            'video-generation' | 'audio-generation' | 'chats-history' |
            'profile' | 'topup' | 'transactions' | 'subscription' |
            'referral' | 'favorites' | 'support'
Состояние навигации

Tsx

const [activeNav, setActiveNav] = useState('feed')      // активный таб в BottomNav
const [page, setPage] = useState<Page>('home')          // текущая страница
const [pageHistory, setPageHistory] = useState<Page[]>([]) // стек истории
const [initialCategory, setInitialCategory] = useState<string | null>(null)
const [chatModel, setChatModel] = useState<string>('ChatGPT 4o')
const [chatId, setChatId] = useState<string | undefined>(undefined)
Навигационные хелперы

navigateTo(page) — push в стек
goBack() — pop из стека (если пусто → home)
goHome() — сброс стека и переход на главную
openAllModels(category?) — открыть модели с фильтром
openChat(modelSlug?, chatId?) — открыть чат
openGeneration(type) — открыть генерацию (image/video/audio)
openChatsHistory() — история чатов
handleActionNavigate(target) — обработка ActionCards
handleProfileNavigate(target) — обработка кликов из профиля
handleNavChange(id) — переключение в BottomNav
Гейты загрузки (3 экрана app-loading)

Tsx

1. !isReady       → Telegram SDK не готов
2. !authReady     → Auth-flow в процессе
3. !hydrated      → Zustand persist не гидратировался
   ↓
4. !isTelegram && !token → <TelegramLoginButton /> (веб-логин)
   ↓
5. ✅ Авторизован → основной layout
Основной layout

Tsx

<div className="app-layout">
  <Background />                         {/* Декоративный фон */}
  <DesktopSidebar />                     {/* >= 768px */}
  
  <div className="app-layout__main">
    <StickyHeader />                     {/* < 768px (через CSS) */}
    <OfflineBanner />                    {/* Условный */}
    
    {/* Условный рендер страниц */}
    {page === 'home' && <PullToRefresh>...</PullToRefresh>}
    {page === 'chat' && <ChatPage key={...} />}
    {page === 'image-generation' && <ImageGenerationPage />}
    {/* ... */}
    
    <BottomNav />                        {/* < 768px (через CSS) */}
  </div>
</div>
⚠️ Особенность: <ChatPage key={chatId || chatModel} /> — принудительный re-mount при смене чата/модели. Это убивает state внутри ChatPage, но гарантирует свежую загрузку.

🔐 Auth: TelegramLoginButton

Назначение: показывается, если приложение открыто НЕ в Telegram и нет JWT.

Логика

Загружает скрипт https://telegram.org/js/telegram-widget.js?22
Регистрирует глобальный коллбэк window.onTelegramWidgetAuth
Widget Telegram'а вызывает коллбэк → onAuth(data) → loginWithWidget(data) из useAuth
Использует inline styles (НЕ Tailwind, НЕ classes) — единственный компонент так делает
Атрибуты Telegram-виджета

Ts

data-telegram-login: botUsername (env)
data-size: large
data-radius: 12
data-onauth: 'onTelegramWidgetAuth(user)'
data-request-access: write
Fallback

Если NEXT_PUBLIC_TELEGRAM_BOT_USERNAME не задан — показывает ошибку.

🧱 UI-примитивы (src/components/ui/)

MediaResult.tsx — Универсальный плеер результата

Отображает результат любой генерации (image / video / audio).

Состояния (из Generation стора):

pending / processing → спиннер + прогресс-бар + ожидаемое время
failed → ошибка + кнопка retry + уведомление о возврате спичек
completed без URL → "результат не получен" + retry
completed с URL → плеер + actions bar
Контент:

image — <img> + карусель (стрелки, точки) если resultUrls.length > 1
video — <video controls> с playsInline preload="metadata"
audio — <audio controls>
Actions bar (компонент ActionBtn):

⭐ Favorite (toggle через useGeneration().toggleFavorite)
⬇️ Download (single)
⬇️ DownloadCloud (если несколько — batch с задержкой 500ms)
🔗 Share2 (копирование URL)
◀▶ Pager (если несколько результатов)
Download стратегия (3 fallback):

Telegram.WebApp.downloadFile() (если внутри TG)
Backend proxy /upload/download?url=...&filename=... (с JWT)
Прямой fetch(url) → blob → <a download>
Финальный fallback: копирование URL в буфер
Утилиты:

getFileExtension(url, type) — определение расширения по URL или type
triggerBlobDownload(blob, filename) — создание <a> и клик
MessageContent.tsx — Markdown-рендер

react-markdown + remark-gfm + rehype-highlight
memo() — оптимизация для стриминга чата
Кастомизация:
<pre> → <CodeBlockWrapper> (с кнопкой "Копировать")
<code> inline → класс msg-markdown__inline-code
<a> → target="_blank" rel="noopener noreferrer"
<table> → обёрнута в <div class="msg-markdown__table-wrap">
extractText() — рекурсивное извлечение текста из React children для копирования кода.

OfflineBanner.tsx — Баннер offline

Использует useOffline хук → если isOffline → красный баннер вверху.

PullToRefresh.tsx — Pull-to-refresh

Свой реализованный жест (без библиотек):

THRESHOLD = 70px
Активируется только если window.scrollY <= 0
Коэффициент сопротивления: diff * 0.35
Inline-styles (не Tailwind/BEM)
Использует refs (pulling, moved) чтобы не триггерить рендер
ToastContainer.tsx — Тосты

Подписан на useToastStore (Zustand)
4 типа: success / error / warning / info (разные цвета иконок)
Иконки из lucide-react
Управление через toast.success() / toast.error() etc. (см. блок сторов)
📦 Providers

ModelsInitializer.tsx

Tsx

useEffect(() => loadModels(), [loadModels])
return null
Просто триггерит загрузку моделей через useModels().loadModels() при монтировании. Рендерится в layout.tsx.

🏠 Главная страница

Background.tsx

Декоративная сцена position: fixed; inset: 0; z-index: 0
Дублирует CSS из globals.css через inline-стили (странное решение)
<img> фоновая картинка (/bg-ai.jpg) с graceful degradation (onError → display: none)
2 анимированных orb'а + grid pattern
StickyHeader.tsx

Минимальный — лого "SPICHKI AI" + баланс через useUser.

Header.tsx

Дублирует функционал StickyHeader (логотип /logod.png)
НЕ используется в SpichkiApp → мёртвый код
BottomNav.tsx

5 пунктов: feed | favorites | create | models | profile

create — центральная FAB-кнопка (красная, увеличенная), при клике:
switchToNewChat() (сброс активного чата)
onChange('create')
Остальные — обычные кнопки навигации
Стили через классы .bottom-nav__* из globals.css
DesktopSidebar.tsx

Альтернатива BottomNav для desktop. 4 пункта (без create — он отдельная кнопка сверху).

Логотип SPICHKI
Кнопка "Новый чат" (красный градиент)
Навигация
Balance card (всегда отображает число — 0 если не загружено)
Topup-кнопка
Footer с версией
ActionCards.tsx

3 карточки на главной:

🔥 Пополнить (баланс)
👑 Тарифы (текущий план)
🎁 Друзья (реферал)
Полностью на Tailwind utilities, без BEM-классов. Стилизуется через gradientStyles и iconColors объекты.

Categories.tsx

Сетка 2×2 категорий генерации (text/image/video/audio) с обложками (/covers/*.webp).

Считает кол-во моделей из useModels
Pluralization: 1 модель / 2-4 модели / 5+ моделей
При клике → onCategoryTap(categoryId) → открыть AllModelsPage с фильтром
ChatFeed.tsx

Лента последних 6 чатов на главной.

Группировка по датам (Сегодня / Вчера / Ранее)
Star для добавления в избранное
Loading state с Loader2
При клике → onChatTap(model, chatId)
HistoryList.tsx

Старый аналог ChatFeed. НЕ используется → мёртвый код.

BalanceCard.tsx

Старая карточка баланса с захардкоженными значениями 12 450. НЕ используется → мёртвый код.

FeaturedCard.tsx

Промо-карточка "Все модели — одна подписка". Закомментирована в SpichkiApp → готова для повторного включения.

📚 Списки

AllModelsPage.tsx

Поиск (по name + provider)
Фильтр по категориям (text/image/video/audio)
Группировка по категориям если фильтр не выбран
Каждая модель — <ModelCard> (внутренний компонент)
Возможность добавить модель в избранное (⭐)
Передаёт SLUG (не name) через onModelTap(slug, category)
ChatsHistoryPage.tsx

Поиск (title + model + lastMessage)
Infinite scroll через IntersectionObserver (по 20 шт)
Группировка по датам
Удаление чата (Trash2)
Toggle favorite (Star)
FavoritesPage.tsx

Универсальный список избранного (3 типа: conversation / generation / model).

Фильтр по типу
Infinite scroll (пагинация с бэка через IntersectionObserver)
Backend-формат → frontend через mapFavorite()
При клике диспатчит соответствующее открытие:
conversation → onOpenChat(model, itemId)
generation → onOpenGeneration(subtype)
model → если text → чат, иначе → генерация
Кеш-инвалидация: apiClient.post('/favorites/toggle') для удаления
🎨 Генерация (большие монолиты)

Общий паттерн (всех 4 страниц)

Tsx

// 1. Загрузка моделей категории
const categoryModels = useMemo(() => allModels.filter(m => m.category === '...'), [allModels])

// 2. Резолв initial model (slug or name)
const resolveInitialSlug = useCallback(() => { ... })
const [slug, setSlug] = useState<string>(resolveInitialSlug())

// 3. Загрузка UI-конфига модели с бэка
const { config: uiConfig, isLoading: isLoadingConfig } = useModelUIConfig(slug)

// 4. Caps (capabilities) = бэк + fallback
const caps = useMemo(() => { ... }, [uiConfig, slug])

// 5. Price-калькулятор с дебаунсом
const { price, isCalculating } = usePriceCalculator(slug, priceParams, {
  enabled: !!uiConfig && syncedSlug === slug,
  debounceMs: 300,
})

// 6. Cached price (lastPriceRef) — чтобы не было прыжков на 0 при пересчёте

// 7. Batch reset при смене модели — defaults из uiConfig + caps[0]

// 8. Telegram BackButton с приоритетами:
//    showSettings ? close settings :
//    showModelPicker ? close picker :
//    onBack()

// 9. Sync initial model (один раз через initialAppliedRef)

// 10. Layout: model bar + chips + scroll + input area + settings sheet
Особенности ChatPage.tsx (~1500 строк)

Уникальное (отличается от gen-страниц):

Streaming через streamChat() API (SSE)
Vision support: проверка currentModel.supportsVision + UI-индикатор 👁
Image attachments: до 10 картинок с прогрессом загрузки
Каждая — ImageAttachment { id, file, previewUrl (blob:), status, progress, remoteUrl, errorMessage, abortController }
Параллельная загрузка через uploadImage()
Retry при ошибке (клик по картинке с ошибкой)
Cleanup blob URLs при unmount
State через Zustand: useChatStore (messages, streaming, активный чатId)
Stop streaming: abortRef.current?.abort() + сохранение partial content
Token balance update: после onDone обновляет userStore (списание с bonus затем с main)
Загрузка истории сообщений при существующем chatId (через GET /chats/:id/messages?page=1&limit=50)
Auto-resize textarea: max 120px
Особенности ImageGenerationPage.tsx

Параметры:

aspectRatio, resolution, quality, mode, outputFormat, seed
negativePrompt
Img2Img: до caps.maxInputImages входных картинок
requiresInputImage = slug.includes('img2img')
Random seed через кнопку Shuffle (0 .. 2147483647)
UI labels (mapping):

MODE_LABELS, ASPECT_RATIO_LABELS, RESOLUTION_LABELS, QUALITY_LABELS
Особенности VideoGenerationPage.tsx

Параметры:

duration, aspectRatio, quality, resolution, mode
sound (boolean)
removeWatermark (boolean) — только для Sora
Img2Vid: 1 входная картинка
requiresInputImage = slug.includes('img2vid') || slug === 'kling-3.0-motion'
FALLBACK по 11 моделям — если бэк не вернул uiConfig:

sora-2, sora-2-img2vid, sora-2-pro
kling-3.0, kling-3.0-img2vid, kling-3.0-motion
runway
hailuo-2.3-standard, hailuo-2.3-pro
veo-3.1-fast, veo-3.1-pro
Sora warning: спец. предупреждение про модерацию реальных людей

Особенности AudioGenerationPage.tsx (самая сложная)

6 типов модели (определяются по slug):

Ts

type AudioType = 'suno' | 'elevenlabs-tts' | 'elevenlabs-sfx' 
               | 'elevenlabs-isolation' | 'elevenlabs-stt' 
               | 'elevenlabs-dialogue' | 'generic'
detectType(slug) — детекция по подстрокам в slug.

FALLBACK_BY_TYPE — индивидуальные caps для каждого типа.

Параметры по типам:

Suno: customMode, instrumental, style (text), duration (5-300с)
TTS: voiceId (19 голосов), language (12), stability, similarity, speed
Dialogue: формат Name: text, голоса вставляются кликом
SFX: duration (1-30с), loop, promptInfluence
Isolation: загрузка аудио, нет промпта
STT: загрузка аудио + language
Audio upload:

Endpoint: POST /upload/audio (multipart)
Max 10MB
60s timeout
Возвращает data.url
Insert voice name (для dialogue):

Курсор-aware вставка \nName: в textarea
Если перед курсором не newline — добавит \n
19 голосов ElevenLabs хардкодом, 12 языков хардкодом.

👤 Профиль и биллинг

ProfilePage.tsx

Avatar / username / plan badge
Balance + actions (Пополнить, История)
Подписка (текущий план + дата следующего списания)
Реферальный код (copy)
Статистика "С нами с {month}"
Support link → t.me/d_igoshev
TopUpPage.tsx

5 пакетов (100/300/700/1500/5000 спичек) с popular/best бейджами
Скидки (auto-calc от BASE = 3 руб/спичка)
Currency toggle (RUB / USD по курсу R = 75)
4 провайдера оплаты:
stars — Telegram Stars
tochka — Точка (РФ ₽)
freedompay — FreedomPay (KZ ₸)
heleket — Crypto (USDT/BTC)
Промокоды (через applyPromo из useBilling)
Footer: "ИП Аневич А.С. · ИНН 246220127244" (юр. сведения)

🧩 Контекст: Frontend — Блок 4 (продолжение)

TransactionsPage.tsx (продолжение)

Infinite scroll (IntersectionObserver, по 20)
Типы (с иконками и цветами):
purchase 🛒 (blue) — покупка пакета
subscription 👑 (amber) — подписка
bonus 🎁 (green) — бонус
referral 👥 (purple) — реферальная награда
spending ⚡ (red) — расход (генерация)
refund 🔄 (green) — возврат
Статусы: completed / pending / failed (с цветовой кодировкой)
Income detection: ['purchase', 'bonus', 'referral', 'refund', 'subscription'].includes(tx.type) → знак +/− и цвет
Date formatting: Сегодня, HH:MM / Вчера, HH:MM / DD.MM.YYYY, HH:MM
Если paymentAmountRub есть → доп. строка с реальной суммой в рублях
SubscriptionPage.tsx

4 плана: Basic (450₽), Plus (990₽), Max (2490₽), Ultimate (5990₽)
Plus помечен как isPopular
Currency toggle RUB/USD (курс RATE = 90)
Карточка плана содержит:
tokens + bonusTokens (в подарок)
modelsAccess ("Полный доступ" / "Ограниченное")
freeModels — список с лимитами (10/час, 60/сутки или "Безлимит")
capabilities — что можно генерировать
Expandable список бесплатных моделей (ChevronDown/Up)
Backend integration: subscribe(planId) → URL → webApp.openLink(url)
ReferralPage.tsx (default export, не named)

Уникальный CSS namespace: .ref-* (отдельный от .referral-* старой версии)
Backend endpoint: GET /referral/info + GET /referral/withdrawals
Отображение:
Реферальная ссылка с копированием
Инструкция (5 шагов)
Cashback card (доступно к выводу + общий заработок)
Статистика (друзей / с покупками / кэшбек)
Список приглашённых с аватарами
Withdraw modal:
3 метода: card (РФ карта) / sbp (СБП) / crypto (USDT TRC20)
Min withdrawal: из data.minWithdrawal (с бэка)
Validation: сумма, реквизиты (>= 4 символа)
POST /referral/withdraw
History modal:
Статусы: pending / approved / paid / rejected
STATUS_LABELS с цветами
Admin notes
Share в Telegram: https://t.me/share/url?url=...&text=... через webApp.openTelegramLink
SupportPage.tsx

3 view states: list / ticket / new
Backend types → frontend mapping (mapTicket, mapMsg)
Endpoints:
GET /support/tickets?page=1&limit=50 — список
POST /support/tickets — создание
POST /support/tickets/:id/message — ответ
Статусы тикета: open / in_progress / resolved / closed
Чат-стиль сообщений (user справа желтый, admin слева серый)
Reply закрыт если статус resolved или closed
Telegram BackButton: приоритет на закрытие view вместо exit
Auto-scroll к последнему сообщению через endRef
🐛 TestModels.tsx

Dev-компонент для проверки загрузки моделей. Просто выводит список text-моделей. Не используется в SpichkiApp → должен быть удалён или вынесен в dev-tools.

🎨 Стилизация — Hybrid подход

В компонентах используется смешанный подход:

1. BEM-классы из globals.css

Tsx

<div className="bottom-nav__item bottom-nav__item--active">
<div className="feed-item">
<div className="profile-balance__btn">
2. Tailwind utility-классы (в строках)

Tsx

<div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04]">
<button className="active:scale-[0.97] active:bg-amber-400/[0.08]">
3. Inline CSS variables через style

Tsx

style={{
  background: 'linear-gradient(180deg, rgba(8,8,10,0.3) 0%, ...)',
  backgroundImage: 'linear-gradient(rgba(250,204,21,0.015) 1px, ...)',
}}
4. CSS-переменные через arbitrary values

Tsx

className="bg-[var(--bg-glass)] backdrop-blur-[var(--blur)] border-[var(--border-glass)]"
className="text-[var(--accent-yellow)] rounded-[var(--radius-sm)]"
⚠️ Проблема: нет единого стандарта — некоторые компоненты на 90% Tailwind (например AudioGenerationPage), некоторые на 90% BEM (например BottomNav, ChatsHistoryPage). Это затрудняет поддержку и поиск стилей.

🔌 Используемые хуки (из @/hooks)

Хук	Где используется
useTelegram()	везде — haptic, hapticNotification, webApp, user, isReady, isTelegram
useUser()	balance, subscription, referralCode, isLoaded, refetch
useAuth()	isReady, loginWithWidget
useChat()	chats, chatsLoaded, loadChats, deleteChat
useFavorites()	toggle, isFavorite
useModels()	models, categories, loadModels
useGeneration()	generate, generations, toggleFavorite
useBilling()	purchaseTokens, applyPromo, subscribe, loadTransactions, transactions, referralInfo, loadReferralInfo
useOffline()	isOffline
useModelUIConfig(slug)	config (UI-параметры модели), isLoading
usePriceCalculator(slug, params)	price, isCalculating (real-time расчёт стоимости)
📦 Используемые сторы (из @/stores)

Стор	Использование
useChatStore	messages, isStreaming, streamingContent, activeChatId, switchToNewChat, addMessage, setMessages, switchChat, addChat
useModelsStore	models (для resolve внутри ChatPage)
useAuthStore	token, persist hydration
useUserStore	updateBalance (списание после стриминга)
useToastStore	toasts, remove
toast namespace	toast.success/error/warning/info (helpers)
🌐 API-слой (из @/lib/api)

Функция	Назначение
apiClient (axios)	базовый клиент с JWT интерцептором
ENDPOINTS	константы путей
streamChat()	SSE стриминг для LLM
uploadImage(file, { signal, onProgress })	upload с прогрессом и AbortController
validateImageFile(file)	client-side валидация
isApiError(err)	type guard
📑 Используемые типы

Тип	Откуда
Generation	@/stores/generation.store
Chat, ChatMessage	@/stores/chat.store
ModelItem	@/lib/data
Transaction	@/hooks/useBilling
ModelUIConfig	@/hooks/useModelUIConfig
TelegramWidgetData	@/hooks/useAuth
ToastType	@/stores/toast.store
🔥 Архитектурные паттерны

1. Settings Sheet pattern

Во всех 4 страницах генерации:

Tsx

{showSettings && (
  <>
    <div className="gen-settings-overlay" onClick={() => setShowSettings(false)} />
    <div className="gen-settings-sheet">
      {/* поля */}
    </div>
  </>
)}
Bottom-sheet с overlay, переезжает в центр на desktop через CSS.

2. Model Picker dropdown pattern

Tsx

<button onClick={() => setShowModelPicker(!showModelPicker)}>
  {currentModel.name} <ChevronDown />
</button>
{showModelPicker && (
  <div className="absolute top-[calc(100%+2px)] left-4 right-4 ...">
    {models.map(m => <button onClick={() => switchModel(m.slug)} />)}
  </div>
)}
3. Price caching pattern (анти-flicker)

Tsx

const lastPriceRef = useRef<{ cost, label, fallback } | null>(null)

useEffect(() => {
  if (isConfigReady && !isCalculating && price) {
    lastPriceRef.current = { cost: ..., label: ..., fallback: ... }
  }
}, [isConfigReady, isCalculating, price])

useEffect(() => { lastPriceRef.current = null }, [slug]) // сброс при смене модели

const displayedCost = (() => {
  if (!isConfigReady) return modelMinCost          // нет данных → minCost
  if (price && !isCalculating) return price.costInTokens
  if (lastPriceRef.current) return lastPriceRef.current.cost  // кэш
  return modelMinCost
})()
4. Initial model resolution pattern

Tsx

const initialAppliedRef = useRef(false)

useEffect(() => {
  if (initialAppliedRef.current) return
  if (!initialModel || categoryModels.length === 0) return
  
  const match = categoryModels.find(m => 
    m.slug?.toLowerCase() === initialModel.toLowerCase() ||
    m.name?.toLowerCase() === initialModel.toLowerCase()
  )
  if (match) {
    if (match.slug !== slug) {
      setSyncedSlug(null) // заморозить цену
      setSlug(match.slug)
    }
    initialAppliedRef.current = true
  }
}, [initialModel, categoryModels, slug])
5. Telegram BackButton pattern

Tsx

useEffect(() => {
  if (!webApp?.BackButton) return
  webApp.BackButton.show()
  
  const handler = () => {
    // Приоритет закрытия:
    if (showSettings) { setShowSettings(false); return }
    if (showModelPicker) { setShowModelPicker(false); return }
    onBack?.()
  }
  
  webApp.BackButton.onClick(handler)
  return () => {
    webApp.BackButton.offClick(handler)
    webApp.BackButton.hide()
  }
}, [webApp, onBack, showSettings, showModelPicker])
6. Auto-scroll pattern

Tsx

const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const el = containerRef.current
  if (!el) return
  if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
}, [messages])
7. Infinite scroll pattern

Tsx

const loaderRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!loaderRef.current || !hasMore) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        loadMore()
      }
    },
    { threshold: 0.1 }
  )
  observer.observe(loaderRef.current)
  return () => observer.disconnect()
}, [hasMore, loadingMore])
8. fs-page layout pattern (full-screen)

Все страницы генерации + чат используют:

Tsx

<div className="fs-page fixed inset-0 z-[5] flex flex-col bg-[var(--bg-primary)] pt-[...]">
  <div className="fs-page__bar shrink-0">       {/* фиксированный хедер */}
  <div className="fs-page__scroll flex-1 min-h-0 overflow-y-auto">  {/* скролл */}
  <div className="fs-page__input shrink-0">     {/* фиксированный инпут */}
</div>
CSS из globals.css сдвигает .fs-page относительно desktop sidebar (left: 240px) и центрирует контент через max-width: 1000px. При body.tg-app все сдвиги сбрасываются.

⚠️ Замеченные проблемы

🔴 Критичные

Мёртвый код (компоненты не используются):

Header.tsx (заменён на StickyHeader)
HistoryList.tsx (заменён на ChatFeed)
BalanceCard.tsx (с захардкоженными 12 450)
FeaturedCard.tsx (закомментирован в SpichkiApp)
TestModels.tsx (dev-компонент)
👉 ~5 файлов на удаление
Inline styles в TelegramLoginButton.tsx — единственный компонент так стилизуется, выбивается из общего стиля. Перевести на Tailwind/BEM.

Дублирование Background: компонент <Background> дублирует CSS из globals.css (.bg-scene__*). Либо удалить inline-стили из JSX, либо удалить классы из CSS.

2 версии Referral:

JSX использует только ReferralPage (новая, namespace .ref-*)
CSS содержит и старую .referral-* версию → можно удалить старую из CSS
🟡 Средне

Огромные монолиты (1000-2000 строк):

ChatPage.tsx
ImageGenerationPage.tsx
VideoGenerationPage.tsx
AudioGenerationPage.tsx
👉 Нужна декомпозиция на подкомпоненты: <ModelPicker>, <SettingsSheet>, <InputArea>, <ResultsList> — переиспользуемые между 4 страницами.

Дублирование Field/Chip/Slider/Grid/OptBtn: в AudioGenerationPage и VideoGenerationPage (и частично ImageGenerationPage) объявлены свои локальные helper-компоненты с почти идентичной логикой. Вынести в @/components/ui/gen/.

Дублирование FALLBACK конфигов:

FALLBACK_BY_TYPE в AudioGenerationPage
FALLBACK в VideoGenerationPage
👉 Перенести в backend или хотя бы в src/lib/genFallbacks.ts.
Хардкоды:

19 voices ElevenLabs
12 LANGUAGES
5 пакетов TopUp + цены
4 плана подписки + цены
Курс USD RATE = 75 / RATE = 90 (в разных файлах разный!)
MAX_IMAGES = 10 (в ChatPage)
THRESHOLD = 70 (в PullToRefresh)
BASE = 3 рубля за спичку в TopUp
👉 Курсы, лимиты, тарифы — должны приходить с бэка.
Несогласованность типизации:

Tsx

const audioModels = useMemo(() => allModels.filter((m: any) => ...), [allModels])
any повсюду в фильтрах моделей. Должен быть ModelItem из @/lib/data.

EXAMPLES хардкодом для каждого типа аудио + image + video — должны быть в config.

🟢 Минор

MessageContent не использует key для <CodeBlockWrapper> — если код-блоков несколько, могут быть проблемы с reconciliation.

MediaResult.tsx — функция downloadFile использует (window as any).Telegram?.WebApp напрямую, минуя useTelegram хук. Несогласованно.

Inline console.log в ImageGenerationPage:

Tsx

console.error('[Upload]', err)
Должно быть через единый logger.

Magic strings для бейджей:

Tsx

iconColorMap[item.type] // 'chat' | 'image' | ...
Лучше через enum.

DesktopSidebar: version: 'v1.0 · AI Platform' хардкодом — стоит брать из package.json или env.

Двойной paginator в MediaResult:

Стрелки поверх изображения
Pager 1/N в actions bar
Можно унифицировать.
🎯 Архитектурные решения (характеристики проекта)

SPA-в-SPA: Next.js используется минимально (только корневой page.tsx). Вся логика — в SpichkiApp через state-роутинг.

Stateful navigation history: pageHistory: Page[] — простой стек. Не использует браузерную history API → при F5 теряется текущая страница (всегда home).

3 точки входа:

Telegram WebApp (auto-auth через initData)
Web с JWT (persisted)
Web без JWT → TelegramLoginButton
Backend-driven UI: UI-параметры моделей (useModelUIConfig) и цены (usePriceCalculator) приходят с бэка. Frontend имеет fallback'и, но "правда" — на сервере.

Optimistic UI:

Favorites toggle (мгновенное обновление, потом sync)
Token balance update после стриминга (manual decrement из userStore)
Image uploads с прогрессом
Streaming-first для LLM: чат построен вокруг SSE-стриминга, streamingContent отдельный state.