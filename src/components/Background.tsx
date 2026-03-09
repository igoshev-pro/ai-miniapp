'use client'

export function Background() {
  return (
    <div className="bg-scene">
      {/* 
        Фоновое AI-изображение. Положите в public/bg-ai.jpg 
        Промпт ниже. Если нет — будет работать без него.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg-ai.jpg"
        alt=""
        className="bg-scene__image"
        loading="eager"
        onError={(e) => {
          // Скрываем если картинки нет
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <div className="bg-scene__overlay" />
      <div className="bg-scene__grid" />
      <div className="bg-scene__orb bg-scene__orb--1" />
      <div className="bg-scene__orb bg-scene__orb--2" />
    </div>
  )
}