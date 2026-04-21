'use client'

export function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg-ai.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-12 saturate-[0.3]"
        loading="eager"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,8,10,0.3) 0%, rgba(8,8,10,0.6) 30%, rgba(8,8,10,0.85) 60%, rgba(8,8,10,1) 100%)',
        }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.015) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Orb 1 */}
      <div
        className="absolute -top-20 -right-15 w-[300px] h-[300px] rounded-full blur-[100px] animate-[orbFloat_12s_ease-in-out_infinite]"
        style={{
          background: 'radial-gradient(circle, rgba(250,204,21,0.10), transparent 70%)',
        }}
      />

      {/* Orb 2 */}
      <div
        className="absolute top-[40%] -left-20 w-[200px] h-[200px] rounded-full blur-[100px] animate-[orbFloat_12s_ease-in-out_infinite] [animation-delay:-5s]"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)',
        }}
      />
    </div>
  )
}