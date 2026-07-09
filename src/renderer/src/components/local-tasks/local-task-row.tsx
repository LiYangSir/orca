import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LocalTask, LocalTaskLabel } from '../../../../shared/local-task-types'
import { translate } from '@/i18n/i18n'
import {
  StatusIcon,
  PriorityBadge,
  StatusBadge,
  NEXT_STATUS,
  getStatusLabel
} from './local-task-status-priority'
import { SubtaskRing } from './local-task-subtask-ring'
import { formatTimestamp } from './local-task-time-format'
import { DueDateChip } from './local-task-due-date'
import { LabelChip } from './local-task-label-chip'

export const LIST_GRID_CLASS =
  'grid grid-cols-[32px_minmax(120px,1fr)_50px_80px_120px_80px_100px_60px] items-center gap-1 px-3'

export function LocalTaskRow({
  task,
  labels,
  allTasks,
  selected,
  onSelect,
  onCycleStatus,
  onEdit,
  onDelete
}: {
  task: LocalTask
  labels: LocalTaskLabel[]
  allTasks: LocalTask[]
  selected: boolean
  onSelect: () => void
  onCycleStatus: () => void
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const taskLabels = labels.filter((l) => task.labelIds?.includes(l.id))
  const subtaskStats = useMemo(() => {
    const subs = allTasks.filter((t) => t.parentId === task.id)
    return { total: subs.length, done: subs.filter((t) => t.status === 'done').length }
  }, [allTasks, task.id])

  return (
    <div
      className={cn(
        LIST_GRID_CLASS,
        'group/row cursor-pointer border-b border-border/30 py-2 transition-colors hover:bg-muted/30',
        selected && 'bg-accent'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onCycleStatus()
        }}
        className="flex shrink-0 items-center justify-center rounded-md p-0.5 transition-colors hover:bg-muted/60"
        title={`${getStatusLabel(task.status)} → ${getStatusLabel(NEXT_STATUS[task.status])}`}
      >
        <StatusIcon status={task.status} className="size-4" />
      </button>

      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm',
            task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </p>
      </div>

      <SubtaskRing done={subtaskStats.done} total={subtaskStats.total} />

      <div className="flex items-center">
        {task.dueDate ? <DueDateChip dueDate={task.dueDate} status={task.status} /> : <span />}
      </div>

      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {taskLabels.slice(0, 2).map((l) => (
          <LabelChip key={l.id} label={l} maxWidth="56px" />
        ))}
        {taskLabels.length > 2 && (
          <span className="text-[10px] text-muted-foreground/50">+{taskLabels.length - 2}</span>
        )}
      </div>

      <div className="flex items-center">
        {task.priority !== 'none' ? (
          <PriorityBadge priority={task.priority} />
        ) : (
          <StatusBadge status={task.status} />
        )}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate text-[11px] text-muted-foreground">
            {formatTimestamp(task.updatedAt)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{new Date(task.updatedAt).toLocaleString()}</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {translate('auto.components.LocalTaskRow.edit', 'Edit')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(confirmDelete && 'bg-destructive/10 text-destructive')}
              onClick={(e) => {
                e.stopPropagation()
                if (confirmDelete) {
                  onDelete()
                } else {
                  setConfirmDelete(true)
                  setTimeout(() => setConfirmDelete(false), 2000)
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {translate('auto.components.LocalTaskRow.delete', 'Delete')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
