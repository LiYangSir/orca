import { describe, expect, it } from 'vitest'
import type { WorktreeMeta } from '../../shared/types'
import { getLinkedWorkItemMetadata } from './worktree-linked-work-item-metadata'

function makeMeta(linkedLocalTask: string | null): WorktreeMeta {
  return {
    displayName: '',
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    linkedLocalTask,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0
  }
}

describe('getLinkedWorkItemMetadata', () => {
  it('exposes persisted local task links to the renderer', () => {
    expect(getLinkedWorkItemMetadata(makeMeta('task-1'))).toMatchObject({
      linkedLocalTask: 'task-1'
    })
    expect(getLinkedWorkItemMetadata(undefined)).toMatchObject({ linkedLocalTask: null })
  })
})
