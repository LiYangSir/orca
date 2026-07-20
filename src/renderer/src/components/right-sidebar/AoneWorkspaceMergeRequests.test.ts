import { describe, expect, it, vi } from 'vitest'
import {
  loadAoneChildMergeRequests,
  loadAoneWorkspaceMergeRequests
} from './AoneWorkspaceMergeRequests'

describe('loadAoneChildMergeRequests', () => {
  it('queries each nested repository current branch and preserves merged reviews', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForBranch = vi.fn()
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) =>
        repoPath.endsWith('diamondops')
          ? {
              ok: true,
              data: {
                branch: 'feature/diamond-listener',
                mergeRequest: {
                  id: 28612989,
                  title: 'Support listener queries',
                  state: 'merged'
                }
              }
            }
          : { ok: false, code: 'not_linked' }
    )

    const result = await loadAoneChildMergeRequests({
      parentWorktreePath: '/workspace',
      branch: 'feature/listener_influence',
      scanNestedRepos,
      getMergeRequestForBranch,
      getMergeRequestForRepositoryCurrentBranch
    })

    expect(scanNestedRepos).toHaveBeenCalledWith({
      path: '/workspace',
      options: { descendIntoGitRepoRoot: true, maxRepos: 50, timeoutMs: 10_000 }
    })
    expect(getMergeRequestForRepositoryCurrentBranch.mock.calls.map(([args]) => args)).toEqual([
      { repoPath: '/workspace/repos/diamondops' },
      { repoPath: '/workspace/repos/mw-cli' }
    ])
    expect(getMergeRequestForBranch).not.toHaveBeenCalled()
    expect(result).toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        branch: 'feature/diamond-listener',
        review: {
          id: 28612989,
          title: 'Support listener queries',
          state: 'merged'
        },
        lookupErrorCode: null
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'not_linked'
      }
    ])
  })

  it('retries a transient lookup failure once', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'invalid_output' })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          branch: 'feature/mw-listener',
          mergeRequest: { id: 28613303, title: 'Listener queries', state: 'opened' }
        }
      })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        branch: 'feature/listener_influence',
        scanNestedRepos,
        getMergeRequestForBranch: vi.fn(),
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: 'feature/mw-listener',
        review: { id: 28613303, title: 'Listener queries', state: 'opened' },
        lookupErrorCode: null
      }
    ])
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(2)
  })

  it('keeps other repositories when one lookup rejects', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) => {
        if (repoPath.endsWith('diamondops')) {
          throw new Error('transport closed')
        }
        return {
          ok: true,
          data: {
            branch: 'feature/mw-listener',
            mergeRequest: { id: 28613303, title: 'Listener queries', state: 'opened' }
          }
        }
      }
    )

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        branch: 'feature/listener_influence',
        scanNestedRepos,
        getMergeRequestForBranch: vi.fn(),
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'unknown'
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: 'feature/mw-listener',
        review: { id: 28613303, title: 'Listener queries', state: 'opened' },
        lookupErrorCode: null
      }
    ])
  })

  it('fills a missing merged parent review only after finding child repositories', async () => {
    const getMergeRequestForBranch = vi.fn(async ({ repoPath }: { repoPath?: string | null }) => ({
      ok: true,
      data:
        repoPath === '/workspace'
          ? { id: 28570763, title: 'Workspace review', state: 'merged' }
          : null
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        branch: 'feature/mw-listener',
        mergeRequest: { id: 28613303, title: 'CLI review', state: 'opened' }
      }
    })

    await expect(
      loadAoneWorkspaceMergeRequests(
        {
          parentWorktreePath: '/workspace',
          branch: 'feature/listener_influence',
          scanNestedRepos: vi.fn(async () => ({
            repos: [
              { path: '/workspace', displayName: 'workspace', depth: 0 },
              { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
            ]
          })),
          getMergeRequestForBranch,
          getMergeRequestForRepositoryCurrentBranch
        },
        true
      )
    ).resolves.toMatchObject({
      entries: [{ review: { id: 28613303 } }],
      parentLookup: { review: { id: 28570763, state: 'merged' }, lookupErrorCode: null }
    })
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledWith({
      repoPath: '/workspace/repos/mw-cli'
    })
    expect(getMergeRequestForBranch.mock.calls.map(([args]) => args.repoPath)).toEqual([
      '/workspace'
    ])
  })

  it('does not retry an authentication failure', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn().mockResolvedValue({
      ok: false,
      code: 'auth_required'
    })

    await loadAoneChildMergeRequests({
      parentWorktreePath: '/workspace',
      branch: 'feature/listener_influence',
      scanNestedRepos: vi.fn(async () => ({
        repos: [
          { path: '/workspace', displayName: 'workspace', depth: 0 },
          { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
        ]
      })),
      getMergeRequestForBranch: vi.fn(),
      getMergeRequestForRepositoryCurrentBranch
    })

    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(1)
  })

  it('surfaces Aone flow control without retrying it immediately', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn().mockResolvedValue({
      ok: false,
      code: 'unknown',
      error: 'a1-server error: FLOW_CONTROL_ERROR Sentinel block signature'
    })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        branch: 'feature/listener_influence',
        scanNestedRepos: vi.fn(async () => ({
          repos: [
            { path: '/workspace', displayName: 'workspace', depth: 0 },
            { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
          ]
        })),
        getMergeRequestForBranch: vi.fn(),
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'rate_limited'
      }
    ])
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(1)
  })
})
