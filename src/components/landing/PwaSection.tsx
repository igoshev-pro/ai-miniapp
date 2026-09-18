'use client'

import { useState } from 'react'
import { ExternalLink, Share, MoreVertical, ChevronRight } from 'lucide-react'

/**
 * Блок «Установи как приложение»: вкладки iPhone / Android / Компьютер
 * с пошаговой инструкцией. Кнопки «Установить» нет (решение заказчика):
 * системный диалог Chrome всё равно недоступен на iPhone, а инструкции
 * хватает. Вкладка по умолчанию — iPhone.
 */

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
    { t: 'Открой сайт в Chrome', d: <>Обычно Chrome сам предложит установку плашкой внизу — просто подтверди.</> },
    {
      t: 'Если плашки нет',
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

export function PwaSection({ appHref }: { appHref: string }) {
  const [tab, setTab] = useState<Platform>('ios')

  return (
    <div className="lp-app">
      <div>
        <h2 className="lp-h2">
          Ставится на телефон за <em>пять секунд</em>. Без App Store.
        </h2>
        <p className="lp-lead">Своя иконка, полный экран, без магазинов.</p>

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
          <a className="lp-btn lp-btn--ghost" href={appHref} target="_blank" rel="noopener noreferrer">
            Открыть в браузере <ExternalLink size={16} />
          </a>
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
                  Spichki AI
                </span>
              </div>
              <div className="ph__toast">
                <span className="ph__toast-ico" />
                <span>
                  <b>Spichki AI</b> добавлено на экран
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
