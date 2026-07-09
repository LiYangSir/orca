import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type {
  LocalTask,
  LocalTaskLabel,
  LocalTaskStatus
} from '../../../../shared/local-task-types'
import { StatusIcon, getStatusLabel } from './local-task-status-priority'
import { LocalTaskBoardCard } from './local-task-board-card'
import { useLocalTaskBoardPointerDrag } from './use-local-task-board-pointer-drag'

const BOARD_COLUMNS: LocalTaskStatus[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done']

export function LocalTaskBoardView({
  tasks,
  labels,
  allTasks,
  selectedTaskId,
  onSelectTask,
  onUpdateStatus
}: {
  tasks: LocalTask[]
  labels: LocalTaskLabel[]
  allTasks: LocalTask[]
  selectedTaskId: string | null
  onSelectTask: (id: string | null) => void
  onUpdateStatus: (id: string, status: LocalTaskStatus) => void
}): React.JSX.Element {
  const { registerColumn, onCardPointerDown } = useLocalTaskBoardPointerDrag({
    onUpdateStatus
  })

  if (tasks.length === 0) {
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
    <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek">
      <div
        className="grid min-w-[720px] gap-3 p-3"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLUMNS.length}, minmax(160px, 1fr))` }}
      >
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column)

          return (
            <section
              key={column}
              ref={(el) => registerColumn(column, el)}
              className={cn(
                'flex flex-col rounded-lg border border-border/50 bg-muted/30 transition-none'
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                <StatusIcon status={column} className="size-3.5" />
                <span className="text-xs font-medium text-foreground">
                  {getStatusLabel(column)}
                </span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <div
                className="flex flex-col gap-2 overflow-auto p-2 scrollbar-sleek"
                style={{ maxHeight: '60vh' }}
              >
                {columnTasks.map((task) => (
                  <LocalTaskBoardCard
                    key={task.id}
                    task={task}
                    labels={labels}
                    allTasks={allTasks}
                    selected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
                    onPointerDown={(e) => onCardPointerDown(task.id, e)}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="flex h-16 items-center justify-center text-[11px] text-muted-foreground/50">
                    {translate('auto.components.LocalTaskList.drop_here', 'Drop here')}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
