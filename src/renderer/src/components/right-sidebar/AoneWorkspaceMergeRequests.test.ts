import { describe, expect, it, vi } from 'vitest'
import {
  loadAoneChildMergeRequests,
  loadAoneWorkspaceMergeRequests
} from './AoneWorkspaceMergeRequests'

describe('loadAoneChildMergeRequests', () => {
  it('queries only nested repositories and preserves merged reviews', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForBranch = vi.fn(async ({ repoPath }: { repoPath?: string | null }) =>
      repoPath?.endsWith('diamondops')
        ? {
            ok: true,
            data: {
              id: 28612989,
              title: 'Support listener queries',
              state: 'merged'
            }
          }
        : { ok: false, code: 'not_linked' }
    )

    const result = await loadAoneChildMergeRequests({
      parentWorktreePath: '/workspace',
      branch: 'feature/listener_influence',
      scanNestedRepos,
      getMergeRequestForBranch
    })

    expect(scanNestedRepos).toHaveBeenCalledWith({
      path: '/workspace',
      options: { descendIntoGitRepoRoot: true, maxRepos: 50, timeoutMs: 10_000 }
    })
    expect(getMergeRequestForBranch.mock.calls.map(([args]) => args)).toEqual([
      {
        branch: 'feature/listener_influence',
        repoPath: '/workspace/repos/diamondops'
      },
      { branch: 'feature/listener_influence', repoPath: '/workspace/repos/mw-cli' }
    ])
    expect(result).toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        review: {
          id: 28612989,
          title: 'Support listener queries',
          state: 'merged'
        },
        lookupErrorCode: null
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
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
    const getMergeRequestForBranch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'invalid_output' })
      .mockResolvedValueOnce({
        ok: true,
        data: { id: 28613303, title: 'Listener queries', state: 'opened' }
      })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        branch: 'feature/listener_influence',
        scanNestedRepos,
        getMergeRequestForBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        review: { id: 28613303, title: 'Listener queries', state: 'opened' },
        lookupErrorCode: null
      }
    ])
    expect(getMergeRequestForBranch).toHaveBeenCalledTimes(2)
  })

  it('keeps other repositories when one lookup rejects', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForBranch = vi.fn(async ({ repoPath }: { repoPath?: string | null }) => {
      if (repoPath?.endsWith('diamondops')) {
        throw new Error('transport closed')
      }
      return {
        ok: true,
        data: { id: 28613303, title: 'Listener queries', state: 'opened' }
      }
    })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        branch: 'feature/listener_influence',
        scanNestedRepos,
        getMergeRequestForBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        review: null,
        lookupErrorCode: 'unknown'
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
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
          : { id: 28613303, title: 'CLI review', state: 'opened' }
    }))

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
          getMergeRequestForBranch
        },
        true
      )
    ).resolves.toMatchObject({
      entries: [{ review: { id: 28613303 } }],
      parentLookup: { review: { id: 28570763, state: 'merged' }, lookupErrorCode: null }
    })
    expect(getMergeRequestForBranch.mock.calls.map(([args]) => args.repoPath)).toEqual([
      '/workspace/repos/mw-cli',
      '/workspace'
    ])
  })

  it('does not retry an authentication failure', async () => {
    const getMergeRequestForBranch = vi.fn().mockResolvedValue({
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
      getMergeRequestForBranch
    })

    expect(getMergeRequestForBranch).toHaveBeenCalledTimes(1)
  })

  it('surfaces Aone flow control without retrying it immediately', async () => {
    const getMergeRequestForBranch = vi.fn().mockResolvedValue({
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
        getMergeRequestForBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        review: null,
        lookupErrorCode: 'rate_limited'
      }
    ])
    expect(getMergeRequestForBranch).toHaveBeenCalledTimes(1)
  })
})
