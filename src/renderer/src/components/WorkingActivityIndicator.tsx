import React from 'react'
import { cn } from '@/lib/utils'

const ORBIT_DURATION_MS = 1800

type WorkingActivityIndicatorProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  size?: 'sm' | 'md'
  phaseKey?: string
}

type WorkingActivityIndicatorStyle = React.CSSProperties & {
  '--working-activity-phase': string
}

function getWorkingActivityPhaseMs(phaseKey: string | undefined): number {
  if (!phaseKey) {
    return 0
  }

  let hash = 2166136261
  for (let index = 0; index < phaseKey.length; index += 1) {
    hash ^= phaseKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return -((hash >>> 0) % ORBIT_DURATION_MS)
}

/** Quiet long-running activity marker used by sidebar worktree and agent rows. */
export const WorkingActivityIndicator = React.memo(function WorkingActivityIndicator({
  size = 'sm',
  phaseKey,
  className,
  style,
  ...props
}: WorkingActivityIndicatorProps): React.JSX.Element {
  // Why: stable negative delays keep concurrently mounted sidebar tasks from
  // rotating in lockstep without adding timers or state to every visible row.
  const activityStyle: WorkingActivityIndicatorStyle = {
    ...style,
    '--working-activity-phase': `${getWorkingActivityPhaseMs(phaseKey)}ms`
  }

  return (
    <span
      {...props}
      className={cn('working-activity-indicator', className)}
      data-size={size}
      style={activityStyle}
    />
  )
})
