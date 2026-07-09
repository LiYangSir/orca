import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { LocalTask, LocalTaskLabel } from '../../../../shared/local-task-types'
import type { LocalTaskGroupSection } from './local-task-group-sort'
import { LocalTaskRow, LIST_GRID_CLASS } from './local-task-row'

export function LocalTaskListView({
  groups,
  labels,
  allTasks,
  showGroupHeaders,
  selectedTaskId,
  onSelectTask,
  onCycleStatus,
  onEditTask,
  onDeleteTask
}: {
  groups: LocalTaskGroupSection[]
  labels: LocalTaskLabel[]
  allTasks: LocalTask[]
  showGroupHeaders: boolean
  selectedTaskId: string | null
  onSelectTask: (id: string | null) => void
  onCycleStatus: (task: LocalTask) => void
  onEditTask: (id: string) => void
  onDeleteTask: (id: string) => void
}): React.JSX.Element {
  if (groups.every((g) => g.tasks.length === 0)) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>
          {translate(
            'auto.components.LocalTaskList.no_matches',
            'No tasks match the current filters.'
          )}
        </span>
      </div>
    )
  }

  return (
    <div>
      {!showGroupHeaders && (
        <div
          className={cn(
            LIST_GRID_CLASS,
            'sticky top-0 z-10 border-b border-border/50 bg-muted/50 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground'
          )}
        >
          <span />
          <span>{translate('auto.components.LocalTaskList.col_title', 'Title')}</span>
          <span />
          <span>{translate('auto.components.LocalTaskList.col_due', 'Due')}</span>
          <span>{translate('auto.components.LocalTaskList.col_labels', 'Labels')}</span>
          <span>{translate('auto.components.LocalTaskList.col_priority', 'Priority')}</span>
          <span>{translate('auto.components.LocalTaskList.col_updated', 'Updated')}</span>
          <span />
        </div>
      )}
      {groups.map((group) => (
        <TaskGroup
          key={group.key}
          group={group}
          labels={labels}
          allTasks={allTasks}
          showHeader={showGroupHeaders}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
          onCycleStatus={onCycleStatus}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  )
}

function TaskGroup({
  group,
  labels,
  allTasks,
  showHeader,
  selectedTaskId,
  onSelectTask,
  onCycleStatus,
  onEditTask,
  onDeleteTask
}: {
  group: LocalTaskGroupSection
  labels: LocalTaskLabel[]
  allTasks: LocalTask[]
  showHeader: boolean
  selectedTaskId: string | null
  onSelectTask: (id: string | null) => void
  onCycleStatus: (task: LocalTask) => void
  onEditTask: (id: string) => void
  onDeleteTask: (id: string) => void
}): React.JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false)

  if (group.tasks.length === 0) {
    return null
  }

  return (
    <div>
      {showHeader && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
        >
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          <span>{group.label}</span>
          <span className="rounded-full bg-muted px-1.5 text-[10px]">{group.tasks.length}</span>
        </button>
      )}
      {!collapsed &&
        group.tasks.map((task) => (
          <LocalTaskRow
            key={task.id}
            task={task}
            labels={labels}
            allTasks={allTasks}
            selected={selectedTaskId === task.id}
            onSelect={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
            onCycleStatus={() => onCycleStatus(task)}
            onEdit={() => onEditTask(task.id)}
            onDelete={() => onDeleteTask(task.id)}
          />
        ))}
    </div>
  )
}
