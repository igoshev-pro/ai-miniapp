'use client'

import { createContext, useContext, useMemo } from 'react'

/**
 * Какие файлы креативов лежат в public/landing/.
 *
 * Список приходит с сервера: start/page.tsx читает каталог через fs во время
 * сборки/рендера и передаёт имена в LandingPage, а тот кладёт их в контекст.
 * Никаких сетевых запросов.
 *
 * Почему не запрос: пробовали /api/landing-assets — на боевом сервере nginx
 * отдаёт весь /api/* бэкенду NestJS (в DEPLOY.md этого нет), маршрут Next
 * туда не доходит, ответ 404 → страница считала, что файлов нет, и ставила
 * заглушки при полностью залитых файлах. HEAD на каждый файл тоже не годится:
 * dev-сервер рендерит not-found по 20–100 с на промах. onError на <img>
 * теряется до гидрации. Чтение каталога на сервере лишено всех трёх проблем.
 */

const ROOT = '/landing/'

export const LandingAssetsContext = createContext<Set<string>>(new Set())

export function assetUrl(file: string) {
  return ROOT + file
}

/** Набор имён из переданного списка, которые реально есть на сервере. */
export function useLandingAssets(files: string[]): Set<string> {
  const all = useContext(LandingAssetsContext)
  const key = files.join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Set(files.filter((f) => all.has(f))), [all, key])
}
