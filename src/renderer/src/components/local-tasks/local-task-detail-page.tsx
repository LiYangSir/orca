import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type { LocalTask, LocalTaskLabel } from '../../../../shared/local-task-types'
import type { Worktree } from '../../../../shared/types'
import { LocalTaskDetailContent } from './local-task-detail-content'
import { DetailSidebar } from './local-task-detail-sidebar'
import { LocalTaskWorkspaces } from './local-task-workspaces'

export function LocalTaskDetailPage({
  task,
  allTasks,
  labels,
  breadcrumbs,
  onUpdate,
  onDelete,
  onClose,
  onNavigateBack,
  onOpenSubtask,
  onCreateSubtask,
  onCycleSubtaskStatus,
  onDeleteSubtask,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onStartWorkspace,
  linkedWorktrees,
  allWorktrees,
  onLinkWorktree,
  onUnlinkWorktree
}: {
  task: LocalTask
  allTasks: LocalTask[]
  labels: LocalTaskLabel[]
  breadcrumbs: { id: string; title: string }[]
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onClose: () => void
  onNavigateBack: () => void
  onOpenSubtask: (id: string) => void
  onCreateSubtask: (parentId: string, title: string) => void
  onCycleSubtaskStatus: (subtask: LocalTask) => void
  onDeleteSubtask: (id: string) => void
  onCreateLabel: (name: string, color: string) => void
  onUpdateLabel: (id: string, name: string, color: string) => void
  onDeleteLabel: (id: string) => void
  onStartWorkspace?: (task: LocalTask) => void
  linkedWorktrees: Worktree[]
  allWorktrees: Worktree[]
  onLinkWorktree: (worktreeId: string) => Promise<void>
  onUnlinkWorktree: (worktreeId: string) => Promise<void>
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border/50 bg-background shadow-sm">
      <DetailHeader
        task={task}
        breadcrumbs={breadcrumbs}
        onClose={onClose}
        onNavigateBack={onNavigateBack}
      />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        <div className="mx-auto grid w-full grid-cols-1 gap-10 px-7 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 xl:px-12">
          <LocalTaskDetailContent
            task={task}
            allTasks={allTasks}
            onUpdate={onUpdate}
            onCreateSubtask={onCreateSubtask}
            onCycleSubtaskStatus={onCycleSubtaskStatus}
            onDeleteSubtask={onDeleteSubtask}
            onOpenSubtask={onOpenSubtask}
            workspaceSection={
              <LocalTaskWorkspaces
                task={task}
                linkedWorktrees={linkedWorktrees}
                allWorktrees={allWorktrees}
                onLink={onLinkWorktree}
                onUnlink={onUnlinkWorktree}
              />
            }
          />
          <DetailSidebar
            task={task}
            labels={labels}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onCreateLabel={onCreateLabel}
            onUpdateLabel={onUpdateLabel}
            onDeleteLabel={onDeleteLabel}
            onStartWorkspace={onStartWorkspace}
          />
        </div>
      </div>
    </div>
  )
}

function DetailHeader({
  task,
  breadcrumbs,
  onClose,
  onNavigateBack
}: {
  task: LocalTask
  breadcrumbs: { id: string; title: string }[]
  onClose: () => void
  onNavigateBack: () => void
}): React.JSX.Element {
  const isNested = breadcrumbs.length > 0
  return (
    <header className="flex h-[61px] flex-none items-center justify-between gap-4 border-b border-border/60 px-5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={isNested ? onNavigateBack : onClose}
          className="-ml-2 shrink-0 gap-1.5"
        >
          <ChevronLeft className="size-4" />
          {isNested
            ? breadcrumbs.at(-1)?.title
            : translate('auto.components.LocalTaskDetailPage.local_tasks', 'Local Tasks')}
        </Button>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate font-medium text-foreground">{task.title}</span>
      </div>
    </header>
  )
}
