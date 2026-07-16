import { describe, expect, it } from 'vitest'
import type {
  CheckStatus,
  PRInfo,
  Repo,
  Worktree,
  WorkspaceLineage
} from '../../../../shared/types'
import { folderWorkspaceKey, worktreeWorkspaceKey } from '../../../../shared/workspace-scope'
import { getFolderWorkspacePrListDisplay } from './folder-workspace-card-pr-display'

const repoA: Repo = {
  id: 'repo-a',
  path: '/repo-a',
  displayName: 'service-a',
  badgeColor: '#ff0000',
  addedAt: 1
}
const repoB: Repo = {
  id: 'repo-b',
  path: '/repo-b',
  displayName: 'service-b',
  badgeColor: '#00ff00',
  addedAt: 1
}

function makeWorktree(overrides: Partial<Worktree> & { id: string; repoId: string }): Worktree {
  const { id, ...rest } = overrides
  return {
    id,
    path: `/worktrees/${id}`,
    displayName: id,
    branch: `refs/heads/${id}`,
    head: 'abc123',
    isBare: false,
    isMainWorktree: false,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    linkedGitLabMR: null,
    linkedGitLabIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    ...rest
  }
}

function makeWorkspaceLineage(worktree: Worktree): WorkspaceLineage {
  return {
    childWorkspaceKey: worktreeWorkspaceKey(worktree.id),
    childInstanceId: worktree.instanceId ?? null,
    parentWorkspaceKey: folderWorkspaceKey('folder-1'),
    parentInstanceId: null,
    origin: 'cli',
    capture: { source: 'env-workspace', confidence: 'inferred' },
    createdAt: 1
  }
}

function makePrEntry(
  number: number,
  checksStatus: CheckStatus
): { data: PRInfo; fetchedAt: number } {
  return {
    data: {
      number,
      title: `PR ${number}`,
      state: 'open',
      url: `https://example.test/pull/${number}`,
      checksStatus,
      updatedAt: '2026-01-01T00:00:00.000Z',
      mergeable: 'UNKNOWN'
    },
    fetchedAt: 2
  }
}

describe('getFolderWorkspacePrListDisplay', () => {
  it('returns one row per member repo with an open review', () => {
    const wtA = makeWorktree({ id: 'wa', repoId: repoA.id, linkedPR: 11 })
    const wtB = makeWorktree({ id: 'wb', repoId: repoB.id, linkedPR: 22 })

    const rows = getFolderWorkspacePrListDisplay({
      folderWorkspaceId: 'folder-1',
      workspaceLineageByChildKey: {
        [wtA.id]: makeWorkspaceLineage(wtA),
        [wtB.id]: makeWorkspaceLineage(wtB)
      },
      worktreeLineageById: {},
      worktreeMap: new Map([
        [wtA.id, wtA],
        [wtB.id, wtB]
      ]),
      repoMap: new Map([
        [repoA.id, repoA],
        [repoB.id, repoB]
      ]),
      hostedReviewCache: null,
      prCache: {
        'repo-a::wa': makePrEntry(11, 'success'),
        'repo-b::wb': makePrEntry(22, 'failure')
      }
    })

    // Why: each member repo contributes exactly one row, labeled by its own repo.
    expect(rows.map((row) => row.repoDisplayName)).toEqual(['service-a', 'service-b'])
    expect(rows.map((row) => row.repoBadgeColor)).toEqual(['#ff0000', '#00ff00'])
    expect(rows[0]?.display).toMatchObject({ number: 11, status: 'success' })
    expect(rows[1]?.display).toMatchObject({ number: 22, status: 'failure' })
  })

  it('omits member repos that have no open review', () => {
    const wtA = makeWorktree({ id: 'wa', repoId: repoA.id, linkedPR: 11 })
    const wtB = makeWorktree({ id: 'wb', repoId: repoB.id, linkedPR: null })

    const rows = getFolderWorkspacePrListDisplay({
      folderWorkspaceId: 'folder-1',
      workspaceLineageByChildKey: {
        [wtA.id]: makeWorkspaceLineage(wtA),
        [wtB.id]: makeWorkspaceLineage(wtB)
      },
      worktreeLineageById: {},
      worktreeMap: new Map([
        [wtA.id, wtA],
        [wtB.id, wtB]
      ]),
      repoMap: new Map([
        [repoA.id, repoA],
        [repoB.id, repoB]
      ]),
      hostedReviewCache: null,
      prCache: {
        'repo-a::wa': makePrEntry(11, 'success')
      }
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.repoDisplayName).toBe('service-a')
  })

  it('returns an empty list when no attached worktree has a review', () => {
    const wtA = makeWorktree({ id: 'wa', repoId: repoA.id, linkedPR: null })

    const rows = getFolderWorkspacePrListDisplay({
      folderWorkspaceId: 'folder-1',
      workspaceLineageByChildKey: { [wtA.id]: makeWorkspaceLineage(wtA) },
      worktreeLineageById: {},
      worktreeMap: new Map([[wtA.id, wtA]]),
      repoMap: new Map([[repoA.id, repoA]]),
      hostedReviewCache: null,
      prCache: {}
    })

    expect(rows).toEqual([])
  })
})
