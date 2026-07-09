import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { LocalTask } from '../../../shared/local-task-types'

export function buildLocalTaskLinkedWorkItem(task: LocalTask): LinkedWorkItemSummary {
  return {
    type: 'issue',
    number: 0,
    title: task.title,
    url: '',
    provider: 'local',
    localIdentifier: task.id.slice(0, 8)
  }
}
