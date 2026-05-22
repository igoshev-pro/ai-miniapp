'use client'
import { useState } from 'react'

export function RawJsonEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2))
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <textarea
        className="w-full h-[500px] bg-zinc-950 text-green-300 font-mono text-xs p-3 rounded border border-zinc-800"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          try { onChange(JSON.parse(e.target.value)); setErr(null) }
          catch (ex: any) { setErr(ex.message) }
        }}
      />
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  )
}