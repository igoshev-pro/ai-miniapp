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
  // Текстовые
  { id: 't1',  name: 'ChatGPT 4o',        slug: 'gpt-4o',            provider: 'OpenAI',     category: 'text',  description: 'Мощная мультимодальная модель',   cost: 3 },
  { id: 't2',  name: 'ChatGPT 4o Mini',    slug: 'gpt-4o-mini',       provider: 'OpenAI',     category: 'text',  description: 'Быстрая и экономичная',           cost: 1 },
  { id: 't3',  name: 'Claude 3.5 Sonnet',  slug: 'claude-3.5-sonnet', provider: 'Anthropic',  category: 'text',  description: 'Лучший для кода и анализа',       cost: 3 },
  { id: 't4',  name: 'Claude 3 Haiku',     slug: 'claude-3-haiku',    provider: 'Anthropic',  category: 'text',  description: 'Самая быстрая Claude',            cost: 1 },
  { id: 't5',  name: 'Gemini 2.0 Flash',   slug: 'gemini-2.0-flash',  provider: 'Google',     category: 'text',  description: 'Молниеносные ответы',             cost: 1 },
  { id: 't6',  name: 'Gemini 1.5 Pro',     slug: 'gemini-1.5-pro',    provider: 'Google',     category: 'text',  description: 'Длинный контекст до 1М токенов',  cost: 3 },
  { id: 't7',  name: 'DeepSeek V3',        slug: 'deepseek-v3',       provider: 'DeepSeek',   category: 'text',  description: 'Открытая модель, топ бенчмарки',   cost: 1 },
  { id: 't8',  name: 'DeepSeek R1',        slug: 'deepseek-r1',       provider: 'DeepSeek',   category: 'text',  description: 'Reasoning модель',                cost: 2 },
  { id: 't9',  name: 'Grok 3',             slug: 'grok-3',            provider: 'xAI',        category: 'text',  description: 'Модель от Илона Маска',           cost: 3 },
  { id: 't10', name: 'Perplexity Sonar',   slug: 'perplexity-sonar',  provider: 'Perplexity', category: 'text',  description: 'Поиск + генерация с источниками', cost: 2 },
  { id: 't11', name: 'Qwen 2.5 72B',       slug: 'qwen-2.5-72b',     provider: 'Alibaba',    category: 'text',  description: 'Мощная открытая модель',          cost: 2 },

  // Изображения
  { id: 'i1', name: 'Midjourney',          slug: 'midjourney',          provider: 'Midjourney',   category: 'image', description: 'Лучшее качество арта',          cost: 10 },
  { id: 'i2', name: 'DALL-E 3',            slug: 'dall-e-3',           provider: 'OpenAI',       category: 'image', description: 'Точное следование промпту',      cost: 5 },
  { id: 'i3', name: 'ChatGPT Images',      slug: 'chatgpt-images',     provider: 'OpenAI',       category: 'image', description: 'Генерация через ChatGPT',        cost: 5 },
  { id: 'i4', name: 'Flux Pro',            slug: 'flux-pro',           provider: 'Black Forest', category: 'image', description: 'Фотореалистичные изображения',   cost: 5 },
  { id: 'i5', name: 'Stable Diffusion XL', slug: 'stable-diffusion-xl', provider: 'Stability',  category: 'image', description: 'Гибкая настройка стилей',        cost: 3 },
  { id: 'i6', name: 'Seedream',            slug: 'seedream',           provider: 'ByteDance',    category: 'image', description: 'Новая модель от ByteDance',       cost: 5 },
  { id: 'i7', name: 'Imagen 3',            slug: 'imagen-3',          provider: 'Google',       category: 'image', description: 'Топовое качество от Google',      cost: 5 },
  { id: 'i8', name: 'Nano Banana',         slug: 'nano-banana',        provider: 'Community',    category: 'image', description: 'Быстрая генерация',              cost: 5 },

  // Видео
  { id: 'v1', name: 'Sora',       slug: 'sora',       provider: 'OpenAI',    category: 'video', description: 'Кинематографическое видео',   cost: 30 },
  { id: 'v2', name: 'Kling 1.6',  slug: 'kling-1.6',  provider: 'Kuaishou', category: 'video', description: 'Реалистичные движения',       cost: 20 },
  { id: 'v3', name: 'Runway Gen-3', slug: 'runway-gen3', provider: 'Runway', category: 'video', description: 'Профессиональное видео',      cost: 25 },
  { id: 'v4', name: 'Veo 2',      slug: 'veo-2',      provider: 'Google',   category: 'video', description: 'Видео от Google DeepMind',    cost: 25 },
  { id: 'v5', name: 'Hailuo',     slug: 'hailuo',     provider: 'MiniMax',  category: 'video', description: 'Быстрая генерация видео',     cost: 15 },
  { id: 'v6', name: 'Luma Ray2',  slug: 'luma-ray2',  provider: 'Luma AI',  category: 'video', description: 'Dream Machine для видео',     cost: 20 },
  { id: 'v7', name: 'Pika 2.0',   slug: 'pika-2.0',   provider: 'Pika',     category: 'video', description: 'Креативные видео-эффекты',    cost: 15 },

  // Аудио
  { id: 'a1', name: 'Suno V4',     slug: 'suno-v4',    provider: 'Suno',       category: 'audio', description: 'Генерация музыки и песен', cost: 10 },
  { id: 'a2', name: 'ElevenLabs',  slug: 'elevenlabs', provider: 'ElevenLabs', category: 'audio', description: 'Реалистичный голос и TTS',  cost: 5 },
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
    coverUrl: '/covers/text.png',
    modelCount: allModels.filter((m) => m.category === 'text').length,
  },
  {
    id: 'image',
    title: 'Генерация картинок',
    description: 'Midjourney, DALL-E, Flux и другие',
    coverUrl: '/covers/image.png',
    modelCount: allModels.filter((m) => m.category === 'image').length,
  },
  {
    id: 'video',
    title: 'Генерация видео',
    description: 'Sora, Kling, Runway и другие',
    coverUrl: '/covers/video.png',
    modelCount: allModels.filter((m) => m.category === 'video').length,
  },
  {
    id: 'audio',
    title: 'Генерация аудио',
    description: 'Suno, ElevenLabs',
    coverUrl: '/covers/audio.png',
    modelCount: allModels.filter((m) => m.category === 'audio').length,
  },
]