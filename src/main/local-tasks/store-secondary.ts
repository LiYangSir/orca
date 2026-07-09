import { randomUUID } from 'node:crypto'
import type {
  LocalTaskActivity,
  LocalTaskComment,
  LocalTaskLabel,
  LocalTaskLabelCreateInput,
  LocalTaskLabelUpdateInput
} from '../../shared/local-task-types'
import { readData, writeData, appendActivity } from './store'

// --- Label CRUD ---

export function listLocalTaskLabels(): LocalTaskLabel[] {
  return readData().labels
}

export function createLocalTaskLabel(input: LocalTaskLabelCreateInput): LocalTaskLabel {
  const data = readData()
  const label: LocalTaskLabel = {
    id: randomUUID(),
    name: input.name.trim(),
    color: input.color,
    createdAt: Date.now()
  }
  data.labels.push(label)
  writeData(data)
  return label
}

export function updateLocalTaskLabel(
  id: string,
  input: LocalTaskLabelUpdateInput
): LocalTaskLabel | null {
  const data = readData()
  const label = data.labels.find((l) => l.id === id)
  if (!label) {
    return null
  }
  if (input.name !== undefined) {
    label.name = input.name.trim()
  }
  if (input.color !== undefined) {
    label.color = input.color
  }
  writeData(data)
  return label
}

export function deleteLocalTaskLabel(id: string): boolean {
  const data = readData()
  const before = data.labels.length
  data.labels = data.labels.filter((l) => l.id !== id)
  if (data.labels.length === before) {
    return false
  }
  for (const task of data.tasks) {
    if (task.labelIds) {
      task.labelIds = task.labelIds.filter((lid) => lid !== id)
      if (task.labelIds.length === 0) {
        task.labelIds = undefined
      }
    }
  }
  writeData(data)
  return true
}

// --- Comment CRUD ---

export function listTaskComments(taskId: string): LocalTaskComment[] {
  return readData()
    .comments.filter((c) => c.taskId === taskId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function createTaskComment(taskId: string, content: string): LocalTaskComment {
  const data = readData()
  const now = Date.now()
  const comment: LocalTaskComment = {
    id: randomUUID(),
    taskId,
    content: content.trim(),
    createdAt: now,
    updatedAt: now
  }
  data.comments.push(comment)
  appendActivity(data, taskId, 'comment_added')
  writeData(data)
  return comment
}

export function deleteTaskComment(id: string): boolean {
  const data = readData()
  const before = data.comments.length
  data.comments = data.comments.filter((c) => c.id !== id)
  if (data.comments.length === before) {
    return false
  }
  writeData(data)
  return true
}

// --- Activity ---

export function listTaskActivities(taskId: string): LocalTaskActivity[] {
  return readData()
    .activities.filter((a) => a.taskId === taskId)
    .sort((a, b) => a.createdAt - b.createdAt)
}
