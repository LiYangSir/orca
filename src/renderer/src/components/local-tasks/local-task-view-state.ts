import type { LocalTaskPriority, LocalTaskStatus } from '../../../../shared/local-task-types'

export type LocalTaskViewMode = 'list' | 'board'
export type LocalTaskGroupBy = 'none' | 'status' | 'priority'
export type LocalTaskOrderBy = 'priority' | 'updated' | 'created'

export type LocalTaskFilterState = {
  search: string
  status: LocalTaskStatus | 'all'
  priority: LocalTaskPriority | 'all'
  labelIds: string[]
}

export const DEFAULT_VIEW_MODE: LocalTaskViewMode = 'board'
export const DEFAULT_GROUP_BY: LocalTaskGroupBy = 'none'
export const DEFAULT_ORDER_BY: LocalTaskOrderBy = 'priority'
export const DEFAULT_FILTER_STATE: LocalTaskFilterState = {
  search: '',
  status: 'all',
  priority: 'all',
  labelIds: []
}
