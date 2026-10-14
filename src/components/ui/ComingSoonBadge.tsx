import { Clock } from 'lucide-react'

// Плашка для анонсированных моделей, которые ещё нельзя выбрать
export function ComingSoonBadge() {
  return (
    <span
      className="
        inline-flex items-center gap-0.5
        text-[10px] font-semibold
        text-sky-300 bg-sky-400/[0.1]
        border border-sky-400/[0.2]
        px-1.5 py-px rounded-[5px]
        whitespace-nowrap shrink-0
      "
    >
      <Clock size={10} />
      Скоро
    </span>
  )
}
