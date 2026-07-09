import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { LocalTask, LocalTaskLabel } from '../../../../shared/local-task-types'
import { PriorityIcon, StatusIcon } from './local-task-status-priority'
import { SubtaskRing } from './local-task-subtask-ring'
import { DueDateChip } from './local-task-due-date'
import { LabelChip } from './local-task-label-chip'

function shortId(id: string): string {
  return `LT-${id.slice(0, 6)}`
}

export function LocalTaskBoardCard({
  task,
  labels,
  allTasks,
  selected,
  onSelect,
  onPointerDown
}: {
  task: LocalTask
  labels: LocalTaskLabel[]
  allTasks: LocalTask[]
  selected: boolean
  onSelect: () => void
  onPointerDown: (e: React.PointerEvent) => void
}): React.JSX.Element {
  const taskLabels = labels.filter((l) => task.labelIds?.includes(l.id))
  const subtaskStats = useMemo(() => {
    const subs = allTasks.filter((t) => t.parentId === task.id)
    return { total: subs.length, done: subs.filter((t) => t.status === 'done').length }
  }, [allTasks, task.id])

  const hasFooter = taskLabels.length > 0 || subtaskStats.total > 0 || task.dueDate

  return (
    <div
      data-drag-handle
      onPointerDown={onPointerDown}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group/row cursor-grab rounded-md border border-border/50 bg-card text-left transition-colors hover:border-border hover:bg-card/80 active:cursor-grabbing',
        selected && 'border-ring/50 bg-accent'
      )}
    >
      <div className="px-3 pb-2 pt-2.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <StatusIcon status={task.status} className="size-2.5" />
          <span className="font-mono text-[10px] text-muted-foreground/50">{shortId(task.id)}</span>
          <span className="flex-1" />
          {task.priority !== 'none' && (
            <PriorityIcon priority={task.priority} className="size-3.5" />
          )}
        </div>
        <p
          className={cn(
            'min-w-0 text-[13px] leading-snug',
            task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground',
            'line-clamp-2'
          )}
        >
          {task.title}
        </p>
      </div>

      {hasFooter && (
        <div className="flex items-center gap-1.5 border-t border-border/40 px-3 py-1.5">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {taskLabels.slice(0, 3).map((l) => (
              <LabelChip key={l.id} label={l} maxWidth="72px" />
            ))}
            {taskLabels.length > 3 && (
              <span className="text-[10px] text-muted-foreground/50">+{taskLabels.length - 3}</span>
            )}
          </div>
          <SubtaskRing done={subtaskStats.done} total={subtaskStats.total} />
          {task.dueDate && <DueDateChip dueDate={task.dueDate} status={task.status} />}
        </div>
      )}
    </div>
  )
}
