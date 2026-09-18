import type { Metadata } from 'next'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'SPICHKI AI — все нейросети в одном приложении',
  description:
    'GPT-5.4, Claude Opus, Midjourney, Veo 3.1, Sora 2, Kling, Suno и ещё 40+ моделей в одном окне. Без VPN, оплата картой РФ. 9 спичек в подарок при регистрации.',
  openGraph: {
    title: 'SPICHKI AI — все нейросети. Одна спичка.',
    description:
      '45+ нейросетей для текста, картинок, видео и звука. Платишь только за результат. 9 спичек в подарок.',
    type: 'website',
    locale: 'ru_RU',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
}

export default function StartPage() {
  // Логотип заказчика появляется после `bash scripts/brand.sh`; пока файла
  // нет — шапка и макет телефона показывают прежние заглушки.
  const brandMark = existsSync(path.join(process.cwd(), 'public', 'brand', 'mark-256.png'))

  // Список креативов читаем здесь, на сервере, и отдаём странице готовым.
  // Сетевой запрос за списком не годится: на бою nginx уводит /api/* в бэкенд.
  let assets: string[] = []
  try {
    assets = readdirSync(path.join(process.cwd(), 'public', 'landing')).filter((n) => !n.startsWith('.'))
  } catch {
    assets = []
  }

  return <LandingPage brandMark={brandMark} assets={assets} />
}
