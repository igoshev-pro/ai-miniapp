'use client'

import { useEffect, useState } from 'react'
import { ArrowUp, Check, Music, Play, Flame} from 'lucide-react'

/**
 * Живое демо внутри макета телефона на лендинге: по кругу «печатает» промт,
 * показывает генерацию и результат для четырёх категорий. Картинки берём
 * из public/covers — те же, что обложки категорий в приложении.
 */

type SceneId = 'chat' | 'image' | 'video' | 'audio'

interface Scene {
  id: SceneId
  cat: string
  model: string
  cost: string
  prompt: string
  answer?: string
  hold: number
}

const SCENES: Scene[] = [
  {
    id: 'chat',
    cat: 'Текст',
    model: 'GPT‑5.4',
    cost: '0.8',
    prompt: 'Придумай 3 названия для кофейни в стиле 90‑х',
    answer:
      '1. «Дискета» — кофе и ностальгия\n2. «Тамагочи» — корми себя вовремя\n3. «Пейджер» — короткие сообщения, крепкий эспрессо',
    hold: 4200,
  },
  {
    id: 'image',
    cat: 'Картинка',
    model: 'Midjourney',
    cost: '1.3',
    prompt: 'Стеклянный куб с золотыми искрами, макро, дым',
    hold: 3000,
  },
  {
    id: 'video',
    cat: 'Видео',
    model: 'Veo 3.1 Fast',
    cost: '15',
    prompt: 'Облёт неоновой кинокамеры, 8 секунд, 1080p',
    hold: 3600,
  },
  {
    id: 'audio',
    cat: 'Аудио',
    model: 'Suno V5',
    cost: '12',
    prompt: 'Лоу‑фай трек для работы, тёплый, без слов',
    hold: 3200,
  },
]

type Phase = 'typing' | 'gen' | 'done'

const TYPE_MS = 38
const GEN_MS = 1400
const ANSWER_MS = 16

const WAVE = [40, 70, 55, 90, 65, 45, 80, 60, 95, 50, 75, 40, 85, 60, 70, 45, 90, 55, 65, 80, 50, 70, 40, 85]

export function PhoneDemo() {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const [typed, setTyped] = useState(0)
  const [answered, setAnswered] = useState(0)

  const scene = SCENES[idx]

  // Печать промта
  useEffect(() => {
    if (phase !== 'typing') return
    if (typed >= scene.prompt.length) {
      const t = setTimeout(() => setPhase('gen'), 350)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTyped((n) => n + 1), TYPE_MS)
    return () => clearTimeout(t)
  }, [phase, typed, scene.prompt.length])

  // Генерация
  useEffect(() => {
    if (phase !== 'gen') return
    const t = setTimeout(() => setPhase('done'), GEN_MS)
    return () => clearTimeout(t)
  }, [phase])

  // Стриминг ответа в чате
  useEffect(() => {
    if (phase !== 'done' || !scene.answer) return
    if (answered >= scene.answer.length) return
    const t = setTimeout(() => setAnswered((n) => n + 1), ANSWER_MS)
    return () => clearTimeout(t)
  }, [phase, answered, scene.answer])

  // Пауза на результате и переход к следующей сцене
  useEffect(() => {
    if (phase !== 'done') return
    const extra = scene.answer ? scene.answer.length * ANSWER_MS : 0
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % SCENES.length)
      setPhase('typing')
      setTyped(0)
      setAnswered(0)
    }, scene.hold + extra)
    return () => clearTimeout(t)
  }, [phase, scene.hold, scene.answer])

  const promptShown = scene.prompt.slice(0, typed)

  return (
    <div className="ph-wrap" aria-hidden="true">
      <div className="ph">
        <div className="ph__notch" />
        <div className="ph__screen">
          <div className="ph__head">
            <span className="ph__brand">SPICHKI AI</span>
            <span className="ph__balance">
              <Flame size={11} /> 9.0
            </span>
          </div>

          <div className="ph__modelbar">
            <span>
              <small>{scene.cat} · </small>
              <b>{scene.model}</b>
            </span>
            <span className="ph__cost">
              {scene.cost} <Flame size={10} />
            </span>
          </div>

          <div className="ph__scene" key={`${idx}-${phase === 'typing' ? 't' : 'x'}`}>
            {phase !== 'typing' && (
              <div className="dm-bubble dm-bubble--user dm-in">{scene.prompt}</div>
            )}

            {scene.id === 'chat' && phase === 'gen' && (
              <div className="dm-bubble dm-bubble--ai dm-in">
                <span className="dm-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            {scene.id === 'chat' && phase === 'done' && scene.answer && (
              <div className="dm-bubble dm-bubble--ai dm-in">
                {scene.answer.slice(0, answered)}
                {answered < scene.answer.length && <span className="ph__caret" />}
              </div>
            )}

            {scene.id === 'image' && phase !== 'typing' && (
              <div className="dm-media dm-in">
                {phase === 'gen' ? (
                  <div className="dm-shimmer">
                    <span className="dm-shimmer__label">Midjourney рисует…</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/covers/image2.webp" alt="" />
                    <span className="dm-tag">
                      <Check size={11} /> Готово · <b>1.3 <Flame size={10} /></b>
                    </span>
                  </>
                )}
              </div>
            )}

            {scene.id === 'video' && phase !== 'typing' && (
              <div className="dm-media dm-media--wide dm-in">
                {phase === 'gen' ? (
                  <div className="dm-shimmer">
                    <span className="dm-shimmer__label">Veo 3.1 снимает…</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/covers/video.webp" alt="" />
                    <span className="dm-play">
                      <Play size={16} fill="currentColor" />
                    </span>
                    <span className="dm-progress">
                      <i />
                    </span>
                    <span className="dm-tag">
                      1080p · 8 с · <b>15 <Flame size={10} /></b>
                    </span>
                  </>
                )}
              </div>
            )}

            {scene.id === 'audio' && phase !== 'typing' && (
              <div className="dm-audio dm-in">
                <div className="dm-audio__top">
                  <span className="dm-audio__cover">
                    <Music size={18} />
                  </span>
                  <div>
                    <div className="dm-audio__title">
                      {phase === 'gen' ? 'Suno V5 сочиняет…' : 'Warm Desk Lo‑fi'}
                    </div>
                    <div className="dm-audio__meta">
                      {phase === 'gen' ? 'инструментал · ~2 мин' : '2:14 · 12 спичек · без слов'}
                    </div>
                  </div>
                </div>
                <div className={`dm-wave ${phase === 'done' ? 'dm-wave--live' : ''}`}>
                  {WAVE.map((h, i) => (
                    <i
                      key={i}
                      style={{ ['--h' as string]: `${h}%`, animationDelay: `${(i % 6) * 0.11}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ph__input">
            {phase === 'typing' ? (
              <span className="ph__input-text">
                {promptShown}
                <span className="ph__caret" />
              </span>
            ) : phase === 'gen' ? (
              <span className="ph__input-text ph__input-text--dim">Генерирую…</span>
            ) : (
              <span className="ph__input-text ph__input-text--dim">Что делаем дальше?</span>
            )}
            <span className={`ph__send ${phase === 'gen' ? 'ph__send--busy' : ''}`}>
              {phase === 'gen' ? <span className="ph__spin" /> : <ArrowUp size={16} strokeWidth={2.5} />}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
