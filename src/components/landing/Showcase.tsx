'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Flame, Play } from 'lucide-react'
import { assetUrl, useLandingAssets } from './assets'

/**
 * Блок «Кейсы»: настоящие результаты генерации с промптом и ценой.
 * Три части: вертикальные ролики, пары «до/после» с ползунком, сетка картинок.
 *
 * Все файлы лежат в public/landing/ и добавляются заказчиком по списку промптов.
 * Пока файла нет — карточка показывает запасную обложку из public/covers,
 * чтобы страница не ломалась; как только файл появится, он подхватится сам.
 * Цены — из src/lib/data.ts (cost), «/сек» — модели с посекундной тарификацией.
 */

const FALLBACK = ['/covers/image2.webp', '/covers/video.webp', '/covers/text3.webp', '/covers/audio2.webp']

export interface Reel {
  file: string
  title: string
  model: string
  cost: string
  perSec?: boolean
  prompt: string
}

export const REELS: Reel[] = [
  {
    file: 'v-sneakers.mp4',
    title: 'Реклама кроссовок',
    model: 'Kling 3.0',
    cost: '4,3',
    perSec: true,
    prompt: 'Белые кроссовки медленно вращаются на подиуме, капли воды в воздухе, студийный свет, глянцевый пол',
  },
  {
    file: 'v-drink.mp4',
    title: 'Ролик для напитка',
    model: 'Veo 3.1 Fast',
    cost: '15',
    prompt: 'Стакан лимонада в каплях конденсата, лёд падает рядом, брызги, замедленная съёмка, холодный свет',
  },
  {
    file: 'v-logo.mp4',
    title: 'Заставка для бренда',
    model: 'Seedance 2.5',
    cost: '8,4',
    prompt: 'Спичка на чёрном зеркальном полу вспыхивает: искры, золотое пламя, отражение. Камера медленно облетает по кругу',
  },
  {
    file: 'v-portrait.mp4',
    title: 'Видео‑аватар',
    model: 'Sora 2',
    cost: '13',
    prompt: 'Девушка в деловом костюме поворачивает голову к камере и улыбается, студийный свет, офис в размытии',
  },
  {
    file: 'v-food.mp4',
    title: 'Доставка еды',
    model: 'Seedance 2.5',
    cost: '8,4',
    prompt: 'Рука поднимает кусок пиццы с доски, нити моцареллы тянутся вниз, лёгкий пар. Медленный наезд, тёплый свет',
  },
  {
    file: 'v-interior.mp4',
    title: 'Тур по квартире',
    model: 'Veo 3.1 Fast',
    cost: '15',
    prompt: 'Плавный облёт гостиной в скандинавском стиле, утренний свет из окна, растения',
  },
]

export interface Pair {
  before: string
  after: string
  title: string
  model: string
  cost: string
  prompt: string
}

export const PAIRS: Pair[] = [
  {
    before: 'before-product.webp',
    after: 'after-product.webp',
    title: 'Товар для маркетплейса',
    model: 'GPT Image 2.5 Sunburst',
    cost: '1,8',
    prompt: 'Та же сумка на белом студийном фоне, мягкий свет, тень, отражение, съёмка для маркетплейса',
  },
  {
    before: 'before-portrait.webp',
    after: 'after-portrait.webp',
    title: 'Деловой портрет из селфи',
    model: 'Nano Banana Pro',
    cost: '6',
    prompt: 'Деловой портрет по фото: костюм, студийный свет, размытый офис, лёгкая ретушь',
  },
  {
    before: 'before-room.webp',
    after: 'after-room.webp',
    title: 'Ремонт до начала ремонта',
    model: 'Flux 2 Img2Img',
    cost: '1,8',
    prompt: 'Та же комната в скандинавском стиле: светлая мебель, растения, тёплый вечерний свет',
  },
  {
    before: 'before-sketch.webp',
    after: 'after-sketch.webp',
    title: 'Скетч → иллюстрация',
    model: 'Nano Banana 2',
    cost: '3,3',
    prompt: 'Набросок превращён в цветную иллюстрацию с объёмом и мягкими тенями',
  },
]

export interface Result {
  file: string
  title: string
  model: string
  cost: string
  prompt: string
  ratio: 'single' | 'wide'
}

export const RESULTS: Result[] = [
  {
    file: 'r-stickers.webp',
    title: 'Стикерпак для Telegram',
    model: 'Nano Banana Pro',
    cost: '6',
    prompt: 'Набор из 9 стикеров: персонаж‑огонёк, девять эмоций, белая обводка, подпись под каждым',
    ratio: 'single',
  },
  {
    file: 'r-card.webp',
    title: 'Карточка для Wildberries',
    model: 'GPT Image 2.5 Flare',
    cost: '1,8',
    prompt: 'Крем в стеклянной баночке, пастельный фон, капли воды, место под инфографику',
    ratio: 'single',
  },
  {
    file: 'r-character.webp',
    title: 'Один герой — четыре сцены',
    model: 'Gemini Omni Character',
    cost: '9',
    prompt: 'Персонаж по референс‑фото в четырёх сценах: кафе, офис, улица, спортзал — одно лицо везде',
    ratio: 'wide',
  },
  {
    file: 'r-poster.webp',
    title: 'Постер кофейни',
    model: 'GPT Image 2.5 Sunburst',
    cost: '1,8',
    prompt: 'Чашка кофе на тёмном фоне, пар, зёрна, тёплый свет, пустое место сверху под заголовок',
    ratio: 'single',
  },
  {
    file: 'r-menu.webp',
    title: 'Фото для меню',
    model: 'Flux 2',
    cost: '1,8',
    prompt: 'Бургер на тёмном фоне, капли соуса, кунжут, фуд‑фотография для меню',
    ratio: 'single',
  },
  {
    file: 'r-thumb.webp',
    title: 'Превью для YouTube',
    model: 'Nano Banana 2',
    cost: '3,3',
    prompt: 'Удивлённый ведущий крупным планом, яркий контрастный фон, крупный объект в кадре',
    ratio: 'wide',
  },
  {
    file: 'r-cover.webp',
    title: 'Обложка + трек',
    model: 'Nano Banana Pro + Suno V5',
    cost: '6 + 12',
    prompt: 'Обложка: неоновый ночной город сверху, лоу‑фай. Трек: тёплый лоу‑фай для работы, без слов',
    ratio: 'single',
  },
  {
    file: 'r-avatar.webp',
    title: '3D‑аватар по фото',
    model: 'Seedream 5.0 Pro',
    cost: '3,2',
    prompt: 'Аватар в стиле 3D‑иллюстрации по селфи, мягкий свет, яркий фон для соцсетей',
    ratio: 'single',
  },
]

/* ── картинка: настоящая, если файл есть, иначе запасная обложка ── */
function Pic({ file, have, fallback, className }: { file: string; have: Set<string>; fallback: string; className?: string }) {
  const ok = have.has(file)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ok ? assetUrl(file) : fallback}
      alt=""
      className={className}
      loading="lazy"
      data-missing={ok ? undefined : '1'}
    />
  )
}

/* ── ролик: играет сам, без звука; если файла нет — показываем обложку ── */
function ReelCard({ reel, missing, fallback, appHref }: { reel: Reel; missing: boolean; fallback: string; appHref: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v || missing) return
    // Играем только когда карточка в кадре — шесть роликов разом на телефоне лишние.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [missing])

  return (
    <article className={`sc-reel ${missing ? 'sc-reel--missing' : ''}`}>
      <div className="sc-reel__media">
        {missing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fallback} alt="" loading="lazy" />
        ) : (
          <video ref={ref} src={assetUrl(reel.file)} muted loop playsInline preload="metadata" />
        )}
        {missing && (
          <span className="sc-reel__soon">
            <Play size={14} /> скоро
          </span>
        )}
        <div className="sc-reel__shade" />
      </div>
      <span className="sc-reel__bar" aria-hidden="true">
        <i />
      </span>
      <div className="sc-reel__body">
        <div className="sc-reel__tag">
          <span>{reel.model}</span>
          <span className="sc-reel__price">
            {reel.cost} <Flame size={11} />
            {reel.perSec && <small>/сек</small>}
          </span>
        </div>
        <h3 className="sc-reel__title">{reel.title}</h3>
        <p className="sc-reel__prompt">{reel.prompt}</p>
        <a className="sc-reel__cta" href={appHref}>
          Повторить <ArrowRight size={13} />
        </a>
      </div>
    </article>
  )
}

/* ── до/после с ползунком ── */
function BeforeAfter({ pair, have, fallback }: { pair: Pair; have: Set<string>; fallback: string }) {
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setFromX = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const p = ((clientX - r.left) / r.width) * 100
    setPos(Math.max(2, Math.min(98, p)))
  }, [])

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setFromX(e.clientX)
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragging.current) setFromX(e.clientX)
  }
  const onUp = () => {
    dragging.current = false
  }

  return (
    <article className="sc-pair">
      <div
        className="sc-pair__box"
        ref={box}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        aria-label="Сравнить до и после"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(2, p - 4))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(98, p + 4))
        }}
      >
        <Pic file={pair.after} have={have} fallback={fallback} className="sc-pair__img" />
        <div className="sc-pair__before" style={{ width: `${pos}%` }}>
          <Pic file={pair.before} have={have} fallback={fallback} className="sc-pair__img" />
        </div>
        <span className="sc-pair__label sc-pair__label--l">до</span>
        <span className="sc-pair__label sc-pair__label--r">после</span>
        <div className="sc-pair__handle" style={{ left: `${pos}%` }}>
          <span />
        </div>
      </div>
      <div className="sc-pair__body">
        <div className="sc-reel__tag">
          <span>{pair.model}</span>
          <span className="sc-reel__price">
            {pair.cost} <Flame size={11} />
          </span>
        </div>
        <h3 className="sc-reel__title">{pair.title}</h3>
        <p className="sc-reel__prompt">{pair.prompt}</p>
      </div>
    </article>
  )
}

const ALL_FILES = [
  ...REELS.map((r) => r.file),
  ...PAIRS.flatMap((p) => [p.before, p.after]),
  ...RESULTS.map((r) => r.file),
]

export function Showcase({ appHref }: { appHref: string }) {
  const have = useLandingAssets(ALL_FILES)

  return (
    <>
      {/* ── ролики ── */}
      <div className="sc-reels" role="list">
        {REELS.map((r, i) => (
          <div role="listitem" key={r.file} className={`rv rv-d${(i % 4) + 1}`}>
            <ReelCard reel={r} missing={!have.has(r.file)} fallback={FALLBACK[i % FALLBACK.length]} appHref={appHref} />
          </div>
        ))}
      </div>

      {/* ── до / после ── */}
      <div className="sc-sub rv">
        <h3 className="sc-sub__h">
          Загрузи своё фото — <em>получи готовое</em>
        </h3>
        <p className="sc-sub__p">Потяни ползунок.</p>
      </div>
      <div className="sc-pairs">
        {PAIRS.map((p, i) => (
          <div key={p.after} className={`rv rv-d${(i % 2) + 1}`}>
            <BeforeAfter pair={p} have={have} fallback={FALLBACK[(i + 1) % FALLBACK.length]} />
          </div>
        ))}
      </div>

      {/* ── результаты ── */}
      <div className="sc-sub rv">
        <h3 className="sc-sub__h">
          Промпт слева — <em>результат справа</em>
        </h3>
        <p className="sc-sub__p">Промпт целиком, цена указана.</p>
      </div>
      <div className="sc-grid">
        {RESULTS.map((r, i) => (
          <article key={r.file} className={`sc-item sc-item--${r.ratio} rv rv-d${(i % 4) + 1}`}>
            <div className="sc-item__media">
              <Pic file={r.file} have={have} fallback={FALLBACK[(i + 2) % FALLBACK.length]} />
            </div>
            <div className="sc-item__body">
              <div className="sc-reel__tag">
                <span>{r.model}</span>
                <span className="sc-reel__price">
                  {r.cost} <Flame size={11} />
                </span>
              </div>
              <h3 className="sc-reel__title">{r.title}</h3>
              <p className="sc-reel__prompt">{r.prompt}</p>
            </div>
          </article>
        ))}

        {/* хвост сетки — призыв вместо пустых ячеек */}
        <a className="sc-item sc-item--wide sc-item--cta rv rv-d3" href={appHref}>
          <div className="sc-cta__n">9</div>
          <div>
            <div className="sc-cta__t">
              Твоя задача — <em>следующая</em>
            </div>
            <p className="sc-cta__p">9 спичек сразу после входа.</p>
            <span className="sc-cta__btn">
              Начать бесплатно <ArrowRight size={16} />
            </span>
          </div>
        </a>
      </div>
    </>
  )
}
