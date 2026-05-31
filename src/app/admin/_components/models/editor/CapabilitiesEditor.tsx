'use client'

type Caps = {
  acceptsImages?: boolean
  acceptsVideo?: boolean
  acceptsAudio?: boolean
  maxInputImages?: number
  mimeTypes?: string[]
}

interface Props {
  /** inputCapabilities — что модель ПРИНИМАЕТ на вход (картинки, видео, аудио) */
  value: Caps
  onChange: (v: Caps) => void
  /** capabilities — что модель УМЕЕТ (vision, web_search, reasoning и т.д.) */
  capabilities?: string[]
  onCapabilitiesChange?: (v: string[]) => void
}

/**
 * 📌 Популярные возможности моделей.
 * Каждая = строка в массиве `capabilities` модели.
 * Фронт использует их для отображения иконок и фильтров.
 */
const KNOWN_CAPABILITIES: Array<{
  key: string
  label: string
  icon: string
  description: string
  group: 'core' | 'feature'
}> = [
  // Технические возможности
  { key: 'streaming', label: 'Streaming', icon: '⚡', description: 'Потоковая выдача токенов (SSE)', group: 'core' },
  { key: 'function_calling', label: 'Function Calling', icon: '🔧', description: 'Вызов функций / tools', group: 'core' },

  // Видимые пользователю фичи
  { key: 'vision', label: 'Vision', icon: '👁', description: 'Понимает картинки во входе', group: 'feature' },
  { key: 'web_search', label: 'Web Search', icon: '🌐', description: 'Поиск в интернете (актуальные данные)', group: 'feature' },
  { key: 'reasoning', label: 'Reasoning', icon: '🧠', description: 'Глубокие рассуждения / chain of thought', group: 'feature' },
  { key: 'thinking', label: 'Thinking', icon: '💭', description: 'Расширенное мышление (Claude Extended Thinking)', group: 'feature' },
  { key: 'citations', label: 'Citations', icon: '📎', description: 'Возвращает ссылки на источники', group: 'feature' },
]

export function CapabilitiesEditor({
  value,
  onChange,
  capabilities = [],
  onCapabilitiesChange,
}: Props) {
  const v = value ?? {}
  const set = (k: keyof Caps, val: any) => onChange({ ...v, [k]: val })

  const caps = Array.isArray(capabilities) ? capabilities : []

  const hasCapability = (key: string) => caps.includes(key)

  const toggleCapability = (key: string) => {
    if (!onCapabilitiesChange) return
    const next = hasCapability(key)
      ? caps.filter((c) => c !== key)
      : [...caps, key]
    onCapabilitiesChange(next)
  }

  // Кастомные capabilities (не из KNOWN_CAPABILITIES) — редактируются через текстовое поле
  const knownKeys = KNOWN_CAPABILITIES.map((c) => c.key)
  const customCaps = caps.filter((c) => !knownKeys.includes(c))

  const setCustomCaps = (input: string) => {
    if (!onCapabilitiesChange) return
    const customList = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // Сохраняем известные + добавляем кастомные
    const known = caps.filter((c) => knownKeys.includes(c))
    onCapabilitiesChange([...known, ...customList])
  }

  const coreCapabilities = KNOWN_CAPABILITIES.filter((c) => c.group === 'core')
  const featureCapabilities = KNOWN_CAPABILITIES.filter((c) => c.group === 'feature')

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* СЕКЦИЯ 1: Возможности модели (capabilities)                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {onCapabilitiesChange && (
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              🎯 Возможности модели
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Что модель умеет. Используется фронтом для иконок и фильтров.
            </p>
          </div>

          {/* Видимые пользователю фичи */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">
              Видимые в UI
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {featureCapabilities.map((cap) => (
                <CapabilityToggle
                  key={cap.key}
                  icon={cap.icon}
                  label={cap.label}
                  description={cap.description}
                  active={hasCapability(cap.key)}
                  onToggle={() => toggleCapability(cap.key)}
                />
              ))}
            </div>
          </div>

          {/* Технические */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">
              Технические
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coreCapabilities.map((cap) => (
                <CapabilityToggle
                  key={cap.key}
                  icon={cap.icon}
                  label={cap.label}
                  description={cap.description}
                  active={hasCapability(cap.key)}
                  onToggle={() => toggleCapability(cap.key)}
                />
              ))}
            </div>
          </div>

          {/* Кастомные capabilities */}
          <div>
            <label className="text-sm text-zinc-300 block mb-2">
              Дополнительные (через запятую)
            </label>
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-full focus:border-indigo-500 outline-none"
              placeholder="multilingual, image_editing, voice_selection"
              defaultValue={customCaps.join(', ')}
              onBlur={(e) => setCustomCaps(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Произвольные строки, не входящие в стандартный список выше
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* СЕКЦИЯ 2: Входные данные (inputCapabilities)                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4 border-t border-zinc-800 pt-6">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            📥 Что принимает на вход
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Какие типы файлов можно загрузить пользователю
          </p>
        </div>

        <Row label="Принимает изображения">
          <input
            type="checkbox"
            checked={!!v.acceptsImages}
            onChange={(e) => set('acceptsImages', e.target.checked)}
            className="scale-125"
          />
        </Row>
        <Row label="Принимает видео">
          <input
            type="checkbox"
            checked={!!v.acceptsVideo}
            onChange={(e) => set('acceptsVideo', e.target.checked)}
            className="scale-125"
          />
        </Row>
        <Row label="Принимает аудио">
          <input
            type="checkbox"
            checked={!!v.acceptsAudio}
            onChange={(e) => set('acceptsAudio', e.target.checked)}
            className="scale-125"
          />
        </Row>

        <div>
          <label className="text-sm text-zinc-300 block mb-2">
            Макс. количество входных изображений
          </label>
          <input
            type="number"
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-40 focus:border-indigo-500 outline-none"
            value={v.maxInputImages ?? 0}
            onChange={(e) => set('maxInputImages', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-zinc-300 block mb-2">
            Разрешённые MIME-типы
          </label>
          <input
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-full focus:border-indigo-500 outline-none"
            placeholder="image/png, image/jpeg, video/mp4"
            value={Array.isArray(v.mimeTypes) ? v.mimeTypes.join(', ') : ''}
            onChange={(e) =>
              set(
                'mimeTypes',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
          <p className="text-xs text-zinc-500 mt-1">через запятую</p>
        </div>
      </section>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────

function Row({ label, children }: any) {
  return (
    <label className="flex items-center justify-between bg-zinc-800/40 border border-zinc-700/50 rounded-lg px-4 py-3 cursor-pointer hover:bg-zinc-800/60">
      <span className="text-sm text-zinc-200">{label}</span>
      {children}
    </label>
  )
}

function CapabilityToggle({
  icon,
  label,
  description,
  active,
  onToggle,
}: {
  icon: string
  label: string
  description: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all
        ${
          active
            ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
            : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-600'
        }
      `}
    >
      <span className="text-lg shrink-0 leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {active && (
            <span className="text-[10px] px-1.5 py-px rounded bg-indigo-500/30 text-indigo-200 font-bold">
              ON
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
          {description}
        </div>
      </div>
    </button>
  )
}