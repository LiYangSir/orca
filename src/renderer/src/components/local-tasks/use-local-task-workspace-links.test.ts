import { describe, expect, it } from 'vitest'
import type { LocalTask } from '../../../../shared/local-task-types'
import { collectDeletedTaskIds } from './use-local-task-workspace-links'

function makeTask(id: string, parentId?: string): LocalTask {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 'none',
    ...(parentId ? { parentId } : {}),
    createdAt: 1,
    updatedAt: 1
  }
}

describe('collectDeletedTaskIds', () => {
  it('includes every nested subtask but not adjacent task trees', () => {
    const tasks = [
      makeTask('root'),
      makeTask('child', 'root'),
      makeTask('grandchild', 'child'),
      makeTask('other-root'),
      makeTask('other-child', 'other-root')
    ]

    expect([...collectDeletedTaskIds(tasks, 'root')]).toEqual(['root', 'child', 'grandchild'])
  })
})
