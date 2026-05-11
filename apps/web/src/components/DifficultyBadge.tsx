import { cn } from '@/lib/utils'
import type { Difficulty } from '@/lib/types'

const labels: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Med.',
  HARD: 'Hard',
}

const colors: Record<Difficulty, string> = {
  EASY: 'text-[#00b8a3]',
  MEDIUM: 'text-[#ffb800]',
  HARD: 'text-[#ef4743]',
}

export function DifficultyBadge({
  difficulty,
  full,
  className,
}: {
  difficulty: Difficulty
  full?: boolean
  className?: string
}) {
  const label = full
    ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase()
    : labels[difficulty]
  return (
    <span className={cn('text-xs font-medium', colors[difficulty], className)}>
      {label}
    </span>
  )
}
