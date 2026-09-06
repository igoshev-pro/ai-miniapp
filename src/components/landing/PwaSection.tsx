'use client'

import { useEffect, useState } from 'react'
import {
  Download,
  ExternalLink,
  Share,
  MoreVertical,
  Check,
  MonitorDown,
  ChevronRight,
} from 'lucide-react'

/**
 * Блок «Установи как приложение». На Android/Chrome ловим beforeinstallprompt
 * и показываем системный диалог по кнопке. Safari на iPhone такого события
 * не даёт — там показываем пошаговую инструкцию. Внутри уже установленного
 * PWA кнопка превращается в «Открыть».
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop'

const STEPS: Record<Platform, { t: string; d: React.ReactNode }[]> = {
  ios: [
    { t: 'Открой сайт в Safari', d: <>Другие браузеры на iPhone не умеют ставить приложения на экран.</> },
    {
      t: 'Нажми «Поделиться»',
      d: (
        <>
          Квадрат со стрелкой <Share size={13} style={{ verticalAlign: '-2px' }} /> внизу экрана.
        </>
      ),
    },
    { t: 'Выбери «На экран Домой»', d: <>Прокрути список вниз, нажми <kbd>Добавить</kbd>. Иконка появится рядом с остальными.</> },
  ],
  android: [
    { t: 'Нажми «Установить приложение»', d: <>Кнопка ниже вызовет системное окно Chrome — подтверди установку.</> },
    {
      t: 'Если кнопки нет',
      d: (
        <>
          Меню Chrome <MoreVertical size={13} style={{ verticalAlign: '-2px' }} />{' '}
          <ChevronRight size={12} style={{ verticalAlign: '-1px' }} /> <kbd>Установить приложение</kbd> или{' '}
          <kbd>Добавить на главный экран</kbd>.
        </>
      ),
    },
    { t: 'Открывай с экрана', d: <>Запускается как обычное приложение: полный экран, без адресной строки.</> },
  ],
  desktop: [
    { t: 'Открой сайт в Chrome или Edge', d: <>В адресной строке справа появится значок установки.</> },
    {
      t: 'Нажми «Установить»',
      d: (
        <>
          Или меню браузера <ChevronRight size={12} style={{ verticalAlign: '-1px' }} />{' '}
          <kbd>Установить SPICHKI AI</kbd>. Появится отдельное окно и ярлык в системе.
        </>
      ),
    },
    { t: 'На телефоне — ещё проще', d: <>Переключи вкладку выше на iPhone или Android и следуй трём шагам.</> },
  ],
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function PwaSection({ appHref }: { appHref: string }) {
  const [tab, setTab] = useState<Platform>('ios')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<'idle' | 'installed' | 'standalone'>('idle')
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    setTab(detectPlatform())

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) setState('standalone')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setState('installed')
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setState('installed')
      setDeferred(null)
      return
    }
    const p = detectPlatform()
    setTab(p)
    setHint(
      p === 'ios'
        ? 'На iPhone установка идёт через меню «Поделиться» — три шага ниже.'
        : 'Этот браузер не показал окно установки — воспользуйся шагами ниже.',
    )
  }

  return (
    <div className="lp-app">
      <div>
        <h2 className="lp-h2">
          Ставится на телефон за <em>пять секунд</em>. Без App Store.
        </h2>
        <p className="lp-lead">
          SPICHKI AI работает как обычное приложение: своя иконка, полный экран, быстрый запуск.
          Никаких магазинов, обновлений и «недоступно в вашем регионе».
        </p>

        <div className="lp-tabs" role="tablist" aria-label="Платформа">
          {(['ios', 'android', 'desktop'] as Platform[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={tab === p}
              className="lp-tab"
              onClick={() => setTab(p)}
            >
              {p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'Компьютер'}
            </button>
          ))}
        </div>

        <div className="lp-steps" key={tab}>
          {STEPS[tab].map((s, i) => (
            <div className="lp-step" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="lp-step__n">0{i + 1}</span>
              <div>
                <div className="lp-step__t">{s.t}</div>
                <div className="lp-step__d">{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-install">
          {state === 'standalone' ? (
            <a className="lp-btn lp-btn--primary" href={appHref}>
              <Check size={18} /> Уже установлено — открыть
            </a>
          ) : state === 'installed' ? (
            <a className="lp-btn lp-btn--primary" href={appHref}>
              <Check size={18} /> Установлено — открыть
            </a>
          ) : (
            <button className="lp-btn lp-btn--primary" onClick={install} type="button">
              {tab === 'desktop' ? <MonitorDown size={18} /> : <Download size={18} />}
              Установить приложение
            </button>
          )}
          <a className="lp-btn lp-btn--ghost" href={appHref}>
            Открыть в браузере <ExternalLink size={16} />
          </a>
          {hint && (
            <p className="lp-install__hint">
              <b>Подсказка.</b> {hint}
            </p>
          )}
        </div>
      </div>

      <div className="lp-app__visual">
        <div className="lp-hero__glow" />
        <div className="ph-wrap" aria-hidden="true">
          <div className="ph ph--home">
            <div className="ph__notch" />
            <div className="ph__screen">
              <div className="ph__clock">9:41</div>
              <div className="ph__date">суббота, 5 сентября</div>
              <div className="ph__apps">
                {Array.from({ length: 11 }).map((_, i) => (
                  <span className="ph__app" key={i}>
                    <i />
                  </span>
                ))}
                <span className="ph__app ph__app--hero">
                  <i />
                  Спички
                </span>
              </div>
              <div className="ph__toast">
                <span className="ph__toast-ico" />
                <span>
                  <b>Спички</b> добавлены на экран
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
