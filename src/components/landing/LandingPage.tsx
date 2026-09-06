'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Smartphone, Flame} from 'lucide-react'
import { PhoneDemo } from './PhoneDemo'
import { PwaSection } from './PwaSection'
import './landing.css'

/**
 * Лендинг /start — страница для трафика. Единственная цель: регистрация.
 * Все кнопки ведут в приложение с ?auth=1 (SpichkiApp откроет окно входа),
 * реферальный код из ?ref= прокидывается дальше — его читает useAuth.
 */

const FONTS =
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap'

const SUPPORT_LINK = 'https://t.me/spichki_ai_help'

// Цены «от» — из src/lib/data.ts (cost), 1 спичка = 3 ₽.
const MENU: { group: string; rows: { name: string; note: string; cost: number }[] }[] = [
  {
    group: 'Текст',
    rows: [
      { name: 'Ответ GPT‑5.4', note: 'OpenAI · vision', cost: 0.8 },
      { name: 'Ответ Claude Sonnet 4.6', note: 'Anthropic', cost: 0.8 },
      { name: 'Ответ GPT‑OSS 120B', note: 'бесплатно по подписке', cost: 0.1 },
    ],
  },
  {
    group: 'Картинки',
    rows: [
      { name: 'Картинка Midjourney', note: '4 варианта за раз', cost: 1.3 },
      { name: 'Картинка Flux 2', note: '1K–2K', cost: 1.8 },
      { name: 'Картинка Nano Banana 2', note: 'до 14 референсов', cost: 3.3 },
    ],
  },
  {
    group: 'Видео и звук',
    rows: [
      { name: 'Видео Kling 3.0', note: 'со звуком, за секунду', cost: 4.3 },
      { name: 'Видео Veo 3.1 Fast', note: '8 секунд, 1080p', cost: 15 },
      { name: 'Трек Suno V5', note: 'с вокалом, ~2 мин', cost: 12 },
      { name: 'Озвучка ElevenLabs', note: 'Turbo, любой язык', cost: 2.7 },
    ],
  },
]

const TICKER_A = [
  ['GPT‑5.4', 'OpenAI'],
  ['Claude Opus 4.6', 'Anthropic'],
  ['Midjourney', 'v7'],
  ['Veo 3.1 Pro', 'Google'],
  ['Sora 2 Pro', 'OpenAI'],
  ['Kling 3.0', 'Kuaishou'],
  ['Suno V5', 'музыка'],
  ['Flux 2', 'Black Forest'],
  ['Grok 4.5', 'xAI'],
  ['Seedance 2.5', 'ByteDance'],
  ['ElevenLabs', 'озвучка'],
  ['Gemini 3.1 Pro', 'Google'],
]

const TICKER_B = [
  ['Claude Sonnet 4.6', 'Anthropic'],
  ['Nano Banana Pro', 'картинки'],
  ['Hailuo 2.3 Pro', 'MiniMax'],
  ['Imagen 4', 'Google'],
  ['Runway Gen‑3', 'видео'],
  ['Perplexity Sonar', 'поиск'],
  ['Seedream 5.0 Pro', 'ByteDance'],
  ['GPT‑5 Image', 'OpenAI'],
  ['Claude Haiku 4.5', 'Anthropic'],
  ['Topaz', 'апскейл видео'],
  ['Grok 4.1 Fast', 'xAI'],
  ['GPT Image 1.5', 'OpenAI'],
]

const PLANS = [
  { name: 'Basic', price: 450, tokens: 150, hot: false, perks: ['~125 картинок или 25 видео', 'История и избранное'] },
  {
    name: 'Plus',
    price: 990,
    tokens: 330,
    hot: true,
    perks: ['3 текстовые модели без списания', 'до 60 запросов в сутки бесплатно', 'Все модели каталога'],
  },
  {
    name: 'Max',
    price: 2490,
    tokens: 830,
    hot: false,
    perks: ['Текстовые модели без лимитов', 'Все модели каталога'],
  },
  {
    name: 'Ultimate',
    price: 5990,
    tokens: 1997,
    hot: false,
    perks: ['Безлимит на текст', 'Картинки без списания: Seedream, Imagen 4, Midjourney'],
  },
]

const FAQ = [
  {
    q: 'Что такое спичка?',
    a: 'Внутренняя валюта сервиса. 1 спичка = 3 рубля. Баланс один на все нейросети: сегодня тратишь на картинку в Midjourney, завтра — на видео в Veo. Спички не сгорают и не привязаны к подписке.',
  },
  {
    q: 'Нужен ли VPN или зарубежная карта?',
    a: 'Нет. Сервис работает из России без VPN, оплата — картой РФ, через Telegram Stars или криптовалютой. Все модели доступны напрямую из приложения.',
  },
  {
    q: 'Что я получу при регистрации?',
    a: '9 спичек на баланс сразу после входа. Этого хватает примерно на 6 картинок в Midjourney, 11 ответов GPT‑5.4 или два коротких видео в Kling — чтобы попробовать всё без оплаты.',
  },
  {
    q: 'Это приложение или сайт?',
    a: 'И то, и другое. Пользуйся в браузере, установи на телефон как приложение (без App Store и Google Play) или открывай прямо в Telegram — аккаунт и баланс общие.',
  },
  {
    q: 'Куда деваются мои генерации?',
    a: 'Все результаты сохраняются в истории: картинки, видео, треки и чаты. Любую можно добавить в избранное, скачать или использовать как референс для следующей генерации.',
  },
]

function useAppHref() {
  const [ref, setRef] = useState<string | null>(null)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      setRef(p.get('ref') || p.get('referral'))
    } catch {
      // ignore
    }
  }, [])
  const suffix = ref ? `&ref=${encodeURIComponent(ref)}` : ''
  return `/?auth=1${suffix}`
}

function useReveal() {
  useEffect(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('.lp .rv'))
    // Всё, что уже в первом экране, показываем сразу — не ждём observer,
    // иначе при задержке колбэка hero остаётся прозрачным.
    const vh = window.innerHeight || 800
    const nodes = all.filter((n) => {
      if (n.getBoundingClientRect().top < vh * 0.95) {
        n.classList.add('in')
        return false
      }
      return true
    })
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}

function rub(cost: number) {
  const v = cost * 3
  return v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v))
}

function Ticker({ items, reverse }: { items: string[][]; reverse?: boolean }) {
  const list = [...items, ...items]
  return (
    <div className={`lp-ticker ${reverse ? 'lp-ticker--rev' : ''}`} aria-hidden="true">
      <div className="lp-ticker__track">
        {list.map(([name, tag], i) => (
          <span className="lp-ticker__item" key={i}>
            <b>{name}</b>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export function LandingPage() {
  const appHref = useAppHref()
  useReveal()

  return (
    <div className="lp">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS} precedence="default" />

      <div className="lp-bg" aria-hidden="true">
        <div className="lp-bg__grid" />
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <div className="lp-bg__grain" />
      </div>

      {/* ── навигация ── */}
      <header className="lp-nav">
        <div className="lp-nav__in">
          <a className="lp-logo" href="/start" aria-label="SPICHKI AI">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Спички" />
            <span className="lp-logo__ai">AI</span>
          </a>
          <nav className="lp-nav__links">
            <a href="#models">Модели</a>
            <a href="#prices">Цены</a>
            <a href="#app">Приложение</a>
            <a href="#faq">Вопросы</a>
          </nav>
          <div className="lp-nav__cta">
            <a className="lp-btn lp-btn--ghost lp-btn--sm" href={appHref}>
              Войти
            </a>
            <a className="lp-btn lp-btn--primary lp-btn--sm" href={appHref}>
              Начать бесплатно
            </a>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="lp-hero">
        <div>
          <div className="lp-eyebrow rv">
            <span className="lp-eyebrow__dot" />
            45+ нейросетей · без VPN · карта РФ
          </div>
          <h1 className="lp-h1 rv rv-d1">
            Все нейросети.
            <br />
            Одна{' '}
            <span className="lp-nowrap">
              <em>спичка</em>
              <span className="lp-dot" />
            </span>
          </h1>
          <p className="lp-hero__sub rv rv-d2">
            <strong>GPT‑5.4, Claude Opus, Midjourney, Veo 3.1, Sora 2, Kling, Suno</strong> — в одном
            окне и с одним балансом. Платишь спичками только за то, что реально сгенерировал.
            Никаких подписок на каждый сервис по отдельности.
          </p>
          <div className="lp-hero__cta rv rv-d3">
            <a className="lp-btn lp-btn--primary lp-btn--lg" href={appHref}>
              Забрать 9 спичек
              <ArrowRight className="lp-btn__arrow" size={18} />
            </a>
            <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#app">
              <Smartphone size={18} />
              Установить на телефон
            </a>
          </div>
          <div className="lp-proof rv rv-d4">
            <span>1 спичка = 3 ₽</span>
            <span>9 спичек при регистрации</span>
            <span>Карта РФ · Stars · USDT</span>
          </div>
        </div>

        <div className="lp-hero__visual rv rv-d2">
          <div className="lp-hero__glow" />
          <div className="lp-strike" />
          <PhoneDemo />
        </div>
      </section>

      <Ticker items={TICKER_A} />
      <Ticker items={TICKER_B} reverse />

      {/* ── 01 модели ── */}
      <section className="lp-sec" id="models">
        <div className="lp-rule rv">
          <span className="lp-rule__n">01</span> Что внутри
        </div>
        <div className="lp-sec__head">
          <h2 className="lp-h2 rv">
            Текст, картинки, видео и звук. <em>Один аккаунт.</em>
          </h2>
          <p className="lp-lead rv rv-d1">
            Не нужно заводить десять аккаунтов и следить за курсом доллара. Выбираешь модель — и
            сразу работаешь. Новые модели появляются в каталоге по мере выхода.
          </p>
        </div>

        <div className="lp-bento">
          <article className="lp-card lp-card--text rv">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/covers/text3.webp" alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Текст</span>
            <span className="lp-card__count">10 моделей</span>
            <h3 className="lp-card__title">Чаты с флагманами</h3>
            <p className="lp-card__text">
              Пишут, считают, читают документы и картинки, ищут в интернете. Один диалог — любую модель
              можно переключить на ходу.
            </p>
            <div className="lp-chips">
              <span className="lp-chip">GPT‑5.4</span>
              <span className="lp-chip">Claude Opus 4.6</span>
              <span className="lp-chip">Claude Sonnet 4.6</span>
              <span className="lp-chip">Grok 4.5</span>
              <span className="lp-chip">Gemini 3.1 Pro</span>
              <span className="lp-chip">Perplexity</span>
              <span className="lp-chip lp-chip--more">+4</span>
            </div>
          </article>

          <article className="lp-card lp-card--image rv rv-d1">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/covers/image2.webp" alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Картинки</span>
            <span className="lp-card__count">13 моделей</span>
            <h3 className="lp-card__title">Midjourney и не только</h3>
            <p className="lp-card__text">До 14 референсов, img2img, 4K.</p>
            <div className="lp-chips">
              <span className="lp-chip">Midjourney</span>
              <span className="lp-chip">Flux 2</span>
              <span className="lp-chip">Nano Banana Pro</span>
              <span className="lp-chip">Imagen 4</span>
              <span className="lp-chip lp-chip--more">+9</span>
            </div>
          </article>

          <article className="lp-card lp-card--video rv">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/covers/video.webp" alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Видео</span>
            <span className="lp-card__count">16 моделей</span>
            <h3 className="lp-card__title">Видео со звуком</h3>
            <p className="lp-card__text">Текст в видео, кадр в видео, апскейл до 4K.</p>
            <div className="lp-chips">
              <span className="lp-chip">Veo 3.1</span>
              <span className="lp-chip">Sora 2 Pro</span>
              <span className="lp-chip">Kling 3.0</span>
              <span className="lp-chip">Seedance 2.5</span>
              <span className="lp-chip lp-chip--more">+12</span>
            </div>
          </article>

          <article className="lp-card lp-card--audio rv rv-d1">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/covers/audio2.webp" alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Аудио</span>
            <span className="lp-card__count">6 моделей</span>
            <h3 className="lp-card__title">Музыка и голос</h3>
            <p className="lp-card__text">Треки с вокалом, озвучка, расшифровка речи.</p>
            <div className="lp-chips">
              <span className="lp-chip">Suno V5</span>
              <span className="lp-chip">ElevenLabs</span>
              <span className="lp-chip">Диалоги</span>
              <span className="lp-chip lp-chip--more">+3</span>
            </div>
          </article>

          <article className="lp-card lp-card--stat rv rv-d2">
            <div className="lp-stat__n">
              45<small>+</small>
            </div>
            <ul className="lp-stat__list">
              <li>4 категории, один баланс</li>
              <li>История, избранное, референсы</li>
              <li>Браузер, телефон, Telegram</li>
            </ul>
          </article>
        </div>
      </section>

      {/* ── 02 цены ── */}
      <section className="lp-sec" id="prices">
        <div className="lp-rule rv">
          <span className="lp-rule__n">02</span> Сколько стоит
        </div>
        <div className="lp-price">
          <div>
            <h2 className="lp-h2 rv">
              Платишь за результат, <em>а не за подписку</em>
            </h2>
            <p className="lp-lead rv rv-d1">
              Спичка — единая валюта на все модели. Списывается ровно за генерацию: картинка,
              секунда видео, ответ в чате. Абонентской платы нет.
            </p>

            <div className="lp-rates rv rv-d2">
              <div className="lp-rate">
                <div className="lp-rate__v">
                  1 <Flame size={20} /> = <em>3 ₽</em>
                </div>
                <div className="lp-rate__k">Курс фиксирован, не зависит от доллара</div>
              </div>
              <div className="lp-rate">
                <div className="lp-rate__v">
                  <em>0 ₽</em> / мес
                </div>
                <div className="lp-rate__k">Без абонплаты — пополняй, когда нужно</div>
              </div>
              <div className="lp-rate">
                <div className="lp-rate__v">
                  <em>∞</em> срок
                </div>
                <div className="lp-rate__k">Спички не сгорают и не обнуляются</div>
              </div>
            </div>

            <div className="lp-gift rv rv-d3">
              <div className="lp-gift__n">9</div>
              <div className="lp-gift__t">
                спичек в подарок
                <br />
                сразу после входа
              </div>
              <p className="lp-gift__d">
                Хватит на 6 картинок в Midjourney, 11 ответов GPT‑5.4 или два коротких видео —
                чтобы попробовать всё без оплаты.
              </p>
            </div>
          </div>

          <div className="lp-menu rv rv-d1">
            <div className="lp-menu__head">
              <span>Прейскурант</span>
              <span>
                от · <Flame size={11} /> / ₽
              </span>
            </div>
            {MENU.map((g) => (
              <div key={g.group}>
                <div className="lp-menu__group">{g.group}</div>
                {g.rows.map((r) => (
                  <div className="lp-menu__row" key={r.name}>
                    <div className="lp-menu__name">
                      {r.name}
                      <small>{r.note}</small>
                    </div>
                    <span className="lp-menu__dots" />
                    <span className="lp-menu__cost">
                      {String(r.cost).replace('.', ',')} <Flame size={13} />
                      <small>≈ {rub(r.cost)} ₽</small>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div className="lp-menu__foot">
              Цены «от» — итог зависит от разрешения, длительности и параметров. Точная стоимость
              видна до запуска генерации.
            </div>
          </div>
        </div>

        <div className="lp-plans">
          {PLANS.map((p, i) => (
            <div className={`lp-plan ${p.hot ? 'lp-plan--hot' : ''} rv rv-d${i + 1}`} key={p.name}>
              <div className="lp-plan__name">
                {p.name}
                {p.hot && <span className="lp-plan__badge">ПОПУЛЯРНЫЙ</span>}
              </div>
              <div className="lp-plan__price">
                {p.price.toLocaleString('ru-RU')}
                <small>₽ / мес</small>
              </div>
              <div className="lp-plan__tokens">
                {p.tokens.toLocaleString('ru-RU')} <Flame size={12} /> каждый месяц
              </div>
              <ul>
                {p.perks.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="lp-plans__note rv">
          Подписка — для тех, кто пользуется каждый день: спички дешевле не становятся, зато часть
          моделей работает без списания. После окончания подписки накопленные спички остаются.
        </p>
      </section>

      {/* ── 03 факты ── */}
      <section className="lp-sec lp-sec--tight">
        <div className="lp-rule rv">
          <span className="lp-rule__n">03</span> Почему спички
        </div>
        <div className="lp-facts rv">
          <div className="lp-fact">
            <div className="lp-fact__k">Доступ</div>
            <div className="lp-fact__v">Без VPN и зарубежных карт</div>
            <p>Работает из России. Оплата картой РФ, Telegram Stars, USDT или зарубежной картой.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Баланс</div>
            <div className="lp-fact__v">Один кошелёк на всё</div>
            <p>Не нужно держать пять подписок. Пополнил один раз — тратишь на любую модель.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Память</div>
            <div className="lp-fact__v">История и референсы</div>
            <p>Все генерации сохраняются. Любую картинку можно взять референсом для следующей.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Друзья</div>
            <div className="lp-fact__v">15% кэшбек с покупок друзей</div>
            <p>Приглашай по ссылке — с каждой их покупки капают спички на генерации или вывод.</p>
          </div>
        </div>
      </section>

      {/* ── 04 приложение ── */}
      <section className="lp-sec" id="app">
        <div className="lp-rule rv">
          <span className="lp-rule__n">04</span> На телефон
        </div>
        <div className="rv">
          <PwaSection appHref={appHref} />
        </div>
      </section>

      {/* ── 05 FAQ ── */}
      <section className="lp-sec lp-sec--tight" id="faq">
        <div className="lp-rule rv">
          <span className="lp-rule__n">05</span> Вопросы
        </div>
        <div className="lp-faq rv">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── финал ── */}
      <section className="lp-final">
        <div className="lp-final__glow" />
        <h2 className="lp-h1 rv">
          Чиркни{' '}
          <span className="lp-nowrap">
            <em>спичкой</em>
            <span className="lp-dot" />
          </span>
        </h2>
        <p className="lp-lead rv rv-d1">
          Регистрация за минуту — через Telegram или почту. 9 спичек уже ждут на балансе.
        </p>
        <div className="lp-final__cta rv rv-d2">
          <a className="lp-btn lp-btn--primary lp-btn--lg" href={appHref}>
            Начать бесплатно
            <ArrowRight className="lp-btn__arrow" size={18} />
          </a>
          <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#app">
            <Smartphone size={18} />
            Установить на телефон
          </a>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer__in">
          <div>© {new Date().getFullYear()} SPICHKI AI · ИП Аневич А. С. · ИНН 246220127244</div>
          <div className="lp-footer__links">
            <a href="/privacy">Конфиденциальность</a>
            <a href="/terms">Соглашение</a>
            <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer">
              Поддержка
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
