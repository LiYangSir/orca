import { Archive, ArrowDownUp, Filter, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { LocalTaskPriority, LocalTaskStatus } from '../../../../shared/local-task-types'
import { ALL_STATUSES, getStatusLabel } from './local-task-status-priority'
import type { LocalTaskGroupBy, LocalTaskOrderBy, LocalTaskViewMode } from './local-task-view-state'

const VIEW_MODES: { id: LocalTaskViewMode; label: string; Icon: typeof List }[] = [
  { id: 'list', label: 'List', Icon: List },
  { id: 'board', label: 'Board', Icon: LayoutGrid }
]

export function LocalTaskSubHeader({
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  orderBy,
  onOrderByChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  taskCount,
  projectFilter = 'all',
  onProjectFilterChange,
  hasRepoPath = false,
  showArchived = false,
  onShowArchivedChange
}: {
  viewMode: LocalTaskViewMode
  onViewModeChange: (mode: LocalTaskViewMode) => void
  groupBy: LocalTaskGroupBy
  onGroupByChange: (groupBy: LocalTaskGroupBy) => void
  orderBy: LocalTaskOrderBy
  onOrderByChange: (orderBy: LocalTaskOrderBy) => void
  statusFilter: LocalTaskStatus | 'all'
  onStatusFilterChange: (status: LocalTaskStatus | 'all') => void
  priorityFilter: LocalTaskPriority | 'all'
  onPriorityFilterChange: (priority: LocalTaskPriority | 'all') => void
  taskCount: number
  projectFilter?: 'all' | 'project'
  onProjectFilterChange?: (filter: 'all' | 'project') => void
  hasRepoPath?: boolean
  showArchived?: boolean
  onShowArchivedChange?: (show: boolean) => void
}): React.JSX.Element {
  const hasActiveFilter = statusFilter !== 'all' || priorityFilter !== 'all'

  return (
    <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
      <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {translate('auto.components.LocalTaskList.local_issues', 'Local issues')}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="hidden items-center rounded-md border border-border/50 bg-background/70 p-0.5 md:flex"
          aria-label={translate('auto.components.LocalTaskList.view_mode', 'View mode')}
        >
          {VIEW_MODES.map(({ id, label, Icon }) => {
            const active = viewMode === id
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onViewModeChange(id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded text-muted-foreground transition hover:text-foreground',
                      active && 'bg-accent text-accent-foreground shadow-xs'
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="gap-1 border-border/50 bg-background/70 text-[11px]"
            >
              <SlidersHorizontal className="size-3.5" />
              {translate('auto.components.LocalTaskList.view', 'View')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <List className="size-3.5" />
              {translate('auto.components.LocalTaskList.view', 'View')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={viewMode}
              onValueChange={(v) => onViewModeChange(v as LocalTaskViewMode)}
            >
              {VIEW_MODES.map(({ id, label, Icon }) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  <Icon className="size-3.5" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5" />
              {translate('auto.components.LocalTaskList.grouping', 'Grouping')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={groupBy}
              onValueChange={(v) => onGroupByChange(v as LocalTaskGroupBy)}
            >
              <DropdownMenuRadioItem value="none">
                {translate('auto.components.LocalTaskList.group_none', 'No grouping')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status">
                {translate('auto.components.LocalTaskList.group_status', 'Status')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">
                {translate('auto.components.LocalTaskList.group_priority', 'Priority')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2">
              <ArrowDownUp className="size-3.5" />
              {translate('auto.components.LocalTaskList.ordering', 'Ordering')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={orderBy}
              onValueChange={(v) => onOrderByChange(v as LocalTaskOrderBy)}
            >
              <DropdownMenuRadioItem value="priority">
                {translate('auto.components.LocalTaskList.order_priority', 'Priority')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updated">
                {translate('auto.components.LocalTaskList.order_updated', 'Updated')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">
                {translate('auto.components.LocalTaskList.order_created', 'Created')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2">
              <Filter className="size-3.5" />
              {translate('auto.components.LocalTaskList.filter', 'Filter')}
            </DropdownMenuLabel>
            {ALL_STATUSES.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusFilter === s}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => onStatusFilterChange(statusFilter === s ? 'all' : s)}
              >
                {getStatusLabel(s)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasRepoPath && onProjectFilterChange ? (
          <div
            className="hidden items-center rounded-md border border-border/50 bg-background/70 p-0.5 md:flex"
            aria-label={translate('auto.components.LocalTaskList.project_filter', 'Project filter')}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onProjectFilterChange('all')}
                  aria-pressed={projectFilter === 'all'}
                  className={cn(
                    'inline-flex h-6 items-center justify-center rounded px-1.5 text-[10px] text-muted-foreground transition hover:text-foreground',
                    projectFilter === 'all' && 'bg-accent text-accent-foreground shadow-xs'
                  )}
                >
                  {translate('auto.components.LocalTaskList.all', 'All')}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {translate('auto.components.LocalTaskList.all_tasks', 'All tasks')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onProjectFilterChange('project')}
                  aria-pressed={projectFilter === 'project'}
                  className={cn(
                    'inline-flex h-6 items-center justify-center rounded px-1.5 text-[10px] text-muted-foreground transition hover:text-foreground',
                    projectFilter === 'project' && 'bg-accent text-accent-foreground shadow-xs'
                  )}
                >
                  {translate('auto.components.LocalTaskList.this_project', 'Project')}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {translate('auto.components.LocalTaskList.this_project_tasks', 'This project only')}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}

        {onShowArchivedChange ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onShowArchivedChange(!showArchived)}
                aria-pressed={showArchived}
                className={cn(
                  'inline-flex size-6 items-center justify-center rounded-md border border-border/50 bg-background/70 text-muted-foreground transition hover:text-foreground',
                  showArchived && 'bg-accent text-accent-foreground shadow-xs'
                )}
              >
                <Archive className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {showArchived
                ? translate('auto.components.LocalTaskList.hide_archived', 'Hide archived')
                : translate('auto.components.LocalTaskList.show_archived', 'Show archived')}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {hasActiveFilter ? (
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('all')
              onPriorityFilterChange('all')
            }}
            className="flex items-center gap-1 rounded-md border border-border/50 bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <Filter className="size-3" />
            <X className="size-3" />
          </button>
        ) : null}

        <div className="text-[11px] text-muted-foreground">
          {taskCount} {translate('auto.components.LocalTaskList.shown', 'shown')}
        </div>
      </div>
    </div>
  )
}
