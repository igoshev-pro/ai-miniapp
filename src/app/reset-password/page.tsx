'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/hooks'

/**
 * Страница смены пароля по ссылке из письма.
 *
 * Отдельный роут, а не модалка внутри SpichkiApp: человек приходит сюда
 * по прямой ссылке из почты, часто в новой вкладке и без сессии.
 */

const MIN_PASSWORD = 8

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { resetPassword } = useAuth()

  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const mismatch = repeat.length > 0 && password !== repeat
  const canSubmit =
    password.length >= MIN_PASSWORD && password === repeat && !busy && !!token

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      setBusy(true)
      try {
        await resetPassword(token, password)
        // Токен погашен, пользователь уже авторизован — ведём в приложение.
        router.replace('/')
      } catch {
        // Сообщение показал useAuth.
      } finally {
        setBusy(false)
      }
    },
    [canSubmit, token, password, resetPassword, router],
  )

  const inputClass = `
    w-full py-2.5 pl-10 pr-3
    rounded-[10px]
    border border-white/[0.08] bg-white/[0.04]
    text-white text-[14px] font-[inherit]
    outline-none transition-colors duration-200
    placeholder:text-white/25
    focus:border-[rgba(250,204,21,0.4)]
    disabled:opacity-50
  `

  if (!token) {
    return (
      <div className="text-center flex flex-col gap-3">
        <div className="text-[32px]">🔗</div>
        <div className="text-[15px] font-semibold text-white">
          Ссылка неполная
        </div>
        <div className="text-[13px] text-white/50 leading-[1.5]">
          Откройте ссылку из письма целиком или запросите восстановление заново.
        </div>
        <button
          className="
            mt-1 text-[13px] text-[var(--accent-yellow)] font-[inherit]
            bg-transparent border-none cursor-pointer
          "
          onClick={() => router.replace('/')}
        >
          На главную
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <h1 className="text-[18px] font-bold text-white mb-1 text-center">
        Новый пароль
      </h1>

      <div className="relative">
        <Lock
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        />
        <input
          type="password"
          className={inputClass}
          placeholder={`Пароль (от ${MIN_PASSWORD} символов)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          autoComplete="new-password"
          required
        />
      </div>

      <div className="relative">
        <Lock
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        />
        <input
          type="password"
          className={inputClass}
          placeholder="Повторите пароль"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          disabled={busy}
          autoComplete="new-password"
          required
        />
      </div>

      {tooShort && (
        <div className="text-[11px] text-white/40 pl-1">
          Ещё {MIN_PASSWORD - password.length} символов
        </div>
      )}
      {mismatch && (
        <div className="text-[11px] text-red-400/80 pl-1">Пароли не совпадают</div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="
          mt-1 w-full py-2.5 rounded-[10px]
          bg-[var(--accent-yellow)] text-black
          text-[14px] font-bold font-[inherit]
          border-none cursor-pointer
          flex items-center justify-center gap-2
          transition-all duration-150
          active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-default disabled:active:scale-100
        "
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        Сохранить пароль
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary,#08080a)]">
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'rgba(18, 18, 22, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* useSearchParams требует Suspense-границы при пререндере. */}
        <Suspense
          fallback={
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-white/30" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
