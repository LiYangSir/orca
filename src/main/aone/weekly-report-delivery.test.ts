import { beforeEach, describe, expect, it, vi } from 'vitest'

const { a1ExecJsonMock, getMergeRequestMock, getMergeRequestStatusMock } = vi.hoisted(() => ({
  a1ExecJsonMock: vi.fn(),
  getMergeRequestMock: vi.fn(),
  getMergeRequestStatusMock: vi.fn()
}))

vi.mock('./a1-runner', () => ({
  A1Error: class A1Error extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly stderr = ''
    ) {
      super(message)
    }
  },
  a1ExecJson: a1ExecJsonMock
}))

vi.mock('./client', () => ({
  getMergeRequestForBranchWithMergedFallback: getMergeRequestMock
}))

vi.mock('./task-client', () => ({
  getMergeRequestStatus: getMergeRequestStatusMock
}))

import { A1Error } from './a1-runner'
import { collectA1WeeklyReportDelivery } from './weekly-report-delivery'

describe('a1 weekly report delivery evidence', () => {
  beforeEach(() => {
    a1ExecJsonMock.mockReset()
    getMergeRequestMock.mockReset()
    getMergeRequestStatusMock.mockReset()
  })

  it('collects merged MR status and direct CR deployment facts', async () => {
    getMergeRequestMock.mockResolvedValue({
      id: 218,
      iid: 12,
      title: '支持动态限流规则',
      state: 'merged',
      sourceBranch: 'feature/sentinel-rule',
      targetBranch: 'master',
      detailUrl: 'https://code.alibaba-inc.com/codereview/218'
    })
    getMergeRequestStatusMock.mockResolvedValue({
      mergeStatus: 'merged',
      ciStatus: 'success',
      approveStatus: 'satisfied',
      blockers: []
    })
    a1ExecJsonMock.mockResolvedValue([
      {
        crId: 9001,
        appName: 'diamond-server',
        description: '动态规则发布',
        crStatus: 'DONE',
        crDetailUrl: 'https://aone.alibaba-inc.com/change/9001',
        deployed_at: '2026-07-16 18:20:00'
      }
    ])

    await expect(
      collectA1WeeklyReportDelivery('/repo', 'refs/heads/feature/sentinel-rule')
    ).resolves.toEqual({
      mrLookup: 'available',
      releaseLookup: 'available',
      mr: {
        id: 218,
        title: '支持动态限流规则',
        state: 'merged',
        url: 'https://code.alibaba-inc.com/codereview/218',
        mergeStatus: 'merged',
        ciStatus: 'success',
        approveStatus: 'satisfied',
        blockers: []
      },
      changeRequests: [
        {
          id: '9001',
          appName: 'diamond-server',
          description: '动态规则发布',
          status: 'DONE',
          url: 'https://aone.alibaba-inc.com/change/9001',
          deployedAt: '2026-07-16 18:20:00'
        }
      ]
    })
    expect(getMergeRequestMock).toHaveBeenCalledWith(
      'feature/sentinel-rule',
      expect.objectContaining({ cwd: '/repo', timeout: 15_000 })
    )
    expect(a1ExecJsonMock).toHaveBeenCalledWith(
      ['app', 'cr', 'get-by-branch', '--branch', 'feature/sentinel-rule'],
      expect.objectContaining({ cwd: '/repo' })
    )
  })

  it('preserves an a1 linkage gap instead of claiming no MR or release', async () => {
    const notLinked = new A1Error('not_linked', 'No linked resource')
    getMergeRequestMock.mockRejectedValue(notLinked)
    a1ExecJsonMock.mockRejectedValue(notLinked)

    await expect(collectA1WeeklyReportDelivery('/repo', 'feature/unlinked')).resolves.toEqual({
      mrLookup: 'not_linked',
      releaseLookup: 'not_linked',
      mr: null,
      changeRequests: []
    })
    expect(getMergeRequestStatusMock).not.toHaveBeenCalled()
  })
})
