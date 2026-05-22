'use client'

export function CapabilitiesEditor({ value, onChange }: { value: Record<string, any>; onChange: (v: any) => void }) {
  const v = value ?? {}
  const set = (k: string, val: any) => onChange({ ...v, [k]: val })

  return (
    <div className="space-y-4 max-w-xl">
      <label className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Принимает изображения</span>
        <input type="checkbox" checked={!!v.acceptsImage} onChange={(e) => set('acceptsImage', e.target.checked)} />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Принимает видео</span>
        <input type="checkbox" checked={!!v.acceptsVideo} onChange={(e) => set('acceptsVideo', e.target.checked)} />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Принимает аудио</span>
        <input type="checkbox" checked={!!v.acceptsAudio} onChange={(e) => set('acceptsAudio', e.target.checked)} />
      </label>
      <div>
        <label className="text-sm text-zinc-300 block mb-1">Макс. файлов</label>
        <input type="number" className="bg-zinc-900 rounded px-2 py-1 text-sm text-white w-32" value={v.maxFiles ?? 1} onChange={(e) => set('maxFiles', Number(e.target.value))} />
      </div>
      <div>
        <label className="text-sm text-zinc-300 block mb-1">Разрешённые MIME (через запятую)</label>
        <input className="bg-zinc-900 rounded px-2 py-1 text-sm text-white w-full" value={Array.isArray(v.mimeTypes) ? v.mimeTypes.join(',') : ''} onChange={(e) => set('mimeTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
      </div>
    </div>
  )
}