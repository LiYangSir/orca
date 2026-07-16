export type LocalTaskStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done'
export type LocalTaskPriority = 'none' | 'urgent' | 'high' | 'medium' | 'low'

export const LOCAL_TASK_STATUSES: readonly LocalTaskStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'done'
]
export const LOCAL_TASK_PRIORITIES: readonly LocalTaskPriority[] = [
  'none',
  'urgent',
  'high',
  'medium',
  'low'
]

export type LocalTask = {
  id: string
  title: string
  status: LocalTaskStatus
  priority: LocalTaskPriority
  description?: string
  labelIds?: string[]
  parentId?: string
  repoPath?: string
  dueDate?: string
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type LocalTaskCreateInput = {
  title: string
  status?: LocalTaskStatus
  priority?: LocalTaskPriority
  description?: string
  labelIds?: string[]
  parentId?: string
  repoPath?: string
  dueDate?: string
}

export type LocalTaskUpdateInput = {
  title?: string
  status?: LocalTaskStatus
  priority?: LocalTaskPriority
  description?: string
  labelIds?: string[]
  parentId?: string
  repoPath?: string
  dueDate?: string | null
  archivedAt?: number | null
}

export type LocalTaskComment = {
  id: string
  taskId: string
  content: string
  createdAt: number
  updatedAt: number
}

export type LocalTaskCommentCreateInput = {
  taskId: string
  content: string
}

export type LocalTaskActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'comment_added'
  | 'subtask_added'
  | 'description_changed'
  | 'due_date_changed'
  | 'archived'
  | 'unarchived'

export type LocalTaskActivity = {
  id: string
  taskId: string
  type: LocalTaskActivityType
  oldValue?: string
  newValue?: string
  createdAt: number
}

export type LocalTaskLabel = {
  id: string
  name: string
  color: string
  createdAt: number
}

export type LocalTaskLabelCreateInput = {
  name: string
  color: string
}

export type LocalTaskLabelUpdateInput = {
  name?: string
  color?: string
}

const STATUS_SET = new Set<LocalTaskStatus>(LOCAL_TASK_STATUSES)
const PRIORITY_SET = new Set<LocalTaskPriority>(LOCAL_TASK_PRIORITIES)

export function isLocalTaskStatus(value: unknown): value is LocalTaskStatus {
  return STATUS_SET.has(value as LocalTaskStatus)
}

export function isLocalTaskPriority(value: unknown): value is LocalTaskPriority {
  return PRIORITY_SET.has(value as LocalTaskPriority)
}

export function getLocalTaskDisplayId(id: string): string {
  return `LT-${id.slice(0, 6)}`
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value)
}
