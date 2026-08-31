'use client'

import { useState, useCallback } from 'react'
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks'

/**
 * Форма входа и регистрации по почте.
 *
 * Три режима в одном компоненте: вход, регистрация, восстановление.
 * Они делят поля и стили, а разводить их по трём файлам значило бы
 * копировать разметку ради разницы в одной кнопке.
 */

type Mode = 'login' | 'register' | 'forgot'

const MIN_PASSWORD = 8

interface Props {
  /** Вызывается после успешного входа — например, чтобы закрыть модалку. */
  onSuccess?: () => void
}

export function EmailAuthForm({ onSuccess }: Props) {
  const { registerWithEmail, loginWithEmail, requestPasswordReset } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  // Локальная проверка — чтобы не гонять заведомо неверные данные на сервер.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordValid = password.length >= MIN_PASSWORD

  const canSubmit =
    mode === 'forgot'
      ? emailValid && !busy
      : emailValid && passwordValid && !busy

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      setBusy(true)
      try {
        if (mode === 'login') {
          await loginWithEmail({ email: email.trim(), password })
          onSuccess?.()
        } else if (mode === 'register') {
          await registerWithEmail({
            email: email.trim(),
            password,
            firstName: firstName.trim() || undefined,
          })
          onSuccess?.()
        } else {
          await requestPasswordReset(email.trim())
          setSent(true)
        }
      } catch {
        // Текст ошибки уже показал useAuth — здесь только снимаем блокировку.
      } finally {
        setBusy(false)
      }
    },
    [
      canSubmit, mode, email, password, firstName,
      loginWithEmail, registerWithEmail, requestPasswordReset, onSuccess,
    ],
  )

  const switchMode = (next: Mode) => {
    setMode(next)
    setSent(false)
    // Пароль не переносим между режимами: в «Забыли пароль» он не нужен,
    // а из восстановления во вход человек приходит уже с новым.
    setPassword('')
  }

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

  // ── Письмо отправлено ──
  if (mode === 'forgot' && sent) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <div className="text-[32px]">📬</div>
        <div className="text-[15px] font-semibold text-white">
          Проверьте почту
        </div>
        <div className="text-[13px] text-white/50 leading-[1.5]">
          Если <span className="text-white/70">{email.trim()}</span> зарегистрирована,
          мы отправили письмо со ссылкой. Она действует 30 минут.
        </div>
        <button
          type="button"
          className="
            mt-1 text-[13px] text-white/45 font-[inherit]
            bg-transparent border-none cursor-pointer
            hover:text-white/70 transition-colors
          "
          onClick={() => switchMode('login')}
        >
          Вернуться ко входу
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      {mode === 'forgot' && (
        <button
          type="button"
          className="
            self-start flex items-center gap-1 mb-0.5
            text-[12px] text-white/40 font-[inherit]
            bg-transparent border-none cursor-pointer p-0
            hover:text-white/70 transition-colors
          "
          onClick={() => switchMode('login')}
        >
          <ArrowLeft size={13} /> Назад
        </button>
      )}

      {mode === 'forgot' && (
        <div className="text-[13px] text-white/50 leading-[1.5] text-left mb-0.5">
          Укажите почту — пришлём ссылку для смены пароля.
        </div>
      )}

      {mode === 'register' && (
        <div className="relative">
          <User
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            type="text"
            className={inputClass}
            placeholder="Имя (необязательно)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={busy}
            autoComplete="given-name"
            maxLength={64}
          />
        </div>
      )}

      <div className="relative">
        <Mail
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        />
        <input
          type="email"
          className={inputClass}
          placeholder="Почта"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>

      {mode !== 'forgot' && (
        <div className="relative">
          <Lock
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            type="password"
            className={inputClass}
            placeholder={
              mode === 'register' ? `Пароль (от ${MIN_PASSWORD} символов)` : 'Пароль'
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
          />
        </div>
      )}

      {/* Подсказка про длину — только когда человек уже начал печатать,
          чтобы поле не краснело при первом взгляде на форму. */}
      {mode === 'register' && password.length > 0 && !passwordValid && (
        <div className="text-[11px] text-white/40 -mt-0.5 pl-1">
          Ещё {MIN_PASSWORD - password.length} символов
        </div>
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
        {mode === 'login'
          ? 'Войти'
          : mode === 'register'
            ? 'Создать аккаунт'
            : 'Отправить ссылку'}
      </button>

      {mode !== 'forgot' && (
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            className="
              text-[12px] text-white/45 font-[inherit]
              bg-transparent border-none cursor-pointer p-0
              hover:text-white/70 transition-colors
            "
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Создать аккаунт' : 'У меня уже есть аккаунт'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              className="
                text-[12px] text-white/45 font-[inherit]
                bg-transparent border-none cursor-pointer p-0
                hover:text-white/70 transition-colors
              "
              onClick={() => switchMode('forgot')}
            >
              Забыли пароль?
            </button>
          )}
        </div>
      )}
    </form>
  )
}
