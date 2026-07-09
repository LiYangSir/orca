import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListChecks, LoaderCircle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type {
  LocalTask,
  LocalTaskLabel,
  LocalTaskPriority,
  LocalTaskStatus
} from '../../../../shared/local-task-types'
import { NEXT_STATUS } from './local-task-status-priority'
import { LocalTaskListHeader } from './local-task-list-header'
import { LocalTaskSubHeader } from './local-task-sub-header'
import { LocalTaskCreateDialog } from './local-task-create-dialog'
import { LocalTaskListView } from './local-task-list-view'
import { LocalTaskBoardView } from './local-task-board-view'
import { LocalTaskDetailPage } from './local-task-detail-page'
import { filterLocalTasks, groupLocalTasks, sortLocalTasks } from './local-task-group-sort'
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_GROUP_BY,
  DEFAULT_ORDER_BY,
  DEFAULT_VIEW_MODE
} from './local-task-view-state'
import type {
  LocalTaskFilterState,
  LocalTaskGroupBy,
  LocalTaskOrderBy,
  LocalTaskViewMode
} from './local-task-view-state'

const EMPTY_TASKS: LocalTask[] = []
const EMPTY_LABELS: LocalTaskLabel[] = []

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: LocalTask[]; labels: LocalTaskLabel[] }
  | { kind: 'error'; message: string }

export function LocalTaskList({
  currentRepoPath,
  onStartWorkspace
}: {
  currentRepoPath?: string
  onStartWorkspace?: (task: LocalTask) => void
} = {}): React.JSX.Element {
  const [state, setState] = useState<FetchState>({ kind: 'idle' })
  const [creating, setCreating] = useState(false)
  const [taskNavStack, setTaskNavStack] = useState<string[]>([])
  const [projectFilter, setProjectFilter] = useState<'all' | 'project'>('all')
  const [showArchived, setShowArchived] = useState(false)

  const [viewMode, setViewModeRaw] = useState<LocalTaskViewMode>(() => {
    const saved = localStorage.getItem('local-tasks-view-mode')
    return saved === 'list' || saved === 'board' ? saved : DEFAULT_VIEW_MODE
  })
  const setViewMode = useCallback((mode: LocalTaskViewMode) => {
    setViewModeRaw(mode)
    localStorage.setItem('local-tasks-view-mode', mode)
  }, [])
  const [groupBy, setGroupBy] = useState<LocalTaskGroupBy>(DEFAULT_GROUP_BY)
  const [orderBy, setOrderBy] = useState<LocalTaskOrderBy>(DEFAULT_ORDER_BY)
  const [filter, setFilter] = useState<LocalTaskFilterState>(DEFAULT_FILTER_STATE)

  const load = useCallback(async () => {
    if (!window.api?.localTasks || !window.api?.localTaskLabels) {
      setState({
        kind: 'error',
        message: translate(
          'auto.components.LocalTaskList.api_unavailable',
          'Local task API is not available. Please restart the application.'
        )
      })
      return
    }
    setState({ kind: 'loading' })
    try {
      const [tasksResult, labelsResult] = await Promise.all([
        window.api.localTasks.list() as Promise<ApiResult<LocalTask[]>>,
        window.api.localTaskLabels.list() as Promise<ApiResult<LocalTaskLabel[]>>
      ])
      if (!tasksResult.ok) {
        setState({ kind: 'error', message: tasksResult.error })
        return
      }
      setState({
        kind: 'ready',
        items: tasksResult.data,
        labels: labelsResult.ok ? labelsResult.data : []
      })
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = useCallback(
    async (
      title: string,
      opts: {
        priority: LocalTaskPriority
        status: LocalTaskStatus
        description: string
        labelIds: string[]
      }
    ) => {
      await window.api.localTasks.create({
        title,
        priority: opts.priority,
        status: opts.status,
        description: opts.description || undefined,
        labelIds: opts.labelIds.length > 0 ? opts.labelIds : undefined,
        repoPath: currentRepoPath || undefined
      })
      setCreating(false)
      void load()
    },
    [load, currentRepoPath]
  )

  const handleUpdate = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      await window.api.localTasks.update({ id, ...updates } as Parameters<
        typeof window.api.localTasks.update
      >[0])
      void load()
    },
    [load]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await window.api.localTasks.delete({ id })
      const currentId = taskNavStack.at(-1)
      if (currentId === id) {
        setTaskNavStack((prev) => prev.slice(0, -1))
      }
      void load()
    },
    [load, taskNavStack]
  )

  const handleCycleStatus = useCallback(
    async (task: LocalTask) => {
      await window.api.localTasks.update({ id: task.id, status: NEXT_STATUS[task.status] })
      void load()
    },
    [load]
  )

  const handleUpdateStatus = useCallback(
    async (id: string, status: LocalTaskStatus) => {
      await window.api.localTasks.update({ id, status })
      void load()
    },
    [load]
  )

  const handleCreateSubtask = useCallback(
    async (parentId: string, title: string) => {
      const currentItems = state.kind === 'ready' ? state.items : []
      const parent = currentItems.find((t) => t.id === parentId)
      await window.api.localTasks.create({
        title,
        parentId,
        repoPath: parent?.repoPath || currentRepoPath || undefined
      })
      void load()
    },
    [load, currentRepoPath, state]
  )

  const handleCreateLabel = useCallback(
    async (name: string, color: string) => {
      await window.api.localTaskLabels.create({ name, color })
      void load()
    },
    [load]
  )

  const handleUpdateLabel = useCallback(
    async (id: string, name: string, color: string) => {
      await window.api.localTaskLabels.update({ id, name, color })
      void load()
    },
    [load]
  )

  const handleDeleteLabel = useCallback(
    async (id: string) => {
      await window.api.localTaskLabels.delete({ id })
      void load()
    },
    [load]
  )

  const items = state.kind === 'ready' ? state.items : EMPTY_TASKS
  const labels = state.kind === 'ready' ? state.labels : EMPTY_LABELS

  const topLevelTasks = useMemo(() => items.filter((t) => !t.parentId), [items])

  const visibleTasks = useMemo(() => {
    let tasks = topLevelTasks
    if (!showArchived) {
      tasks = tasks.filter((t) => !t.archivedAt)
    }
    if (projectFilter === 'project' && currentRepoPath) {
      tasks = tasks.filter((t) => t.repoPath === currentRepoPath)
    }
    return tasks
  }, [topLevelTasks, showArchived, projectFilter, currentRepoPath])

  const filteredTasks = useMemo(
    () => filterLocalTasks(visibleTasks, filter),
    [visibleTasks, filter]
  )
  const sortedTasks = useMemo(
    () => sortLocalTasks(filteredTasks, orderBy),
    [filteredTasks, orderBy]
  )
  const groups = useMemo(() => groupLocalTasks(sortedTasks, groupBy), [sortedTasks, groupBy])

  const selectedTaskId = taskNavStack.at(-1) ?? null
  const selectedTask = selectedTaskId ? (items.find((t) => t.id === selectedTaskId) ?? null) : null

  const breadcrumbs = useMemo(() => {
    return taskNavStack.slice(0, -1).map((id) => {
      const t = items.find((task) => task.id === id)
      return { id, title: t?.title ?? id }
    })
  }, [taskNavStack, items])

  if (selectedTask) {
    return (
      <div className="h-[calc(100vh-10rem)] min-h-[400px]">
        <LocalTaskDetailPage
          task={selectedTask}
          allTasks={items}
          labels={labels}
          breadcrumbs={breadcrumbs}
          onUpdate={handleUpdate}
          onDelete={(id) => {
            void handleDelete(id)
          }}
          onClose={() => setTaskNavStack([])}
          onNavigateBack={() => setTaskNavStack((prev) => prev.slice(0, -1))}
          onOpenSubtask={(id) => setTaskNavStack((prev) => [...prev, id])}
          onCreateSubtask={handleCreateSubtask}
          onCycleSubtaskStatus={handleCycleStatus}
          onDeleteSubtask={(id) => {
            void handleDelete(id)
          }}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
          onStartWorkspace={onStartWorkspace}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <LocalTaskListHeader
        searchQuery={filter.search}
        onSearchQueryChange={(q) => setFilter((f) => ({ ...f, search: q }))}
        loading={state.kind === 'loading'}
        onRefresh={load}
        onNewTask={() => setCreating(true)}
      />

      <LocalTaskCreateDialog
        open={creating}
        onOpenChange={setCreating}
        labels={labels}
        onSave={handleCreate}
        onCreateLabel={handleCreateLabel}
        onUpdateLabel={handleUpdateLabel}
        onDeleteLabel={handleDeleteLabel}
      />

      <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm">
        <LocalTaskSubHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          orderBy={orderBy}
          onOrderByChange={setOrderBy}
          statusFilter={filter.status}
          onStatusFilterChange={(s) => setFilter((f) => ({ ...f, status: s }))}
          priorityFilter={filter.priority}
          onPriorityFilterChange={(p) => setFilter((f) => ({ ...f, priority: p }))}
          taskCount={filteredTasks.length}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          hasRepoPath={!!currentRepoPath}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
        />
        {state.kind === 'idle' || state.kind === 'loading' ? (
          <div className="flex h-32 items-center justify-center">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : state.kind === 'error' ? (
          <ErrorState message={state.message} />
        ) : visibleTasks.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'board' ? (
          <LocalTaskBoardView
            tasks={sortedTasks}
            labels={labels}
            allTasks={items}
            selectedTaskId={null}
            onSelectTask={(id) => {
              if (id) {
                setTaskNavStack([id])
              }
            }}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          <LocalTaskListView
            groups={groups}
            labels={labels}
            allTasks={items}
            showGroupHeaders={groupBy !== 'none'}
            selectedTaskId={null}
            onSelectTask={(id) => {
              if (id) {
                setTaskNavStack([id])
              }
            }}
            onCycleStatus={handleCycleStatus}
            onEditTask={(id) => setTaskNavStack([id])}
            onDeleteTask={handleDelete}
          />
        )}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-md border border-border/40 bg-muted/40 px-6 py-10 text-center mx-4">
      <p className="text-sm font-medium text-foreground">
        {translate('auto.components.LocalTaskList.error_title', 'Could not load local tasks')}
      </p>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <ListChecks className="size-5" />
      <span>
        {translate(
          'auto.components.LocalTaskList.empty',
          'No local tasks yet. Create one to get started.'
        )}
      </span>
    </div>
  )
}
