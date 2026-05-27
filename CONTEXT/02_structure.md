📦 Контекст: Frontend — Блок 2: Структура проекта и роутинг

🌳 Дерево проекта ai-miniapp/


ai-miniapp/
├── public/                          # Статика (иконки, изображения)
├── src/
│   ├── app/                         # 🎯 App Router (Next.js 16)
│   │   ├── admin/                   # 🔐 Админ-панель
│   │   │   ├── _components/         # Приватные компоненты админки
│   │   │   ├── billing/             # Управление биллингом
│   │   │   ├── models/              # CRUD AI-моделей
│   │   │   ├── promo-codes/         # Промокоды
│   │   │   ├── settings/            # Настройки системы
│   │   │   ├── transactions/        # Транзакции
│   │   │   ├── users/               # Пользователи
│   │   │   ├── layout.tsx           # Layout админки
│   │   │   └── page.tsx             # Главная админки (дашборд)
│   │   ├── favicon.ico
│   │   ├── globals.css              # ✅ Активные глобальные стили
│   │   ├── globals.backup.css       # ⚠️ Бэкап (нужно удалить?)
│   │   ├── globals.css.backup       # ⚠️ Бэкап
│   │   ├── globals.css.backup2      # ⚠️ Бэкап
│   │   ├── layout.tsx               # 🌐 Root layout (Telegram, Toast, Models init)
│   │   └── page.tsx                 # 🏠 Главная → <SpichkiApp />
│   ├── components/                  # React-компоненты
│   ├── context/                     # React Contexts (TelegramContext)
│   ├── hooks/                       # Кастомные хуки (useGeneration, useUser, useFavorites)
│   ├── lib/                         # Утилиты, helpers, API-клиент
│   ├── stores/                      # Zustand-сторы
│   ├── types/                       # TypeScript-типы
│   └── upload/                      # Логика загрузки файлов
├── .dockerignore
├── .gitignore
├── CONTEXT.md
├── Dockerfile
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml                   # ⚠️ Есть И pnpm-lock И yarn.lock — нужно выбрать
├── postcss.config.mjs
├── README.md
├── tsconfig.json
└── yarn.lock                        # ⚠️ В Dockerfile используется yarn
🗺️ Роутинг (App Router)

Корневой layout — src/app/layout.tsx

Структура:

Tsx

<html lang="ru" data-color-scheme="dark" suppressHydrationWarning>
  <head>
    <Script src="telegram-web-app.js" strategy="beforeInteractive" />
  </head>
  <body>
    <TelegramProvider>
      <ModelsInitializer />     {/* Загружает список AI-моделей при старте */}
      {children}
      <ToastContainer />        {/* Глобальные уведомления */}
    </TelegramProvider>
  </body>
</html>
Ключевые моменты:

🌑 Dark theme by default (data-color-scheme="dark", themeColor: '#0A0A0A')
📱 Viewport залочен: maximumScale: 1, userScalable: false → запрет масштабирования (типично для MiniApp)
🤖 Telegram WebApp SDK грузится beforeInteractive — доступен до гидратации React
🌐 Язык: ru
🔇 suppressHydrationWarning на html и body — из-за Telegram SDK, который модифицирует DOM до гидратации
Метаданные:

Title: SPICHKI AI | Агрегатор ИИ
Description: Все нейросети в одном месте. Telegram Mini App.
Корневая страница — src/app/page.tsx

Tsx

import { SpichkiApp } from '@/components/SpichkiApp'

export default function HomePage() {
  return <SpichkiApp />
}
📌 Архитектурное решение: вся логика приложения вынесена в <SpichkiApp /> — единый клиентский компонент-обёртка. Это означает что:

App Router используется минимально (только корень + админка)
Навигация между экранами (audio/video/image/text), вероятно, реализована внутри SpichkiApp через внутренний state, а не через Next.js routes
Это классический паттерн для Telegram Mini App — SPA внутри одного route
🔐 Админ-панель — src/app/admin/

Отдельная зона приложения с полноценным роутингом:

Раздел	Назначение
admin/	Дашборд
admin/users/	Управление пользователями
admin/billing/	Биллинг и тарифы
admin/transactions/	История транзакций
admin/promo-codes/	Промокоды
admin/models/	AI-модели (CRUD)
admin/settings/	Настройки
admin/_components/	Приватные UI-компоненты админки (underscore = не роут в Next.js)
📌 Архитектурный контраст: основное приложение — SPA через SpichkiApp, а админка — нормальный multi-route Next.js. Скорее всего у них разные layout'ы.

📂 Структура src/ (верхний уровень)

Папка	Назначение
app/	Next.js App Router (страницы, layouts)
components/	UI-компоненты (включая SpichkiApp, ToastContainer, providers/ModelsInitializer)
context/	React Context (TelegramContext)
hooks/	Кастомные хуки бизнес-логики
lib/	Утилиты, API-клиент, helpers
stores/	Zustand-сторы (state management)
types/	Глобальные TS-типы
upload/	Логика загрузки файлов (вероятно, для аудио STT/изоляции)
🧩 Известные ключевые компоненты/модули

Из layout.tsx:

@/context/TelegramContext → TelegramProvider
@/components/ui/ToastContainer → система уведомлений
@/components/providers/ModelsInitializer → загрузчик AI-моделей при старте
Из page.tsx:

@/components/SpichkiApp → главный SPA-контейнер
⚠️ Замеченные проблемы / технический долг

Три бэкапа globals.css в src/app/:

globals.backup.css
globals.css.backup
globals.css.backup2
👉 Захламляют репозиторий, стоит удалить или вынести в .archive/.

Конфликт пакетных менеджеров: есть и yarn.lock, и pnpm-lock.yaml.

Dockerfile использует yarn
👉 Нужно удалить pnpm-lock.yaml (или наоборот, мигрировать на pnpm)
94 проблемы ESLint/TS (видно в статусбаре VSCode) — при этом TS/ESLint отключены при билде. Риск накопления ошибок.

Папка src/upload/ — нестандартное расположение (обычно загрузка — это часть lib/ или services/). Нужно проверить, что там.

Контраст роутинга: основное приложение — SPA, админка — multi-route. Нужно учесть при работе с навигацией.