import { describe, expect, it } from 'vitest'
import { beforeEach, vi } from 'vitest'

const { a1ExecJsonMock } = vi.hoisted(() => ({
  a1ExecJsonMock: vi.fn()
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
  a1ExecFileAsync: vi.fn(),
  a1ExecJson: a1ExecJsonMock,
  isA1Installed: vi.fn()
}))

import { getMergeRequest, getMergeRequestForBranch, isAoneCodeRemoteUrl } from './client'

describe('Aone client remote detection', () => {
  it('detects Alibaba-hosted code remotes by host suffix', () => {
    expect(isAoneCodeRemoteUrl('https://code.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('https://gitlab.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('git@gitlab.alibaba-inc.com:group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('ssh://git@future-code.alibaba-inc.com/group/repo.git')).toBe(true)
  })

  it('does not match non-host occurrences of the Alibaba domain', () => {
    expect(isAoneCodeRemoteUrl('https://github.com/alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('https://not-alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('git@github.com:alibaba-inc.com/repo.git')).toBe(false)
  })
})

describe('Aone client merge request lookup', () => {
  beforeEach(() => {
    a1ExecJsonMock.mockReset()
  })

  it('unwraps repo mr view payloads', async () => {
    a1ExecJsonMock.mockResolvedValue({
      mergeRequest: {
        id: 28280121,
        iid: 1,
        title: 'Init',
        state: 'opened',
        sourceBranch: 'docs/init',
        targetBranch: 'master',
        detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
      }
    })

    await expect(getMergeRequest(28280121, { cwd: '/repo' })).resolves.toMatchObject({
      id: 28280121,
      detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
    })
    expect(a1ExecJsonMock).toHaveBeenCalledWith(['repo', 'mr', 'view', '28280121'], {
      cwd: '/repo'
    })
  })

  it('hydrates branch lookup results with the canonical view URL', async () => {
    a1ExecJsonMock
      .mockResolvedValueOnce([
        {
          id: 28280121,
          iid: 1,
          title: 'Init',
          state: 'opened',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          webUrl: '',
          detailUrl: ''
        }
      ])
      .mockResolvedValueOnce({
        mergeRequest: {
          id: 28280121,
          iid: 1,
          title: 'Init',
          state: 'opened',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
        }
      })

    await expect(getMergeRequestForBranch('docs/init', { cwd: '/repo' })).resolves.toMatchObject({
      id: 28280121,
      detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
    })
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      1,
      ['repo', 'mr', 'list', '--state', 'opened', '--source', 'docs/init'],
      { cwd: '/repo' }
    )
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(2, ['repo', 'mr', 'view', '28280121'], {
      cwd: '/repo'
    })
  })
})
