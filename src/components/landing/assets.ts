'use client'

import { useEffect, useState } from 'react'

/**
 * Какие файлы креативов уже лежат в public/landing/.
 *
 * Список берём одним запросом к /api/landing-assets (маршрут читает каталог).
 * Раньше делали HEAD на каждый файл: у dev-сервера каждый 404 рендерит
 * страницу not-found по 20–100 секунд, и два десятка промахов вешали лендинг.
 * onError на <img> тоже не годится — у SSR-картинки 404 приходит до гидрации,
 * React событие теряет и остаётся битая иконка.
 *
 * Пока ответа нет — считаем, что файлов нет, и показываем запасные обложки.
 */

const ROOT = '/landing/'

let listing: Promise<Set<string>> | null = null

function loadListing(): Promise<Set<string>> {
  if (!listing) {
    listing = fetch('/api/landing-assets', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then((j: { files?: string[] }) => new Set(j.files ?? []))
      .catch(() => new Set<string>())
  }
  return listing
}

export function assetUrl(file: string) {
  return ROOT + file
}

/** Набор имён из переданного списка, которые реально есть на сервере. */
export function useLandingAssets(files: string[]): Set<string> {
  const [have, setHave] = useState<Set<string>>(() => new Set())
  const key = files.join('|')

  useEffect(() => {
    let alive = true
    loadListing().then((all) => {
      if (alive) setHave(new Set(files.filter((f) => all.has(f))))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return have
}
