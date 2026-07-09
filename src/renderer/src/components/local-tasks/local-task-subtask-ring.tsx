import { cn } from '@/lib/utils'

const SIZE = 14
const STROKE = 1.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function SubtaskRing({
  done,
  total,
  className
}: {
  done: number
  total: number
  className?: string
}): React.JSX.Element | null {
  if (total === 0) {
    return null
  }

  const progress = done / total
  const allDone = done === total

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <svg width={SIZE} height={SIZE} className="shrink-0">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="text-foreground/10"
          stroke="currentColor"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          className={allDone ? 'text-emerald-500' : 'text-foreground/50'}
          stroke="currentColor"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className={cn('text-[10px]', allDone ? 'text-emerald-500' : 'text-muted-foreground')}>
        {done}/{total}
      </span>
    </span>
  )
}
