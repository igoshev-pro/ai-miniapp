import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

/**
 * Список файлов креативов в public/landing — один запрос вместо десятков HEAD.
 *
 * Зачем: лендинг показывает запасную обложку, пока файла нет. Проверять
 * наличие HEAD-запросами оказалось дорого в dev: каждый 404 заставляет Next
 * рендерить страницу not-found, и двадцать промахов подряд вешают страницу
 * на минуты. Здесь просто читаем каталог.
 *
 * В Docker public/ копируется рядом со standalone (см. Dockerfile), поэтому
 * process.cwd()/public существует и в проде.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'landing')
    const names = await readdir(dir)
    const files = names.filter((n) => !n.startsWith('.'))
    return NextResponse.json({ files }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ files: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
