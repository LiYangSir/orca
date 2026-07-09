import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type {
  LocalTask,
  LocalTaskActivity,
  LocalTaskComment,
  LocalTaskCreateInput,
  LocalTaskLabel,
  LocalTaskUpdateInput
} from '../../shared/local-task-types'
import {
  isLocalTaskPriority,
  isLocalTaskStatus,
  isValidHexColor
} from '../../shared/local-task-types'

export type LocalTasksFileV3 = {
  version: 3
  tasks: LocalTask[]
  labels: LocalTaskLabel[]
  comments: LocalTaskComment[]
  activities: LocalTaskActivity[]
}

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getLocalTasksFilePath(): string {
  return join(getOrcaDir(), 'local-tasks.json')
}

function ensureOrcaDir(): void {
  const dir = getOrcaDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

const EMPTY_V3: LocalTasksFileV3 = {
  version: 3,
  tasks: [],
  labels: [],
  comments: [],
  activities: []
}

export function readData(): LocalTasksFileV3 {
  const filePath = getLocalTasksFilePath()
  if (!existsSync(filePath)) {
    return { ...EMPTY_V3 }
  }
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    // Why: auto-migrate V1 (bare array) and V2 to V3 envelope on first read.
    if (Array.isArray(parsed)) {
      const data: LocalTasksFileV3 = {
        ...EMPTY_V3,
        tasks: parsed.filter(isValidLocalTask)
      }
      writeData(data)
      return data
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const tasks = Array.isArray(obj.tasks)
        ? (obj.tasks as unknown[]).filter(isValidLocalTask)
        : []
      const labels = Array.isArray(obj.labels)
        ? (obj.labels as unknown[]).filter(isValidLocalTaskLabel)
        : []
      if (obj.version === 2 || obj.version === 3) {
        const data: LocalTasksFileV3 = {
          version: 3,
          tasks,
          labels,
          comments: Array.isArray(obj.comments)
            ? (obj.comments as unknown[]).filter(isValidLocalTaskComment)
            : [],
          activities: Array.isArray(obj.activities)
            ? (obj.activities as unknown[]).filter(isValidLocalTaskActivity)
            : []
        }
        if (obj.version === 2) {
          writeData(data)
        }
        return data
      }
    }
    return { ...EMPTY_V3 }
  } catch {
    return { ...EMPTY_V3 }
  }
}

export function writeData(data: LocalTasksFileV3): void {
  ensureOrcaDir()
  writeFileSync(getLocalTasksFilePath(), JSON.stringify(data, null, 2), {
    mode: 0o600
  })
}

function isValidLocalTask(value: unknown): value is LocalTask {
  if (!value || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    isLocalTaskStatus(obj.status) &&
    isLocalTaskPriority(obj.priority) &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  )
}

function isValidLocalTaskLabel(value: unknown): value is LocalTaskLabel {
  if (!value || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    isValidHexColor(obj.color) &&
    typeof obj.createdAt === 'number'
  )
}

function isValidLocalTaskComment(value: unknown): value is LocalTaskComment {
  if (!value || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.taskId === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  )
}

function isValidLocalTaskActivity(value: unknown): value is LocalTaskActivity {
  if (!value || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.taskId === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.createdAt === 'number'
  )
}

export function appendActivity(
  data: LocalTasksFileV3,
  taskId: string,
  type: LocalTaskActivity['type'],
  oldValue?: string,
  newValue?: string
): void {
  data.activities.push({
    id: randomUUID(),
    taskId,
    type,
    oldValue,
    newValue,
    createdAt: Date.now()
  })
}

// --- Task CRUD ---

export function listLocalTasks(filter?: {
  repoPath?: string
  parentId?: string | null
}): LocalTask[] {
  let tasks = readData().tasks
  if (filter?.repoPath) {
    tasks = tasks.filter((t) => t.repoPath === filter.repoPath)
  }
  if (filter?.parentId !== undefined) {
    tasks = tasks.filter((t) => (t.parentId ?? null) === filter.parentId)
  }
  return tasks.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getLocalTask(id: string): LocalTask | null {
  return readData().tasks.find((task) => task.id === id) ?? null
}

export function createLocalTask(input: LocalTaskCreateInput): LocalTask {
  const data = readData()
  const now = Date.now()
  const task: LocalTask = {
    id: randomUUID(),
    title: input.title.trim(),
    status: input.status ?? 'todo',
    priority: input.priority ?? 'none',
    description: input.description?.trim() || undefined,
    labelIds: input.labelIds?.length ? input.labelIds : undefined,
    parentId: input.parentId || undefined,
    repoPath: input.repoPath || undefined,
    dueDate: input.dueDate || undefined,
    createdAt: now,
    updatedAt: now
  }
  data.tasks.push(task)
  appendActivity(data, task.id, 'created')
  if (input.parentId) {
    appendActivity(data, input.parentId, 'subtask_added', undefined, task.title)
  }
  writeData(data)
  return task
}

export function updateLocalTask(id: string, input: LocalTaskUpdateInput): LocalTask | null {
  const data = readData()
  const task = data.tasks.find((t) => t.id === id)
  if (!task) {
    return null
  }
  if (input.title !== undefined) {
    task.title = input.title.trim()
  }
  if (input.status !== undefined && input.status !== task.status) {
    appendActivity(data, id, 'status_changed', task.status, input.status)
    task.status = input.status
  }
  if (input.priority !== undefined && input.priority !== task.priority) {
    appendActivity(data, id, 'priority_changed', task.priority, input.priority)
    task.priority = input.priority
  }
  if (input.description !== undefined) {
    const trimmed = input.description.trim() || undefined
    if (trimmed !== task.description) {
      appendActivity(data, id, 'description_changed')
    }
    task.description = trimmed
  }
  if (input.labelIds !== undefined) {
    task.labelIds = input.labelIds.length ? input.labelIds : undefined
  }
  if (input.parentId !== undefined) {
    task.parentId = input.parentId || undefined
  }
  if (input.repoPath !== undefined) {
    task.repoPath = input.repoPath || undefined
  }
  if (input.dueDate !== undefined) {
    const newDue = input.dueDate || undefined
    if (newDue !== task.dueDate) {
      appendActivity(data, id, 'due_date_changed', task.dueDate, newDue)
    }
    task.dueDate = newDue
  }
  if (input.archivedAt !== undefined) {
    if (input.archivedAt && !task.archivedAt) {
      task.archivedAt = typeof input.archivedAt === 'number' ? input.archivedAt : Date.now()
      appendActivity(data, id, 'archived')
    } else if (!input.archivedAt && task.archivedAt) {
      task.archivedAt = undefined
      appendActivity(data, id, 'unarchived')
    }
  }
  task.updatedAt = Date.now()
  writeData(data)
  return task
}

export function deleteLocalTask(id: string): boolean {
  const data = readData()
  const before = data.tasks.length
  const idsToRemove = collectDescendantIds(data.tasks, id)
  idsToRemove.add(id)
  data.tasks = data.tasks.filter((task) => !idsToRemove.has(task.id))
  if (data.tasks.length === before) {
    return false
  }
  data.comments = data.comments.filter((c) => !idsToRemove.has(c.taskId))
  data.activities = data.activities.filter((a) => !idsToRemove.has(a.taskId))
  writeData(data)
  return true
}

function collectDescendantIds(tasks: LocalTask[], parentId: string): Set<string> {
  const ids = new Set<string>()
  const queue = [parentId]
  while (queue.length > 0) {
    const pid = queue.pop()!
    for (const t of tasks) {
      if (t.parentId === pid && !ids.has(t.id)) {
        ids.add(t.id)
        queue.push(t.id)
      }
    }
  }
  return ids
}
