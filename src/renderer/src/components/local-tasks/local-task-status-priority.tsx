import {
  AlertTriangle,
  Check,
  Circle,
  CircleDashed,
  Eye,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Timer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { LocalTaskPriority, LocalTaskStatus } from '../../../../shared/local-task-types'

export const NEXT_STATUS: Record<LocalTaskStatus, LocalTaskStatus> = {
  backlog: 'todo',
  todo: 'in-progress',
  'in-progress': 'in-review',
  'in-review': 'done',
  done: 'backlog'
}

export function getStatusLabel(status: LocalTaskStatus): string {
  switch (status) {
    case 'backlog':
      return translate('auto.components.LocalTask.status_backlog', 'Backlog')
    case 'todo':
      return translate('auto.components.LocalTask.status_todo', 'To Do')
    case 'in-progress':
      return translate('auto.components.LocalTask.status_in_progress', 'In Progress')
    case 'in-review':
      return translate('auto.components.LocalTask.status_in_review', 'In Review')
    case 'done':
      return translate('auto.components.LocalTask.status_done', 'Done')
  }
}

export function getPriorityLabel(priority: LocalTaskPriority): string {
  switch (priority) {
    case 'none':
      return translate('auto.components.LocalTask.priority_none', 'None')
    case 'urgent':
      return translate('auto.components.LocalTask.priority_urgent', 'Urgent')
    case 'high':
      return translate('auto.components.LocalTask.priority_high', 'High')
    case 'medium':
      return translate('auto.components.LocalTask.priority_medium', 'Medium')
    case 'low':
      return translate('auto.components.LocalTask.priority_low', 'Low')
  }
}

export const ALL_STATUSES: LocalTaskStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'done'
]
export const ALL_PRIORITIES: LocalTaskPriority[] = ['none', 'urgent', 'high', 'medium', 'low']

export function StatusIcon({
  status,
  className
}: {
  status: LocalTaskStatus
  className?: string
}): React.JSX.Element {
  switch (status) {
    case 'backlog':
      return <CircleDashed className={cn(className, 'text-muted-foreground/50')} />
    case 'todo':
      return <Circle className={cn(className, 'text-muted-foreground')} />
    case 'in-progress':
      return <Timer className={cn(className, 'text-blue-500')} />
    case 'in-review':
      return <Eye className={cn(className, 'text-amber-500')} />
    case 'done':
      return <Check className={cn(className, 'text-green-500')} />
  }
}

export function StatusBadge({ status }: { status: LocalTaskStatus }): React.JSX.Element {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
        status === 'backlog' && 'bg-muted text-muted-foreground',
        status === 'todo' && 'bg-secondary text-secondary-foreground',
        status === 'in-progress' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        status === 'in-review' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        status === 'done' && 'bg-green-500/10 text-green-600 dark:text-green-400'
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: LocalTaskPriority }): React.JSX.Element {
  const Icon = PRIORITY_ICON[priority]
  if (!Icon) {
    return <span />
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-0.5 text-[11px]',
        priority === 'urgent' && 'text-red-500',
        priority === 'high' && 'text-orange-500',
        priority === 'medium' && 'text-yellow-600 dark:text-yellow-400',
        priority === 'low' && 'text-muted-foreground'
      )}
      title={getPriorityLabel(priority)}
    >
      <Icon className="size-3" />
    </span>
  )
}

export function PriorityIcon({
  priority,
  className
}: {
  priority: LocalTaskPriority
  className?: string
}): React.JSX.Element | null {
  const Icon = PRIORITY_ICON[priority]
  if (!Icon) {
    return null
  }
  return (
    <Icon
      className={cn(
        className,
        priority === 'urgent' && 'text-red-500',
        priority === 'high' && 'text-orange-500',
        priority === 'medium' && 'text-yellow-600 dark:text-yellow-400',
        priority === 'low' && 'text-muted-foreground'
      )}
    />
  )
}

const PRIORITY_ICON: Record<LocalTaskPriority, typeof SignalHigh | null> = {
  none: null,
  urgent: AlertTriangle,
  high: SignalHigh,
  medium: SignalMedium,
  low: SignalLow
}
