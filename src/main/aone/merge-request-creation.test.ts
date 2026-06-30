import { beforeEach, describe, expect, it, vi } from 'vitest'

const { a1ExecJsonMock, getMergeRequestForBranchMock } = vi.hoisted(() => ({
  a1ExecJsonMock: vi.fn(),
  getMergeRequestForBranchMock: vi.fn()
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
  getMergeRequestForBranch: getMergeRequestForBranchMock
}))

import { createAoneMergeRequest } from './merge-request-creation'

describe('createAoneMergeRequest', () => {
  beforeEach(() => {
    a1ExecJsonMock.mockReset()
    getMergeRequestForBranchMock.mockReset()
  })

  it('creates an Aone Code MR with normalized branch refs', async () => {
    a1ExecJsonMock.mockResolvedValue({
      id: 123,
      iid: 7,
      title: 'Init docs',
      state: 'opened',
      sourceBranch: 'docs/init',
      targetBranch: 'master',
      detailUrl: 'https://gitlab.alibaba-inc.com/quguai.ly/bruno/codereview/123'
    })

    await expect(
      createAoneMergeRequest('/repo', {
        provider: 'code',
        base: 'refs/heads/master',
        head: 'refs/heads/docs/init',
        title: '  Init docs  ',
        body: 'Body'
      })
    ).resolves.toEqual({
      ok: true,
      number: 123,
      url: 'https://gitlab.alibaba-inc.com/quguai.ly/bruno/codereview/123'
    })

    expect(a1ExecJsonMock).toHaveBeenCalledWith(
      [
        'repo',
        'mr',
        'create',
        '--source',
        'docs/init',
        '--target',
        'master',
        '--title',
        'Init docs',
        '--description',
        'Body'
      ],
      { cwd: '/repo', timeout: 60_000 }
    )
  })

  it('returns an existing MR when create reports a duplicate', async () => {
    a1ExecJsonMock.mockRejectedValue(new Error('merge request already exists'))
    getMergeRequestForBranchMock.mockResolvedValue({
      id: 456,
      iid: 8,
      title: 'Existing',
      state: 'opened',
      sourceBranch: 'docs/init',
      targetBranch: 'master',
      webUrl: 'https://gitlab.alibaba-inc.com/quguai.ly/bruno/codereview/456'
    })

    await expect(
      createAoneMergeRequest('/repo', {
        provider: 'code',
        base: 'master',
        head: 'docs/init',
        title: 'Init docs'
      })
    ).resolves.toEqual({
      ok: false,
      code: 'already_exists',
      error: 'A merge request already exists for this branch.',
      existingReview: {
        number: 456,
        url: 'https://gitlab.alibaba-inc.com/quguai.ly/bruno/codereview/456'
      }
    })
  })
})
