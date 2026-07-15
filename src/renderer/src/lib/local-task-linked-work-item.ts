import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { LocalTask } from '../../../shared/local-task-types'

export function buildLocalTaskLinkedWorkItem(task: LocalTask): LinkedWorkItemSummary {
  const renderedText = [
    'Local task context snapshot',
    `ID: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    ...(task.repoPath ? [`Project path: ${task.repoPath}`] : []),
    ...(task.dueDate ? [`Due date: ${task.dueDate}`] : []),
    ...(task.description?.trim() ? ['Description:', task.description.trim()] : [])
  ].join('\n')

  return {
    type: 'issue',
    number: 0,
    title: task.title,
    url: '',
    provider: 'local',
    // Why: worktree metadata uses this as a durable foreign key; the short
    // display form can collide and cannot resolve the task after restart.
    localIdentifier: task.id,
    linkedContext: {
      provider: 'local',
      version: 1,
      renderedText
    }
  }
}
