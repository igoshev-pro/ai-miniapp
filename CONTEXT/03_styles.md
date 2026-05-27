🎨 Контекст: Frontend — Блок 3: Стили и дизайн-система (globals.css)

📋 Метаданные файла

Файл: src/app/globals.css
Размер: ~4000+ строк (очень большой монолитный CSS)
Подход: чистый CSS + CSS Custom Properties (НЕ Tailwind utilities, хотя Tailwind подключён)
Методология: BEM (.block__element--modifier)
Tailwind: импортирован (@import "tailwindcss"), но почти не используется — стили написаны вручную
⚠️ Важно: несмотря на наличие Tailwind v4, команда пошла по пути классического CSS с BEM. Tailwind фактически "мёртвый груз" в бандле.

🎨 Дизайн-токены (CSS Variables)

Палитра — тёмная тема (фиксированная)

Css

/* Backgrounds */
--bg-primary:       #08080a    /* Основной фон (почти чёрный) */
--bg-card:          rgba(255,255,255,0.04)  /* Карточки */
--bg-card-hover:    rgba(255,255,255,0.07)
--bg-card-solid:    #131315
--bg-glass:         rgba(18,18,22,0.72)     /* Стекло (основное) */
--bg-glass-heavy:   rgba(12,12,15,0.88)     /* Стекло (хедер/футер) */

/* Акценты */
--accent-yellow:    #facc15    /* Основной (CTA, активные элементы) */
--accent-red:       #ef4444    /* FAB Create, danger */
--accent-orange:    #f97316    /* Градиенты с yellow */

/* Шкала серого (Tailwind-like) */
--gray-100 ... --gray-900

/* Glow эффекты */
--glow-yellow:      rgba(250,204,21,0.20)
--glow-red:         rgba(239,68,68,0.25)
Размеры и эффекты

Css

--blur:           blur(20px)      /* Glassmorphism (основной) */
--blur-heavy:     blur(40px)      /* Хедер/футер/модалки */
--radius:         16px            /* Карточки */
--radius-sm:      12px            /* Кнопки, поля */
--radius-xs:      8px             /* Чипы, badges */
--radius-btn:     10px            /* Кнопки */
--header-height:  56px            /* Высота хедера */
Telegram/Safe-area переменные

Css

--safe-bottom:               env(safe-area-inset-bottom, 0px)
--tg-viewport-height:        100vh   /* Заменяется TG SDK */
--tg-viewport-stable-height: 100vh   /* Заменяется TG SDK */
--safe-area-top:             0px
--tg-top:                    0px     /* Высота Telegram header */
🏛️ Архитектура layout — три режима

Один и тот же код рендерит UI в трёх режимах, переключаемых через медиа-запросы и класс body.tg-app:

1. Mobile (< 768px) — базовый

Sticky header (56px) + bottom nav (84px)
.desktop-sidebar { display: none }
Контент центрирован 16px padding
2. Tablet (768–1023px) — компактный сайдбар

Sidebar 72px (только иконки)
Скрыты mobile header/nav
app-layout__main { margin-left: 72px }
3. Desktop (≥1024px) — полный сайдбар

Sidebar 240px (иконки + лейблы + баланс)
Контент с max-width (1100/1000/680/800 в зависимости от страницы)
Hover-эффекты включены
Кастомный скроллбар
4. body.tg-app — Override для Telegram

Принудительно мобильный layout вне зависимости от ширины
Все !important overrides для left/right/max-width
Класс выставляется JS-ом при детекции Telegram WebApp
5. Large Desktop (≥1400px) — расширение

Увеличенные max-width
Дополнительные колонки в гридах
🧩 Компонентные секции (по BEM-блокам)

CSS организован по UI-блокам приложения:

Глобальные элементы

.bg-scene — фоновая сцена (картинка + orbs + grid)
.sticky-header — мобильный хедер
.bottom-nav — мобильная навигация (5 пунктов + центральный FAB Create)
.desktop-sidebar — сайдбар с балансом и навигацией
.app-layout / .app-layout__main — основной flex-контейнер
.toast-container / .toast — система уведомлений (success/error/warning/info)
.offline-banner — баннер офлайн-режима
.app-loading — экран загрузки
Главная страница

.content — обёртка scrollable-контента
.section-title — заголовки секций
.categories-grid / .category-card — карточки категорий (Chat/Image/Video/Audio)
.action-cards — упомянуты в респонсиве, но стили не найдены (возможно, генерируются)
.feed / .feed-item — лента истории генераций
Страница моделей

.models-page / .models-page__sticky — sticky хедер с поиском+фильтрами
.model-row / .model-row__star / .model-row__cost — строка модели
Чат (LLM)

.chat-page — контейнер чата с динамической высотой (через --tg-viewport-stable-height)
.chat-page__model-bar — селектор модели сверху
.chat-model-selector / .chat-model-dropdown — дропдаун выбора модели
.chat-msg / .chat-msg--user / .chat-msg--ai — пузыри сообщений
.chat-typing — анимация "печатает" (3 точки)
.chat-page__input-area — fixed зона ввода с attachments
.chat-attach-chip / .chat-attach-menu__item — аттачи
.chat-page__favorite-btn — кнопка избранного
Markdown (рендер ответов LLM)

.msg-markdown — обёртка
.msg-markdown__inline-code, .msg-markdown__link, .msg-markdown__table
.msg-code-block / .msg-code-block__copy / .msg-code-block__pre — блоки кода
.hljs-* — тёмная тема highlight.js (Material-like)
.msg-streaming-cursor — мигающий курсор стриминга
Генерация (Image/Video/Audio — универсальные стили)

.gen-page / .gen-page__header / .gen-page__results — лейаут страницы
.gen-page__model-select / .gen-page__model-list — выбор модели
.gen-page__input-area — зона ввода промпта (fixed bottom)
.gen-page__input-images / .gen-page__input-image-add — превью загруженных картинок
.gen-page__audio-file-preview / .gen-page__audio-file-chip — превью аудиофайлов
.gen-page__params-row / .gen-page__param-badge — быстрый просмотр параметров
.gen-page__example-btn, .gen-page__dice-btn (случайный сид)
Настройки генерации (модалка)

.gen-settings-modal (старая) — bottom-sheet
.gen-settings-overlay / .gen-settings-sheet (новая, универсальная) — с разным поведением на mobile/desktop
.gen-field / .gen-field__textarea / .gen-field__text-input — поля
.gen-field__chips / .gen-chip / .gen-chip--active — чипы выбора
.gen-field__seed-row / .gen-field__seed-input — управление сидом
.gen-range — кастомизированный range-slider (жёлтый thumb)
.gen-field__images-grid / .gen-field__image-thumb — сетка картинок
.gen-field__audio-preview / .gen-field__audio-chip — превью аудио
Медиа-результат

.media-result / .media-result--loading / .media-result--error / .media-result--done
.media-result__spinner, .media-result__progress-bar, .media-result__progress-fill — прогресс генерации
.media-result__image, .media-result__video, .media-result__audio — плееры
.media-result__actions / .media-result__action-btn — Download/Share/Favorite
.media-result__nav / .media-result__dots — карусель изображений (когда несколько)
.media-result__counter — счётчик (1/4)
Видео-страница (отдельная)

.video-gen-page — отдельный layout (не использует .gen-page)
.video-gen-page__gallery — грид сгенерированного видео
Страницы профиля и финансов

.profile-page — профиль (user info, balance, usage, plans, referral, stats, menu)

.profile-user, .profile-balance, .profile-section, .profile-usage, .profile-plan-card, .profile-plans, .profile-referral, .profile-stats-grid, .profile-menu-item

.topup-page — пополнение (packages, promo-code)

.topup-packages / .topup-package / .topup-package--popular / .topup-package--best — пакеты токенов

.topup-promo — промокоды

.currency-toggle — переключатель валюты (RUB/USD/...)

.transactions-page / .tx-row — история транзакций (с цветовой кодировкой типов: purchase/subscription/bonus/referral/spending/refund)

.subscription-page / .subscription-card (старая) / .sub-card (v2) — подписки

.sub-card__capabilities / .sub-card__free-models — что входит

История чатов

.chats-history / .chats-history__search / .chats-history__list
Избранное

.favorites-page / .favorites-filter / .favorite-card
Поддержка

.support-page / .support-page--ticket
.support-ticket-row — список тикетов
.support-new — форма создания тикета
.support-messages / .support-msg / .support-msg--user / .support-msg--admin — чат с поддержкой
.support-reply — поле ответа
Реферальная программа — ДВЕ версии (!) ⚠️

V1: .referral-page / .referral-rewards / .referral-share / .referral-stats
V2: .ref-page / .ref-link-card / .ref-cashback-card / .ref-instruction / .ref-modal (withdraw + history modals)
👉 Скорее всего одна из них устарела и должна быть удалена
🎭 Визуальный стиль — Glassmorphism

Доминирующий приём:

Css

background: var(--bg-glass);              /* rgba(18,18,22,0.72) */
backdrop-filter: var(--blur);             /* blur(20px) */
-webkit-backdrop-filter: var(--blur);
border: 1px solid var(--border-glass);    /* rgba(255,255,255,0.08) */
Применяется к:

Карточкам категорий
Feed items
Чат-пузырям AI
Хедерам/футерам (heavy variant)
Дропдаунам моделей
Модалкам настроек
Декоративные элементы:

.bg-scene__orb — 2 размытых пятна (orange + red) с анимацией orbFloat 12s
.bg-scene__grid — едва заметная сетка 40×40px (yellow rgba(...0.015))
.bg-scene__image — фоновая картинка (opacity 0.12, saturate 0.3)
🎬 Анимации

Css

@keyframes orbFloat       /* Плавающие пятна (12s) */
@keyframes fadeIn         /* Появление + translateY */
@keyframes skeletonShimmer /* Скелетоны */
@keyframes typingBounce   /* 3 точки "печатает" */
@keyframes toast-in       /* Тост сверху */
@keyframes blink          /* Курсор стриминга */
@keyframes modal-fade-in  /* Оверлей модалки */
@keyframes modal-slide-up /* Bottom-sheet */
@keyframes slideUp        /* Settings sheet */
@keyframes loading-slide  /* App loading bar */
@keyframes pulse          /* Logo loading */
@keyframes spin           /* Загрузка (универсальная) */
@keyframes slide-down     /* Offline banner */
@keyframes refFadeIn      /* Referral modal */
@keyframes refSlideUp     /* Referral modal slide */
Утилиты:

.fade-in.fade-in--1...5 — staggered появление (delay 0.05–0.4s)
.spin — кручение
.rotate-180 — переворот (для chevron)
📱 Адаптивность — стратегия

Mobile-first, но с серьёзными overrides

Брейкпоинт	Sidebar	Layout
< 768px	нет	mobile (header+bottom nav)
768–1023px	72px (icons only)	desktop layout
≥ 1024px	240px (full)	desktop layout
≥ 1400px	240px	расширенный (больше колонок)
body.tg-app	нет	forced mobile (!important)
Sticky/fixed элементы — координация с sidebar

На desktop fixed-элементы (chat-page__model-bar, gen-page__header, chat-page__input-area, toast-container и т.д.) сдвигаются на left: 72px или left: 240px, чтобы не залезать под сайдбар.

При body.tg-app все сдвиги отменяются через !important.

⚠️ Замеченные проблемы и техдолг

🔴 Критичное

Файл прислан ДВАЖДЫ в сообщении (от @import "tailwindcss" до конца). Это намёк на дублирование где-то в проекте, либо просто артефакт копипасты в чат. Нужно убедиться, что физически файл один.

Дублирующиеся секции внутри файла:

body.tg-app .sticky-header объявлен дважды (строки в районе "TELEGRAM APP" и "TELEGRAM APP OVERRIDES")
body.tg-app padding-top тоже дублируется
.chat-page__model-bar имеет два правила (одно — для grid-bar, другое уже в позиционировании)
.gen-page__model-list-info — два одинаковых правила подряд
Две версии Referral: .referral-* (старая) и .ref-* (новая). Одну надо удалить.

Две версии Subscription cards: .subscription-card* и .sub-card*. Аналогично.

Два варианта settings modal: .gen-settings-modal и .gen-settings-sheet/.gen-settings-overlay. Тоже похоже на миграцию.

🟡 Средне

@import "tailwindcss" без использования — Tailwind подключён, но классы практически не применяются. Это +десятки КБ в бандле зря.

Жёсткое !important для body.tg-app — много, но обосновано из-за override desktop-стилей.

.action-cards / .action-card — упоминаются только в респонсиве, базовые стили не найдены. Возможно, есть в другом файле или inline.

var(--accent-green) используется в .profile-plan-card__active, но переменная не объявлена в :root. Это баг — цвет будет browser default (transparent или unset).

Жёстко закодированные цвета местами вместо переменных:

#fbbf24 (вместо var(--accent-yellow) который #facc15) — два разных жёлтых!
#f87171, #4ade80, #60a5fa, #c084fc — вместо токенов
👉 Несогласованность палитры: #facc15 vs #fbbf24 — два жёлтых.

Хардкод размеров bottom: 72px / 59px для fixed элементов — если bottom nav изменится, поедет верстка.

🟢 Минор

Двойные пустые строки между правилами — раздувает файл, можно почистить.
Нет CSS-модулей / scoped-стилей — всё глобально, риск конфликтов классов.
Нет dark/light темы — только dark (но переменные позволяют легко добавить light).
🎯 Что это даёт для архитектуры

Стилевая система — монолит, не CSS-modules / не styled-components. Все компоненты используют глобальные классы.

Glassmorphism + dark + yellow accent — фирменный стиль "SPICHKI AI".

3 layout-режима (mobile / tablet sidebar / desktop sidebar) обрабатываются исключительно CSS — JS, скорее всего, только выставляет body.tg-app при детекте Telegram.

BEM строго соблюдается — все классы предсказуемые, легко искать в JSX.

Готовые "примитивы" из CSS (не из компонентов):

.gen-chip, .gen-range, .gen-field__textarea → переиспользуются на всех страницах генерации
.feed-item, .model-row → переиспользуются в истории/моделях/избранном
