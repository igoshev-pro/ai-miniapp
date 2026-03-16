// src/lib/data.ts

// --- Модели ---

export interface ModelItem {
  id: string
  name: string
  slug: string
  provider: string
  category: 'text' | 'image' | 'video' | 'audio'
  description: string
  cost: number
}

export const allModels: ModelItem[] = [
  // Текстовые - НОВЫЕ МОДЕЛИ
  { id: 't1',  name: 'GPT-OSS 120B',       slug: 'gpt-oss-120b',      provider: 'OpenRouter', category: 'text',  description: 'Open-source 117B MoE model',      cost: 1 },
  { id: 't2',  name: 'Claude Haiku 4.5',   slug: 'claude-haiku-4.5',  provider: 'Anthropic',  category: 'text',  description: 'Быстрая модель с расширенным мышлением', cost: 1 },
  { id: 't3',  name: 'DeepSeek V3.2',      slug: 'deepseek-v3.2',     provider: 'DeepSeek',   category: 'text',  description: 'Улучшенная версия с DSA и reasoning', cost: 1 },
  { id: 't4',  name: 'Grok 4.1 Fast',      slug: 'grok-4.1-fast',     provider: 'xAI',        category: 'text',  description: 'Быстрая версия Grok от xAI',      cost: 1 },
  { id: 't5',  name: 'Grok 4',             slug: 'grok-4',            provider: 'xAI',        category: 'text',  description: 'Флагманская reasoning модель',     cost: 3 },
  { id: 't6',  name: 'Perplexity Sonar',   slug: 'perplexity-sonar',  provider: 'Perplexity', category: 'text',  description: 'Поисковая модель с актуальными данными', cost: 1 },
  { id: 't7',  name: 'GPT-5.4',            slug: 'gpt-5.4',           provider: 'OpenAI',     category: 'text',  description: 'Новейшая модель OpenAI',          cost: 10 },
  { id: 't8',  name: 'Claude Opus 4.6',    slug: 'claude-opus-4.6',   provider: 'Anthropic',  category: 'text',  description: 'Самая мощная модель Anthropic',   cost: 15 },
  { id: 't9',  name: 'Claude Sonnet 4.6',  slug: 'claude-sonnet-4.6', provider: 'Anthropic',  category: 'text',  description: 'Балансированная модель Anthropic', cost: 8 },
  { id: 't10', name: 'Gemini 3.1 Pro',     slug: 'gemini-3.1-pro',    provider: 'Google',     category: 'text',  description: 'Продвинутая модель Google',       cost: 3 },
  { id: 't11', name: 'Gemini 3 Flash',     slug: 'gemini-3-flash',    provider: 'Google',     category: 'text',  description: 'Быстрая модель Google',           cost: 1 },
  
  // Существующие текстовые
  { id: 't12', name: 'ChatGPT 4o',         slug: 'gpt-4o',            provider: 'OpenAI',     category: 'text',  description: 'Мощная мультимодальная модель',   cost: 3 },
  { id: 't13', name: 'ChatGPT 4o Mini',    slug: 'gpt-4o-mini',       provider: 'OpenAI',     category: 'text',  description: 'Быстрая и экономичная',           cost: 1 },
  { id: 't14', name: 'Claude 3.5 Sonnet',  slug: 'claude-3.5-sonnet', provider: 'Anthropic',  category: 'text',  description: 'Лучший для кода и анализа',       cost: 3 },
  { id: 't15', name: 'Claude 3 Haiku',     slug: 'claude-3-haiku',    provider: 'Anthropic',  category: 'text',  description: 'Самая быстрая Claude',            cost: 1 },

  // Изображения - НОВЫЕ МОДЕЛИ
  { id: 'i1',  name: 'GPT-5 Image',        slug: 'gpt-5-image',       provider: 'OpenAI',       category: 'image', description: 'Новейший генератор OpenAI',       cost: 5 },
  { id: 'i2',  name: 'GPT Image 1.5 Lite', slug: 'gpt-image-1.5-lite', provider: 'OpenAI',      category: 'image', description: 'Облегчённая версия',              cost: 2 },
  { id: 'i3',  name: 'Midjourney',         slug: 'midjourney',        provider: 'Midjourney',   category: 'image', description: 'Лучший генератор изображений',    cost: 6 },
  { id: 'i4',  name: 'Midjourney Img2Img', slug: 'midjourney-img2img', provider: 'Midjourney',  category: 'image', description: 'Трансформация изображений',       cost: 6 },
  { id: 'i5',  name: 'Seedream 5.0 Lite',  slug: 'seedream-5-lite',   provider: 'ByteDance',    category: 'image', description: 'Быстрый генератор Seedream',      cost: 4 },
  { id: 'i6',  name: 'Imagen 4',           slug: 'imagen-4',          provider: 'Google',       category: 'image', description: 'Генератор от Google',             cost: 3 },
  { id: 'i7',  name: 'Flux 2',             slug: 'flux-2',            provider: 'Black Forest', category: 'image', description: 'Новая версия Flux',               cost: 4 },
  { id: 'i8',  name: 'Flux 2 Img2Img',     slug: 'flux-2-img2img',    provider: 'Black Forest', category: 'image', description: 'Flux для трансформации',          cost: 4 },
  { id: 'i9',  name: 'Nano Banana 2',      slug: 'nano-banana-2',     provider: 'Community',    category: 'image', description: 'Стандартная версия',              cost: 3 },
  { id: 'i10', name: 'Nano Banana Pro',    slug: 'nano-banana-pro',   provider: 'Community',    category: 'image', description: 'Продвинутая версия',              cost: 5 },

  // Видео - НОВЫЕ МОДЕЛИ
  { id: 'v1',  name: 'Veo 3.1 Fast',       slug: 'veo-3.1-fast',      provider: 'Google',    category: 'video', description: 'Быстрая версия Veo',           cost: 15 },
  { id: 'v2',  name: 'Veo 3.1 Pro',        slug: 'veo-3.1-pro',       provider: 'Google',    category: 'video', description: 'Премиум версия Veo',           cost: 30 },
  { id: 'v3',  name: 'Sora 2 Pro',         slug: 'sora-2-pro',        provider: 'OpenAI',    category: 'video', description: 'Флагманский генератор OpenAI', cost: 50 },
  { id: 'v4',  name: 'Sora 2',             slug: 'sora-2',            provider: 'OpenAI',    category: 'video', description: 'Стандартная версия Sora',      cost: 25 },
  { id: 'v5',  name: 'Sora 2 Img2Vid',     slug: 'sora-2-img2vid',    provider: 'OpenAI',    category: 'video', description: 'Анимация изображений',         cost: 28 },
  { id: 'v6',  name: 'Kling 3.0',          slug: 'kling-3.0',         provider: 'Kuaishou',  category: 'video', description: 'Генератор видео Kling',        cost: 10 },
  { id: 'v7',  name: 'Kling 3.0 Img2Vid',  slug: 'kling-3.0-img2vid', provider: 'Kuaishou',  category: 'video', description: 'Kling для анимации',           cost: 12 },
  { id: 'v8',  name: 'Runway Gen-3',       slug: 'runway',            provider: 'Runway',    category: 'video', description: 'Профессиональное видео',       cost: 15 },
  { id: 'v9',  name: 'Hailuo 2.3',         slug: 'hailuo-2.3-standard', provider: 'MiniMax', category: 'video', description: 'Стандартная версия',           cost: 10 },
  { id: 'v10', name: 'Hailuo 2.3 Pro',     slug: 'hailuo-2.3-pro',    provider: 'MiniMax',   category: 'video', description: 'Премиум версия',               cost: 15 },

  // Аудио
  { id: 'a1',  name: 'Suno V4',            slug: 'suno-v4',           provider: 'Suno',       category: 'audio', description: 'Генерация музыки и песен',     cost: 10 },
  { id: 'a2',  name: 'ElevenLabs TTS',     slug: 'elevenlabs-tts',    provider: 'ElevenLabs', category: 'audio', description: 'Реалистичный голос и TTS',      cost: 5 },
]

export interface ModelCategory {
  id: string
  label: string
  count: number
}

export const modelCategories: ModelCategory[] = [
  { id: 'text',  label: 'Текст',       count: allModels.filter((m) => m.category === 'text').length },
  { id: 'image', label: 'Картинки',    count: allModels.filter((m) => m.category === 'image').length },
  { id: 'video', label: 'Видео',       count: allModels.filter((m) => m.category === 'video').length },
  { id: 'audio', label: 'Аудио',       count: allModels.filter((m) => m.category === 'audio').length },
]

// --- Данные для ленты чатов ---

export interface ChatItem {
  id: string
  title: string
  model: string
  preview: string
  time: string
  date: 'today' | 'yesterday' | 'earlier'
  iconKey: 'message' | 'image' | 'video' | 'audio'
  isFavorite: boolean
}

export const dateOrder = ['today', 'yesterday', 'earlier'] as const

export const dateLabels: Record<string, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  earlier: 'Ранее',
}

export const chatFeedData: ChatItem[] = [
  {
    id: 'c1',
    title: 'Написать бизнес-план',
    model: 'ChatGPT 4o',
    preview: 'Помоги составить бизнес-план для стартапа...',
    time: '14:32',
    date: 'today',
    iconKey: 'message',
    isFavorite: true,
  },
  {
    id: 'c2',
    title: 'Логотип для приложения',
    model: 'Midjourney',
    preview: 'Минималистичный логотип в стиле...',
    time: '12:15',
    date: 'today',
    iconKey: 'image',
    isFavorite: false,
  },
  {
    id: 'c3',
    title: 'Рекламный ролик',
    model: 'Sora',
    preview: 'Сгенерируй 10-секундный ролик...',
    time: '11:03',
    date: 'today',
    iconKey: 'video',
    isFavorite: false,
  },
  {
    id: 'c4',
    title: 'Анализ кода на Python',
    model: 'Claude 3.5 Sonnet',
    preview: 'Проверь этот код на ошибки и оптимизируй...',
    time: '09:45',
    date: 'today',
    iconKey: 'message',
    isFavorite: true,
  },
  {
    id: 'c5',
    title: 'Джингл для подкаста',
    model: 'Suno V4',
    preview: 'Весёлая мелодия для интро подкаста...',
    time: '18:20',
    date: 'yesterday',
    iconKey: 'audio',
    isFavorite: false,
  },
  {
    id: 'c6',
    title: 'Перевод документа',
    model: 'Gemini 1.5 Pro',
    preview: 'Переведи этот контракт с английского...',
    time: '16:55',
    date: 'yesterday',
    iconKey: 'message',
    isFavorite: false,
  },
  {
    id: 'c7',
    title: 'Иллюстрация к статье',
    model: 'DALL-E 3',
    preview: 'Нарисуй иллюстрацию для блога о...',
    time: '14:30',
    date: 'yesterday',
    iconKey: 'image',
    isFavorite: true,
  },
  {
    id: 'c8',
    title: 'Презентация продукта',
    model: 'ChatGPT 4o',
    preview: 'Подготовь слайды для презентации...',
    time: '10:12',
    date: 'yesterday',
    iconKey: 'message',
    isFavorite: false,
  },
  {
    id: 'c9',
    title: 'Исследование рынка',
    model: 'Perplexity Sonar',
    preview: 'Найди данные по рынку EdTech в России...',
    time: '15:40',
    date: 'earlier',
    iconKey: 'message',
    isFavorite: false,
  },
  {
    id: 'c10',
    title: 'Промо-видео',
    model: 'Runway Gen-3',
    preview: 'Создай короткое видео для Instagram...',
    time: '11:25',
    date: 'earlier',
    iconKey: 'video',
    isFavorite: true,
  },
  {
    id: 'c11',
    title: 'Озвучка статьи',
    model: 'ElevenLabs',
    preview: 'Озвучь этот текст мужским голосом...',
    time: '09:00',
    date: 'earlier',
    iconKey: 'audio',
    isFavorite: false,
  },
  {
    id: 'c12',
    title: 'Дебаг REST API',
    model: 'DeepSeek V3',
    preview: 'Помоги разобраться почему эндпоинт...',
    time: '22:15',
    date: 'earlier',
    iconKey: 'message',
    isFavorite: false,
  },
]

export interface CategoryCardData {
  id: string
  title: string
  description: string
  coverUrl: string
  modelCount: number
}

export const categoriesData: CategoryCardData[] = [
  {
    id: 'text',
    title: 'Текстовые ИИ',
    description: 'ChatGPT, Claude, Gemini и другие',
    coverUrl: '/covers/text.webp',
    modelCount: allModels.filter((m) => m.category === 'text').length,
  },
  {
    id: 'image',
    title: 'Генерация картинок',
    description: 'Midjourney, DALL-E, Flux и другие',
    coverUrl: '/covers/image.webp',
    modelCount: allModels.filter((m) => m.category === 'image').length,
  },
  {
    id: 'video',
    title: 'Генерация видео',
    description: 'Sora, Kling, Runway и другие',
    coverUrl: '/covers/video.webp',
    modelCount: allModels.filter((m) => m.category === 'video').length,
  },
  {
    id: 'audio',
    title: 'Генерация аудио',
    description: 'Suno, ElevenLabs',
    coverUrl: '/covers/audio.webp',
    modelCount: allModels.filter((m) => m.category === 'audio').length,
  },
]