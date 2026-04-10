export interface ModelItem {
  id: string
  name: string
  slug: string
  provider: string
  category: 'text' | 'image' | 'video' | 'audio'
  description: string
  cost: number          // минимальная стоимость в спичках (от)
  hasVariants?: boolean // true = показывать "от X 🔥"
}

export const allModels: ModelItem[] = [
  // ═══════════════════════════════════════
  // ТЕКСТОВЫЕ (11 моделей)
  // ═══════════════════════════════════════

  // --- Evolink ---
  { id: 't1', name: 'GPT-5.4',           slug: 'gpt-5.4',           provider: 'OpenAI',     category: 'text', description: 'Новейшая флагманская модель OpenAI',     cost: 0.20, hasVariants: true },
  { id: 't2', name: 'Claude Sonnet 4.6', slug: 'claude-sonnet-4.6', provider: 'Anthropic',  category: 'text', description: 'Балансированная модель Anthropic',       cost: 0.20, hasVariants: true },
  { id: 't3', name: 'Claude Opus 4.6',   slug: 'claude-opus-4.6',   provider: 'Anthropic',  category: 'text', description: 'Самая мощная модель Anthropic',          cost: 0.20, hasVariants: true },

  // --- OpenRouter ---
  { id: 't4',  name: 'GPT-OSS 120B',      slug: 'gpt-oss-120b',      provider: 'OpenRouter',  category: 'text', description: 'Open-source 117B MoE, бесплатная',     cost: 0.10, hasVariants: true },
  { id: 't5',  name: 'Claude Haiku 4.5',   slug: 'claude-haiku-4.5',  provider: 'Anthropic',   category: 'text', description: 'Быстрая модель с расширенным мышлением', cost: 0.20, hasVariants: true },
  { id: 't6',  name: 'DeepSeek V3.2',      slug: 'deepseek-v3.2',     provider: 'DeepSeek',    category: 'text', description: 'Улучшенная версия с DSA и reasoning',    cost: 0.10, hasVariants: true },
  { id: 't7',  name: 'Grok 4.1 Fast',      slug: 'grok-4.1-fast',     provider: 'xAI',         category: 'text', description: 'Быстрая версия Grok от xAI',            cost: 0.10, hasVariants: true },
  { id: 't8',  name: 'Grok 4',             slug: 'grok-4',            provider: 'xAI',         category: 'text', description: 'Флагманская reasoning модель',           cost: 0.40, hasVariants: true },
  { id: 't9',  name: 'Perplexity Sonar',   slug: 'perplexity-sonar',  provider: 'Perplexity',  category: 'text', description: 'Поисковая модель с актуальными данными', cost: 0.10, hasVariants: true },

  // --- KIE ---
  { id: 't10', name: 'Gemini 3.1 Pro',     slug: 'gemini-3.1-pro',    provider: 'Google',      category: 'text', description: 'Продвинутая модель Google',              cost: 0.10, hasVariants: true },
  { id: 't11', name: 'Gemini 3 Flash',     slug: 'gemini-3-flash',    provider: 'Google',      category: 'text', description: 'Быстрая модель Google',                 cost: 0.30 },

  // ═══════════════════════════════════════
  // ИЗОБРАЖЕНИЯ (10 моделей)
  // ═══════════════════════════════════════

  // --- Evolink ---
  { id: 'i1', name: 'GPT Image 1.5 Lite',  slug: 'gpt-image-1.5-lite', provider: 'OpenAI',       category: 'image', description: 'Облегчённая версия GPT Image',     cost: 1.20 },

  // --- KIE ---
  { id: 'i2', name: 'Midjourney',           slug: 'midjourney',         provider: 'Midjourney',   category: 'image', description: 'Лучший генератор изображений',      cost: 1.30, hasVariants: true },
  { id: 'i3', name: 'Nano Banana 2',        slug: 'nano-banana-2',      provider: 'Community',    category: 'image', description: 'Стандартная версия, 1K–4K',         cost: 3.30, hasVariants: true },
  { id: 'i4', name: 'Nano Banana Pro',      slug: 'nano-banana-pro',    provider: 'Community',    category: 'image', description: 'Продвинутая версия, до 4K',         cost: 6.00, hasVariants: true },
  { id: 'i5', name: 'Seedream 5.0 Lite',    slug: 'seedream-5-lite',    provider: 'ByteDance',    category: 'image', description: 'Быстрый генератор Seedream',        cost: 1.60 },
  { id: 'i6', name: 'Flux 2',               slug: 'flux-2',             provider: 'Black Forest', category: 'image', description: 'Новая версия Flux, 1K–2K',          cost: 1.80, hasVariants: true },
  { id: 'i7', name: 'Imagen 4',             slug: 'imagen-4',           provider: 'Google',       category: 'image', description: 'Генератор от Google',               cost: 1.20 },

  // --- OpenRouter ---
  { id: 'i8', name: 'GPT-5 Image',          slug: 'gpt-5-image',        provider: 'OpenAI',       category: 'image', description: 'Новейший генератор OpenAI',         cost: 0.70, hasVariants: true },

  // --- Img2Img ---
  { id: 'i9',  name: 'Midjourney Img2Img',  slug: 'midjourney-img2img', provider: 'Midjourney',   category: 'image', description: 'Трансформация изображений',         cost: 1.30 },
  { id: 'i10', name: 'Flux 2 Img2Img',      slug: 'flux-2-img2img',     provider: 'Black Forest', category: 'image', description: 'Flux для трансформации',            cost: 5.00 },

  // ═══════════════════════════════════════
  // ВИДЕО (11 моделей)
  // ═══════════════════════════════════════

  // --- Evolink ---
  { id: 'v1',  name: 'Veo 3.1 Fast',         slug: 'veo-3.1-fast',         provider: 'Google',    category: 'video', description: 'Быстрая версия Veo, 720p–4K',       cost: 15.00, hasVariants: true },
  { id: 'v2',  name: 'Veo 3.1 Pro',          slug: 'veo-3.1-pro',          provider: 'Google',    category: 'video', description: 'Премиум версия Veo, до 4K',          cost: 75.00, hasVariants: true },
  { id: 'v3',  name: 'Sora 2',               slug: 'sora-2',               provider: 'OpenAI',    category: 'video', description: 'Текст → видео, 10–15 сек',           cost: 13.00, hasVariants: true },
  { id: 'v4',  name: 'Sora 2 Pro',           slug: 'sora-2-pro',           provider: 'OpenAI',    category: 'video', description: 'Премиум HD/Standard, 15–25 сек',     cost: 86.00, hasVariants: true },

  // --- Evolink Kling (верхняя таблица) ---
  { id: 'v5',  name: 'Kling 3.0',            slug: 'kling-3.0',            provider: 'Kuaishou',  category: 'video', description: 'Видео со звуком, 720–1080p',          cost: 4.30, hasVariants: true },

  // --- KIE Kling (нижняя таблица) ---
  { id: 'v6',  name: 'Kling 3.0 Motion',     slug: 'kling-3.0-motion',     provider: 'Kuaishou',  category: 'video', description: 'Motion control, 720–1080p',          cost: 9.00, hasVariants: true },

  // --- KIE ---
  { id: 'v7',  name: 'Runway Gen-3',         slug: 'runway',               provider: 'Runway',    category: 'video', description: 'Кинематографичное видео, 5–10с',     cost: 6.00, hasVariants: true },
  { id: 'v8',  name: 'Hailuo 2.3 Std',       slug: 'hailuo-2.3-standard',  provider: 'MiniMax',   category: 'video', description: 'Текст → видео, бюджетный',           cost: 9.00, hasVariants: true },
  { id: 'v9',  name: 'Hailuo 2.3 Pro',       slug: 'hailuo-2.3-pro',       provider: 'MiniMax',   category: 'video', description: 'Улучшенное качество',                cost: 14.00, hasVariants: true },

  // ═══════════════════════════════════════
  // АУДИО (6 моделей)
  // ═══════════════════════════════════════

  // --- KIE: Suno ---
  { id: 'a1', name: 'Suno V4',                slug: 'suno-v4',                    provider: 'Suno',       category: 'audio', description: 'Генерация музыки и песен',                cost: 4.00, hasVariants: true },

  // --- KIE: ElevenLabs ---
  { id: 'a2', name: 'ElevenLabs TTS Turbo',   slug: 'elevenlabs-tts-turbo',       provider: 'ElevenLabs', category: 'audio', description: 'Быстрая озвучка текста',                 cost: 2.70, hasVariants: true },
  { id: 'a3', name: 'ElevenLabs TTS Multi',   slug: 'elevenlabs-tts-multilingual', provider: 'ElevenLabs', category: 'audio', description: 'Многоязычная озвучка текста',             cost: 5.40, hasVariants: true },
  { id: 'a4', name: 'ElevenLabs Dialogue',    slug: 'elevenlabs-dialogue',         provider: 'ElevenLabs', category: 'audio', description: 'Генерация диалогов с разными голосами',   cost: 6.70, hasVariants: true },
  { id: 'a5', name: 'ElevenLabs Isolation',   slug: 'elevenlabs-isolation',        provider: 'ElevenLabs', category: 'audio', description: 'Удаление шума, изоляция голоса',          cost: 0.10 },
  { id: 'a6', name: 'ElevenLabs STT',         slug: 'elevenlabs-stt',              provider: 'ElevenLabs', category: 'audio', description: 'Распознавание речи в текст',              cost: 2.00 },
]

export interface ModelCategory {
  id: string
  label: string
  count: number
}

export const modelCategories: ModelCategory[] = [
  { id: 'text',  label: 'Текст',    count: allModels.filter((m) => m.category === 'text').length },
  { id: 'image', label: 'Картинки', count: allModels.filter((m) => m.category === 'image').length },
  { id: 'video', label: 'Видео',    count: allModels.filter((m) => m.category === 'video').length },
  { id: 'audio', label: 'Аудио',    count: allModels.filter((m) => m.category === 'audio').length },
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
    model: 'GPT-5.4',
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
    model: 'Sora 2',
    preview: 'Сгенерируй 10-секундный ролик...',
    time: '11:03',
    date: 'today',
    iconKey: 'video',
    isFavorite: false,
  },
  {
    id: 'c4',
    title: 'Анализ кода на Python',
    model: 'Claude Sonnet 4.6',
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
    model: 'Gemini 3.1 Pro',
    preview: 'Переведи этот контракт с английского...',
    time: '16:55',
    date: 'yesterday',
    iconKey: 'message',
    isFavorite: false,
  },
  {
    id: 'c7',
    title: 'Иллюстрация к статье',
    model: 'GPT-5 Image',
    preview: 'Нарисуй иллюстрацию для блога о...',
    time: '14:30',
    date: 'yesterday',
    iconKey: 'image',
    isFavorite: true,
  },
  {
    id: 'c8',
    title: 'Презентация продукта',
    model: 'Claude Opus 4.6',
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
    model: 'ElevenLabs TTS Turbo',
    preview: 'Озвучь этот текст мужским голосом...',
    time: '09:00',
    date: 'earlier',
    iconKey: 'audio',
    isFavorite: false,
  },
  {
    id: 'c12',
    title: 'Дебаг REST API',
    model: 'DeepSeek V3.2',
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
    description: 'GPT-5.4, Claude, Gemini и другие',
    coverUrl: '/covers/text.webp',
    modelCount: allModels.filter((m) => m.category === 'text').length,
  },
  {
    id: 'image',
    title: 'Генерация картинок',
    description: 'Midjourney, Flux, GPT Image и другие',
    coverUrl: '/covers/image.webp',
    modelCount: allModels.filter((m) => m.category === 'image').length,
  },
  {
    id: 'video',
    title: 'Генерация видео',
    description: 'Sora, Kling, Runway, Veo и другие',
    coverUrl: '/covers/video.webp',
    modelCount: allModels.filter((m) => m.category === 'video').length,
  },
  {
    id: 'audio',
    title: 'Генерация аудио',
    description: 'Suno, ElevenLabs TTS, Dialogue, STT',
    coverUrl: '/covers/audio.webp',
    modelCount: allModels.filter((m) => m.category === 'audio').length,
  },
]