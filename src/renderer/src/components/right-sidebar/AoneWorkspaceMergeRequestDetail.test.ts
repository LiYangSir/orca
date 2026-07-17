import { describe, expect, it, vi } from 'vitest'
import { loadAoneWorkspaceMergeRequestComments } from './AoneWorkspaceMergeRequestDetail'

describe('loadAoneWorkspaceMergeRequestComments', () => {
  it('loads comments only from the selected child repository and maps them for the shared list', async () => {
    const listMRComments = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          id: 41,
          note: 'Keep the compatibility comment.',
          author: { name: 'Reviewer' },
          createdAt: '2026-07-15T10:00:00Z',
          path: 'src/listener.ts',
          line: 18,
          closed: 1
        }
      ]
    })

    await expect(
      loadAoneWorkspaceMergeRequestComments({
        repoPath: '/workspace/repos/diamondops',
        mergeRequestId: 28612989,
        listMRComments
      })
    ).resolves.toEqual({
      ok: true,
      comments: [
        {
          id: 41,
          author: 'Reviewer',
          authorAvatarUrl: '',
          body: 'Keep the compatibility comment.',
          createdAt: '2026-07-15T10:00:00Z',
          url: '',
          path: 'src/listener.ts',
          line: 18,
          isResolved: true,
          isOutdated: undefined
        }
      ]
    })
    expect(listMRComments).toHaveBeenCalledWith({
      mr: 28612989,
      repoPath: '/workspace/repos/diamondops'
    })
  })

  it('retries only transient failures', async () => {
    const listMRComments = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'invalid_output', error: 'partial output' })
      .mockResolvedValueOnce({ ok: true, data: [] })

    await expect(
      loadAoneWorkspaceMergeRequestComments({
        repoPath: '/workspace/repos/mw-cli',
        mergeRequestId: 28613303,
        listMRComments
      })
    ).resolves.toEqual({ ok: true, comments: [] })
    expect(listMRComments).toHaveBeenCalledTimes(2)
  })

  it('preserves actionable failure codes without retrying them', async () => {
    const listMRComments = vi.fn().mockResolvedValue({
      ok: false,
      code: 'auth_required',
      error: 'login required'
    })

    await expect(
      loadAoneWorkspaceMergeRequestComments({
        repoPath: '/workspace/repos/mw-cli',
        mergeRequestId: 28613303,
        listMRComments
      })
    ).resolves.toEqual({
      ok: false,
      code: 'auth_required'
    })
    expect(listMRComments).toHaveBeenCalledTimes(1)
  })

  it('turns an IPC rejection into a retryable failure', async () => {
    await expect(
      loadAoneWorkspaceMergeRequestComments({
        repoPath: '/workspace/repos/mw-cli',
        mergeRequestId: 28613303,
        listMRComments: vi.fn().mockRejectedValue(new Error('transport closed'))
      })
    ).resolves.toEqual({ ok: false, code: 'unknown' })
  })

  it('recognizes Aone flow control without an immediate retry', async () => {
    const listMRComments = vi.fn().mockResolvedValue({
      ok: false,
      code: 'unknown',
      error: 'a1-server error: FLOW_CONTROL_ERROR Sentinel block signature'
    })

    await expect(
      loadAoneWorkspaceMergeRequestComments({
        repoPath: '/workspace/repos/mw-cli',
        mergeRequestId: 28613303,
        listMRComments
      })
    ).resolves.toEqual({ ok: false, code: 'rate_limited' })
    expect(listMRComments).toHaveBeenCalledTimes(1)
  })
})
