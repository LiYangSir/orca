import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  a1ExecJson: a1ExecJsonMock
}))

import { A1Error } from './a1-runner'
import { listMergeRequestComments } from './task-client'

describe('Aone task client comment lookup', () => {
  beforeEach(() => {
    a1ExecJsonMock.mockReset()
  })

  it('distinguishes no comments from malformed JSON output', async () => {
    a1ExecJsonMock.mockRejectedValueOnce(
      new A1Error('invalid_output', 'a1 returned an empty response')
    )

    await expect(listMergeRequestComments(28570763, { cwd: '/repo' })).resolves.toEqual([])

    const malformed = new A1Error('invalid_output', 'Failed to parse a1 JSON output', '{broken')
    a1ExecJsonMock.mockRejectedValueOnce(malformed)

    await expect(listMergeRequestComments(28570763, { cwd: '/repo' })).rejects.toBe(malformed)
  })
})
