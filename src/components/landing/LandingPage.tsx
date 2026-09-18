'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Smartphone, Flame} from 'lucide-react'
import { PhoneDemo } from './PhoneDemo'
import { PwaSection } from './PwaSection'
import { Showcase } from './Showcase'
import { Cursor } from './Cursor'
import { WaterBg } from './WaterBg'
import { assetUrl, useLandingAssets } from './assets'
import './landing.css'

/**
 * Лендинг /start — страница для трафика. Единственная цель: регистрация.
 * Все кнопки ведут в приложение с ?auth=1 (SpichkiApp откроет окно входа),
 * реферальный код из ?ref= прокидывается дальше — его читает useAuth.
 */

const FONTS =
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap'

const SUPPORT_LINK = 'https://t.me/spichki_ai_help'

/**
 * Флагманы, которые лендинг называет «в лоб». Сверено с каталогом бэкенда
 * (provider-registry.service.ts). Появится модель новее — меняем только здесь.
 */
const FLAGSHIPS = {
  text: ['GPT‑6 Astra', 'Claude Opus 4.8', 'Gemini 3.1 Pro', 'Grok 4.5'],
  image: ['Nano Banana Pro', 'GPT Image 2.5', 'Seedream 5.0 Pro', 'Flux 2'],
  video: ['Veo 3.1 Pro', 'Sora 2 Pro', 'Kling 3.0', 'Seedance 2.5'],
  audio: ['Suno V5', 'ElevenLabs v3'],
}
const HERO_LIST = [
  'GPT‑6',
  'Claude Opus 4.8',
  'Nano Banana Pro',
  'Veo 3.1 Pro',
  'Sora 2 Pro',
  'Kling 3.0',
  'Seedance 2.5',
  'Suno V5',
].join(', ')


const TICKER_A = [
  ['GPT‑6 Astra', 'OpenAI'],
  ['Claude Opus 4.8', 'Anthropic'],
  ['Nano Banana Pro', 'Google'],
  ['Veo 3.1 Pro', 'Google'],
  ['Sora 2 Pro', 'OpenAI'],
  ['Kling 3.0', 'Kuaishou'],
  ['Seedance 2.5', 'ByteDance'],
  ['Wan 2.7', 'Alibaba'],
  ['Claude Sonnet 5', 'Anthropic'],
  ['GPT Image 2.5', 'OpenAI'],
  ['Gemini 3.1 Pro', 'Google'],
  ['Grok 4.5', 'xAI'],
]

const TICKER_B = [
  ['GPT‑5.6 Sol', 'OpenAI'],
  ['Seedream 5.0 Pro', 'ByteDance'],
  ['Suno V5', 'музыка'],
  ['ElevenLabs v3', 'озвучка'],
  ['Gemini Omni Character', 'персонажи'],
  ['Flux 2', 'Black Forest'],
  ['Imagen 4 Ultra', 'Google'],
  ['DeepSeek V4 Pro', 'DeepSeek'],
  ['Hailuo 2.3 Pro', 'MiniMax'],
  ['Midjourney', 'v7'],
  ['Topaz', 'апскейл видео'],
  ['Perplexity Sonar', 'поиск'],
]

// Тарифы — из billing.service.ts (FALLBACK_SUBSCRIPTION_PLANS). У всех одна
// структура из четырёх строк, чтобы карточки читались как таблица:
// доступ к моделям · бесплатный текст · бесплатные картинки · очередь.
const PLANS = [
  {
    name: 'Basic',
    price: 450,
    tokens: 150,
    hot: false,
    perks: ['Базовый набор моделей', 'Текст — за спички', 'Картинки — за спички', 'Обычная очередь'],
  },
  {
    name: 'Plus',
    price: 990,
    tokens: 330,
    hot: true,
    perks: ['Все модели каталога', 'Текст бесплатно, 60 в сутки', 'Картинки — за спички', 'Обычная очередь'],
  },
  {
    name: 'Max',
    price: 2490,
    tokens: 830,
    hot: false,
    perks: ['Все модели каталога', 'Текст бесплатно, без лимита', 'Картинки — за спички', 'Приоритетная очередь'],
  },
  {
    name: 'Ultimate',
    price: 5990,
    tokens: 1997,
    hot: false,
    perks: ['Все модели каталога', 'Текст бесплатно, без лимита', 'Картинки бесплатно, 60 в сутки', 'Приоритетная очередь'],
  },
]

const FAQ = [
  {
    q: 'Что такое спичка?',
    a: 'Валюта сервиса, 1 спичка = 3 ₽. Один баланс на все модели, не сгорает.',
  },
  {
    q: 'Нужен ли VPN или зарубежная карта?',
    a: 'Нет. Работает из России, оплата картой РФ, Stars или криптой.',
  },
  {
    q: 'Что я получу при регистрации?',
    a: '9 спичек сразу после входа: хватит на 5 картинок или пару коротких видео.',
  },
  {
    q: 'Это приложение или сайт?',
    a: 'И то, и другое: браузер, приложение на телефоне без магазинов, Telegram. Баланс общий.',
  },
  {
    q: 'Куда деваются мои генерации?',
    a: 'В историю. Оттуда можно скачать, добавить в избранное или взять референсом.',
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

const COVER_FILES = ['case-text.webp', 'after-product.webp', 'case-video.webp', 'r-cover.webp']

export function LandingPage({ brandMark = false }: { brandMark?: boolean }) {
  const appHref = useAppHref()
  useReveal()
  // Обложки категорий: сгенерированные из public/landing, пока их нет — из приложения
  const have = useLandingAssets(COVER_FILES)
  const cover = (file: string, fallback: string) => (have.has(file) ? assetUrl(file) : fallback)

  return (
    <div className={`lp ${brandMark ? 'lp--brand' : ''}`}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS} precedence="default" />

      <Cursor />

      <div className="lp-bg" aria-hidden="true">
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <WaterBg />
        <div className="lp-bg__grain" />
      </div>

      {/* ── навигация ── */}
      <header className="lp-nav">
        <div className="lp-nav__in">
          <a className="lp-logo" href="/start" aria-label="SPICHKI AI">
            {brandMark ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lp-logo__mark" src="/brand/mark-256.png" alt="" />
                <span className="lp-logo__word">SPICHKI</span>
                <span className="lp-logo__ai">AI</span>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Спички" />
                <span className="lp-logo__ai">AI</span>
              </>
            )}
          </a>
          <nav className="lp-nav__links">
            <a href="#cases">Кейсы</a>
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
            48 нейросетей · без VPN · карта РФ
          </div>
          <h1 className="lp-h1 rv rv-d1">
            Все нейросети.
            <br />
            Один{' '}
            <span className="lp-nowrap">
              <em>баланс</em>
              <span className="lp-dot" />
            </span>
          </h1>
          <p className="lp-hero__sub rv rv-d2">
            <strong>{HERO_LIST}</strong> — в одном окне. Платишь спичками только за результат.
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

      {/* ── 01 кейсы ── */}
      <section className="lp-sec" id="cases">
        <div className="lp-rule rv">
          <span className="lp-rule__n">01</span> Сделано в Спичках
        </div>
        <div className="lp-sec__head">
          <h2 className="lp-h2 rv">
            Реальные задачи. <em>С ценой.</em>
          </h2>
          <p className="lp-lead rv rv-d1">Под каждым примером — промпт и сколько это стоило.</p>
        </div>
        <Showcase appHref={appHref} />
      </section>

      {/* ── 02 модели ── */}
      <section className="lp-sec" id="models">
        <div className="lp-rule rv">
          <span className="lp-rule__n">02</span> Что внутри
        </div>
        <div className="lp-sec__head">
          <h2 className="lp-h2 rv">
            Текст, картинки, видео, звук. <em>Один аккаунт.</em>
          </h2>
        </div>

        <div className="lp-bento">
          <article className="lp-card lp-card--text rv">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover('case-text.webp', '/covers/text3.webp')} alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Текст</span>
            <span className="lp-card__count">11 моделей</span>
            <h3 className="lp-card__title">GPT‑6 и Claude Opus 4.8</h3>
            <div className="lp-chips">
              {FLAGSHIPS.text.map((m) => (
                <span className="lp-chip" key={m}>{m}</span>
              ))}
              <span className="lp-chip">Claude Sonnet 5</span>
              <span className="lp-chip">GPT‑5.6</span>
              <span className="lp-chip lp-chip--more">+5</span>
            </div>
          </article>

          <article className="lp-card lp-card--image rv rv-d1">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover('after-product.webp', '/covers/image2.webp')} alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Картинки</span>
            <span className="lp-card__count">15 моделей</span>
            <h3 className="lp-card__title">Nano Banana Pro и GPT Image 2.5</h3>
            <div className="lp-chips">
              {FLAGSHIPS.image.map((m) => (
                <span className="lp-chip" key={m}>{m}</span>
              ))}
              <span className="lp-chip lp-chip--more">+11</span>
            </div>
          </article>

          <article className="lp-card lp-card--video rv">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover('case-video.webp', '/covers/video.webp')} alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Видео</span>
            <span className="lp-card__count">16 моделей</span>
            <h3 className="lp-card__title">Видео со звуком</h3>
            <div className="lp-chips">
              {FLAGSHIPS.video.map((m) => (
                <span className="lp-chip" key={m}>{m}</span>
              ))}
              <span className="lp-chip lp-chip--more">+12</span>
            </div>
          </article>

          <article className="lp-card lp-card--audio rv rv-d1">
            <div className="lp-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover('r-cover.webp', '/covers/audio2.webp')} alt="" loading="lazy" />
            </div>
            <span className="lp-card__tag">Аудио</span>
            <span className="lp-card__count">6 моделей</span>
            <h3 className="lp-card__title">Музыка и голос</h3>
            <div className="lp-chips">
              {FLAGSHIPS.audio.map((m) => (
                <span className="lp-chip" key={m}>{m}</span>
              ))}
              <span className="lp-chip">Диалоги</span>
              <span className="lp-chip lp-chip--more">+3</span>
            </div>
          </article>

          <article className="lp-card lp-card--stat rv rv-d2">
            <div className="lp-stat__n">
              48
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
          <span className="lp-rule__n">03</span> Сколько стоит
        </div>
        <div className="lp-price">
          <div>
            <h2 className="lp-h2 rv">
              Платишь за результат, <em>а не за подписку</em>
            </h2>
            <p className="lp-lead rv rv-d1">Одна валюта на все модели. Списание только за генерацию.</p>

            <div className="lp-rates rv rv-d2">
              <div className="lp-rate">
                <div className="lp-rate__v">
                  1 <Flame size={20} /> = <em>3 ₽</em>
                </div>
                <div className="lp-rate__k">Курс фиксирован</div>
              </div>
              <div className="lp-rate">
                <div className="lp-rate__v">
                  <em>0 ₽</em> / мес
                </div>
                <div className="lp-rate__k">Без абонплаты</div>
              </div>
              <div className="lp-rate">
                <div className="lp-rate__v">
                  <em>∞</em> срок
                </div>
                <div className="lp-rate__k">Спички не сгорают</div>
              </div>
            </div>

            <div className="lp-gift rv rv-d3">
              <div className="lp-gift__n">9</div>
              <div className="lp-gift__t">
                спичек в подарок
                <br />
                сразу после входа
              </div>
              <p className="lp-gift__d">Хватит на 5 картинок или пару коротких видео.</p>
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
        <p className="lp-plans__note rv">Часть моделей по подписке без списания. Спички остаются после её окончания.</p>
      </section>

      {/* ── 03 факты ── */}
      <section className="lp-sec lp-sec--tight">
        <div className="lp-rule rv">
          <span className="lp-rule__n">04</span> Почему спички
        </div>
        <div className="lp-facts rv">
          <div className="lp-fact">
            <div className="lp-fact__k">Доступ</div>
            <div className="lp-fact__v">Без VPN и зарубежных карт</div>
            <p>Карта РФ, Stars, USDT.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Баланс</div>
            <div className="lp-fact__v">Один кошелёк на всё</div>
            <p>Пополнил раз — тратишь на любую модель.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Память</div>
            <div className="lp-fact__v">История и референсы</div>
            <p>Всё сохраняется, любое фото — референс.</p>
          </div>
          <div className="lp-fact">
            <div className="lp-fact__k">Друзья</div>
            <div className="lp-fact__v">15% кэшбек с покупок друзей</div>
            <p>С каждой покупки друга — спички тебе.</p>
          </div>
        </div>
      </section>

      {/* ── 04 приложение ── */}
      <section className="lp-sec" id="app">
        <div className="lp-rule rv">
          <span className="lp-rule__n">05</span> На телефон
        </div>
        <div className="rv">
          <PwaSection appHref={appHref} />
        </div>
      </section>

      {/* ── 05 FAQ ── */}
      <section className="lp-sec lp-sec--tight" id="faq">
        <div className="lp-rule rv">
          <span className="lp-rule__n">06</span> Вопросы
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
          Вход через Telegram или почту. 9 спичек уже на балансе.
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
