import { beforeEach, describe, expect, it, vi } from 'vitest'

const { commandExecFileAsyncMock } = vi.hoisted(() => ({
  commandExecFileAsyncMock: vi.fn()
}))

vi.mock('../git/runner', () => ({
  commandExecFileAsync: commandExecFileAsyncMock
}))

import { a1ExecFileAsync } from './a1-runner'

describe('a1 runner error classification', () => {
  beforeEach(() => {
    commandExecFileAsyncMock.mockReset()
  })

  it('classifies Aone Sentinel flow control as rate limited', async () => {
    commandExecFileAsyncMock.mockRejectedValueOnce({
      stderr:
        'a1-server error: {"errorCode":"FLOW_CONTROL_ERROR","message":"Sentinel block signature: SearchCodeReviewV5Rest#queryContent"}',
      message: 'Error: searching MRs'
    })

    await expect(a1ExecFileAsync(['repo', 'mr', 'list'])).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Aone is temporarily rate limiting merge request queries. Try again shortly.'
    })
  })
})
