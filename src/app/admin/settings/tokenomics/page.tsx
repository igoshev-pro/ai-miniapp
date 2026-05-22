'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { ENDPOINTS } from '@/lib/api/endpoints'
import {
  Plus, Trash2, Save, Star, Flame, DollarSign, Gift,
} from 'lucide-react'

type Pack = {
  tokens: number
  priceRub: number
  bonusTokens: number
  label?: string
  highlight?: boolean
}

type Draft = {
  tokenToDollarRate: number
  freeTokensOnSignup: number
  minPurchaseTokens: number
  purchasePacks: Pack[]
  refundOnError: boolean
}

export default function TokenomicsPage() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
  (async () => {
    try {
      const res: any = await apiClient.get(ENDPOINTS.ADMIN_SETTINGS_TOKENOMICS)

      // Универсальная распаковка: ищем объект с tokenToDollarRate
      const d =
        res?.data?.data?.tokenToDollarRate !== undefined ? res.data.data :
        res?.data?.tokenToDollarRate !== undefined ? res.data :
        res?.tokenToDollarRate !== undefined ? res :
        null

      if (!d) {
        console.error('❌ Не нашёл данные токеномики в ответе:', res)
        return
      }

      setDraft({
        tokenToDollarRate: d.tokenToDollarRate,
        freeTokensOnSignup: d.freeTokensOnSignup,
        minPurchaseTokens: d.minPurchaseTokens,
        purchasePacks: d.purchasePacks ?? [],
        refundOnError: d.refundOnError,
      })
    } catch (e) {
      console.error('❌ Tokenomics load error:', e)
    } finally {
      setLoading(false)
    }
  })()
}, [])

  if (loading || !draft) {
    return <div className="p-8 text-zinc-400">Загрузка...</div>
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v })

  const addPack = () =>
    set('purchasePacks', [...draft.purchasePacks, { tokens: 100, priceRub: 99, bonusTokens: 0 }])
  const updPack = (i: number, p: Partial<Pack>) =>
    set('purchasePacks', draft.purchasePacks.map((x, idx) => (idx === i ? { ...x, ...p } : x)))
  const delPack = (i: number) =>
    set('purchasePacks', draft.purchasePacks.filter((_, idx) => idx !== i))

  const onSave = async () => {
    setSaving(true)
    try {
      await apiClient.put(ENDPOINTS.ADMIN_SETTINGS_TOKENOMICS, draft)
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="text-amber-400" /> Токеномика
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Курсы, бонусы, пачки покупок</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-emerald-400">
              Сохранено в {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <Section title="Курсы и базовые настройки" icon={<DollarSign size={16} />}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="1 спичка = $ (себестоимость, для маржи)">
            <input
              type="number"
              step="0.001"
              className={inp}
              value={draft.tokenToDollarRate}
              onChange={(e) => set('tokenToDollarRate', Number(e.target.value))}
            />
          </Field>
          <Field label="Бесплатных спичек при регистрации">
            <input
              type="number"
              className={inp}
              value={draft.freeTokensOnSignup}
              onChange={(e) => set('freeTokensOnSignup', Number(e.target.value))}
            />
          </Field>
          <Field label="Мин. пачка к покупке (спичек)">
            <input
              type="number"
              className={inp}
              value={draft.minPurchaseTokens}
              onChange={(e) => set('minPurchaseTokens', Number(e.target.value))}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.refundOnError}
            onChange={(e) => set('refundOnError', e.target.checked)}
            className="scale-125"
          />
          <span className="text-sm text-zinc-200">Возвращать спички при ошибке генерации</span>
        </label>
      </Section>

      <Section title="Пачки покупок" icon={<Gift size={16} />}>
        <p className="text-xs text-zinc-500 mb-3">Эти пачки увидит юзер на странице пополнения.</p>

        <div className="space-y-3">
          {draft.purchasePacks.map((pack, i) => (
            <div
              key={i}
              className={`bg-zinc-800/40 rounded-lg border p-4 ${
                pack.highlight ? 'border-amber-500/50' : 'border-zinc-700/50'
              }`}
            >
              <div className="grid grid-cols-12 gap-3 items-end">
                <Field label="🔥 Спичек" className="col-span-2">
                  <input type="number" className={inp} value={pack.tokens}
                    onChange={(e) => updPack(i, { tokens: Number(e.target.value) })} />
                </Field>
                <Field label="₽ Цена" className="col-span-2">
                  <input type="number" className={inp} value={pack.priceRub}
                    onChange={(e) => updPack(i, { priceRub: Number(e.target.value) })} />
                </Field>
                <Field label="🎁 Бонус" className="col-span-2">
                  <input type="number" className={inp} value={pack.bonusTokens}
                    onChange={(e) => updPack(i, { bonusTokens: Number(e.target.value) })} />
                </Field>
                <Field label="Лейбл" className="col-span-3">
                  <input className={inp} placeholder="Популярная" value={pack.label ?? ''}
                    onChange={(e) => updPack(i, { label: e.target.value })} />
                </Field>
                <div className="col-span-2 flex items-center justify-center">
                  <label className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={!!pack.highlight}
                      onChange={(e) => updPack(i, { highlight: e.target.checked })} />
                    <Star size={12} /> Топ
                  </label>
                </div>
                <button onClick={() => delPack(i)}
                  className="col-span-1 text-red-400 hover:text-red-300 flex justify-center">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-700/30 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Итого спичек" value={`${pack.tokens + pack.bonusTokens} 🔥`} />
                <Stat label="Цена за 1 спичку"
                  value={`${(pack.priceRub / Math.max(1, pack.tokens + pack.bonusTokens)).toFixed(2)} ₽`} />
                <Stat label="Маржа"
                  value={`${(pack.priceRub - (pack.tokens + pack.bonusTokens) * draft.tokenToDollarRate * 90).toFixed(0)} ₽`}
                  hint="при курсе ₽/$ ≈ 90" />
              </div>
            </div>
          ))}

          <button onClick={addPack}
            className="px-3 py-2 bg-indigo-600/80 hover:bg-indigo-500 rounded text-sm text-white flex items-center gap-2">
            <Plus size={14} /> Добавить пачку
          </button>
        </div>
      </Section>
    </div>
  )
}

const inp = 'w-full bg-zinc-900 rounded px-2 py-1.5 text-sm text-white border border-zinc-700 focus:border-indigo-500 outline-none'

function Section({ title, icon, children }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children, className = '' }: any) {
  return (
    <div className={className}>
      <div className="text-[10px] text-zinc-500 uppercase mb-1">{label}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, hint }: any) {
  return (
    <div className="bg-zinc-900/60 rounded px-3 py-2">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
      {hint && <div className="text-[9px] text-zinc-600 mt-0.5">{hint}</div>}
    </div>
  )
}