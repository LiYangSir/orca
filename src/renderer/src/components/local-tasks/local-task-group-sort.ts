import type {
  LocalTask,
  LocalTaskPriority,
  LocalTaskStatus
} from '../../../../shared/local-task-types'
import type {
  LocalTaskFilterState,
  LocalTaskGroupBy,
  LocalTaskOrderBy
} from './local-task-view-state'
import { getStatusLabel, getPriorityLabel } from './local-task-status-priority'

export type LocalTaskGroupSection = {
  key: string
  label: string
  tasks: LocalTask[]
}

const PRIORITY_RANK: Record<LocalTaskPriority, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
  none: 5
}

const STATUS_ORDER: LocalTaskStatus[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done']
const PRIORITY_ORDER: LocalTaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

export function filterLocalTasks(tasks: LocalTask[], filter: LocalTaskFilterState): LocalTask[] {
  let result = tasks

  if (filter.search) {
    const q = filter.search.toLowerCase()
    result = result.filter((t) => t.title.toLowerCase().includes(q))
  }

  if (filter.status !== 'all') {
    result = result.filter((t) => t.status === filter.status)
  }

  if (filter.priority !== 'all') {
    result = result.filter((t) => t.priority === filter.priority)
  }

  if (filter.labelIds.length > 0) {
    const filterSet = new Set(filter.labelIds)
    result = result.filter((t) => t.labelIds?.some((lid) => filterSet.has(lid)))
  }

  return result
}

export function sortLocalTasks(tasks: LocalTask[], orderBy: LocalTaskOrderBy): LocalTask[] {
  const sorted = [...tasks]
  sorted.sort((a, b) => {
    switch (orderBy) {
      case 'priority': {
        const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        return diff !== 0 ? diff : b.updatedAt - a.updatedAt
      }
      case 'updated':
        return b.updatedAt - a.updatedAt
      case 'created':
        return b.createdAt - a.createdAt
    }
  })
  return sorted
}

export function groupLocalTasks(
  tasks: LocalTask[],
  groupBy: LocalTaskGroupBy
): LocalTaskGroupSection[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', tasks }]
  }

  if (groupBy === 'status') {
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: getStatusLabel(status),
      tasks: tasks.filter((t) => t.status === status)
    })).filter((g) => g.tasks.length > 0)
  }

  return PRIORITY_ORDER.map((priority) => ({
    key: priority,
    label: getPriorityLabel(priority),
    tasks: tasks.filter((t) => t.priority === priority)
  })).filter((g) => g.tasks.length > 0)
}
