📦 Контекст: Frontend (Next.js) — Блок 1: Общие настройки и конфигурация

🎯 Назначение проекта

AI Hub Mini App — фронтенд-приложение на Next.js, работающее в двух режимах:

Telegram Mini App — встроенное в Telegram WebApp
Веб-сайт-агрегатор нейросетей — самостоятельный сайт
Платформа предоставляет единый интерфейс для генерации:

📝 Текста (OpenAI и др.)
🖼️ Изображений
🎬 Видео
🎵 Аудио (ElevenLabs TTS/STT/изоляция/эффекты, Suno музыка)
🛠️ Технологический стек

Core

Технология	Версия	Назначение
Next.js	16.1.6	SSR/SSG фреймворк, App Router
React	19.2.3	UI библиотека
TypeScript	^5	Типизация
Node.js	20-alpine	Runtime (Docker)
State & Data

Библиотека	Версия	Назначение
Zustand	^5.0.11	Глобальный state management
Axios	^1.13.6	HTTP-клиент для REST API
socket.io-client	^4.8.3	WebSocket для realtime-статусов генерации
UI & Styling

Библиотека	Версия	Назначение
Tailwind CSS	^4.2.1	Утилитарные стили (через @tailwindcss/postcss)
lucide-react	^0.577.0	Иконки
react-markdown	^10.1.0	Рендер markdown (ответы LLM)
remark-gfm	^4.0.1	GitHub Flavored Markdown
rehype-highlight	^7.0.2	Подсветка кода
highlight.js	^11.11.1	Темы подсветки
⚙️ Конфигурация проекта

next.config.ts

Ts

output: 'standalone'              // → Docker-сборка (минимальный образ)
images.remotePatterns: '**'       // → разрешены любые https-источники картинок
eslint.ignoreDuringBuilds: true   // → ESLint не блокирует билд
typescript.ignoreBuildErrors: true // → TS-ошибки не блокируют билд (⚠️ риск)
tsconfig.json

Алиас: @/* → ./src/* (исходники в src/)
Target: ES2017
Strict mode: включён
JSX: react-jsx
Module resolution: bundler (для Next.js)
eslint.config.mjs

Конфиг на flat-config (новый формат ESLint 9+)
Базируется на eslint-config-next (core-web-vitals + typescript)
Игнорирует .next/, out/, build/, next-env.d.ts
postcss.config.mjs

Единственный плагин: @tailwindcss/postcss (Tailwind v4 — без tailwind.config)
🌍 Переменные окружения (build-time)

Передаются как ARG в Dockerfile и становятся ENV (доступны на клиенте через NEXT_PUBLIC_*):

Переменная	Назначение
NEXT_PUBLIC_API_URL	URL backend REST API
NEXT_PUBLIC_WS_URL	URL WebSocket-сервера
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME	Username Telegram-бота (для deeplink, MiniApp)
⚠️ Все NEXT_PUBLIC_* встраиваются в бандл на этапе билда — изменить без пересборки нельзя.

🐳 Docker (multi-stage build)

Stage 1: builder

База: node:20-alpine
Установка зависимостей через yarn install --frozen-lockfile
Сборка: yarn build → создаёт .next/standalone + .next/static
Stage 2: runner (production)

База: node:20-alpine
Непривилегированный пользователь: nextjs:nodejs (UID/GID 1001)
Копируется только .next/standalone, .next/static, public
Порт: 3000, hostname: 0.0.0.0
Запуск: node server.js (standalone-сервер Next.js)
📜 Скрипты (package.json)

Bash

yarn dev      # Локальная разработка (next dev)
yarn build    # Production-сборка
yarn start    # Запуск production-билда
yarn lint     # Проверка ESLint
⚠️ Важные особенности и риски

TS-ошибки игнорируются при билде (ignoreBuildErrors: true) — нужен жёсткий контроль типов в dev.
ESLint игнорируется при билде — тоже только в dev.
App Router (предположительно, нужно подтвердить структурой src/app/).
Standalone-режим Next.js — для контейнеризации.
Yarn как пакетный менеджер (не npm/pnpm) — есть yarn.lock.
❓ Что нужно для следующих блоков контекста

Чтобы продолжить детализацию фронта, понадобятся следующие группы файлов:

Блок 2: Структура проекта и роутинг

Дерево src/ (особенно src/app/)
layout.tsx, page.tsx корневые
Структура страниц (audio, video, image, text)

Блок 3: State Management (Zustand)

Все сторы из src/stores/ или src/store/
useUser, useFavorites, useGeneration (это хуки или сторы?)
Блок 4: API-слой

axios инстанс / конфигурация
Сервисы для запросов (generation, user, favorites)
Типы ответов backend
Блок 5: WebSocket

Файл инициализации socket.io
Логика подписки/отписки на события генерации
Блок 6: Telegram WebApp интеграция

Контекст/провайдер Telegram
Типы window.Telegram.WebApp
Логика инициализации
Блок 7: UI-компоненты

MediaResult.tsx
AudioGenerationPage.tsx
Общие компоненты (кнопки, плеер, модалки)
Блок 8: Хуки

useGeneration, useUser, useFavorites — полные исходники
Блок 9: Стили

globals.css
Tailwind кастомизация (если есть)
