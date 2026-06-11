'use client'

import { useBotAuth } from '@/hooks/useBotAuth'

interface Props {
  referralCode?: string
  className?: string
}

export function BotLoginButton({ referralCode, className }: Props) {
  const { status, deepLink, start } = useBotAuth()

  const isPending = status === 'pending'

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <button
        onClick={() => start(referralCode)}
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-6 py-3 font-semibold text-[#0A0A0A] transition-opacity disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Ожидаем подтверждения…
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            Войти через Telegram
          </>
        )}
      </button>

      {isPending && deepLink && (
        <a
          href={deepLink}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-white/60 underline hover:text-white/80"
        >
          Не открылся бот? Нажми сюда
        </a>
      )}

      {status === 'expired' && (
        <p className="text-sm text-red-400">
          Ссылка устарела — нажми «Войти» ещё раз
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400">
          Ошибка. Попробуй ещё раз
        </p>
      )}
    </div>
  )
}