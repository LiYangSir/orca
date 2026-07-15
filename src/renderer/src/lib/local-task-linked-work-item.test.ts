import { describe, expect, it } from 'vitest'
import { buildLocalTaskLinkedWorkItem } from './local-task-linked-work-item'

describe('buildLocalTaskLinkedWorkItem', () => {
  it('keeps the durable task id and carries a bounded agent context snapshot', () => {
    const item = buildLocalTaskLinkedWorkItem({
      id: 'task-12345678-full-id',
      title: 'Connect tasks to worktrees',
      status: 'in-progress',
      priority: 'high',
      description: 'Show the linked agent activity.',
      repoPath: '/repo/orca',
      dueDate: '2026-07-20',
      createdAt: 1,
      updatedAt: 2
    })

    expect(item).toMatchObject({
      provider: 'local',
      localIdentifier: 'task-12345678-full-id',
      title: 'Connect tasks to worktrees'
    })
    expect(item.linkedContext?.renderedText).toContain('ID: task-12345678-full-id')
    expect(item.linkedContext?.renderedText).toContain('Status: in-progress')
    expect(item.linkedContext?.renderedText).toContain('Show the linked agent activity.')
  })
})
