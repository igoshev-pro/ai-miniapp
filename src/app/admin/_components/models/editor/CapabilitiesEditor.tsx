'use client'

type Caps = {
  acceptsImages?: boolean
  acceptsVideo?: boolean
  acceptsAudio?: boolean
  maxInputImages?: number
  mimeTypes?: string[]
}

export function CapabilitiesEditor({ value, onChange }: { value: Caps; onChange: (v: Caps) => void }) {
  const v = value ?? {}
  const set = (k: keyof Caps, val: any) => onChange({ ...v, [k]: val })

  return (
    <div className="space-y-4 max-w-2xl">
      <Row label="Принимает изображения">
        <input type="checkbox" checked={!!v.acceptsImages} onChange={(e) => set('acceptsImages', e.target.checked)} className="scale-125"/>
      </Row>
      <Row label="Принимает видео">
        <input type="checkbox" checked={!!v.acceptsVideo} onChange={(e) => set('acceptsVideo', e.target.checked)} className="scale-125"/>
      </Row>
      <Row label="Принимает аудио">
        <input type="checkbox" checked={!!v.acceptsAudio} onChange={(e) => set('acceptsAudio', e.target.checked)} className="scale-125"/>
      </Row>

      <div className="border-t border-zinc-800 pt-4">
        <label className="text-sm text-zinc-300 block mb-2">Макс. количество входных изображений</label>
        <input type="number" className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-40"
          value={v.maxInputImages ?? 0} onChange={(e) => set('maxInputImages', Number(e.target.value))}/>
      </div>

      <div>
        <label className="text-sm text-zinc-300 block mb-2">Разрешённые MIME-типы</label>
        <input className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white w-full"
          placeholder="image/png, image/jpeg, video/mp4"
          value={Array.isArray(v.mimeTypes) ? v.mimeTypes.join(', ') : ''}
          onChange={(e) => set('mimeTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}/>
        <p className="text-xs text-zinc-500 mt-1">через запятую</p>
      </div>
    </div>
  )
}

function Row({ label, children }: any) {
  return (
    <label className="flex items-center justify-between bg-zinc-800/40 border border-zinc-700/50 rounded-lg px-4 py-3 cursor-pointer hover:bg-zinc-800/60">
      <span className="text-sm text-zinc-200">{label}</span>
      {children}
    </label>
  )
}