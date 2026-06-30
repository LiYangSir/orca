import { describe, expect, it } from 'vitest'
import { mapA1CommentToPRComment } from './gh-shape-mappers'

describe('Aone GitHub-shape mappers', () => {
  it('maps a1 MR comment fields into PR comments', () => {
    expect(
      mapA1CommentToPRComment({
        id: 230557408,
        note: '这是什么？',
        author: { id: 300038, name: '曲怪', username: 'quguai.ly' },
        closed: 0,
        createdAt: '2026-06-30T15:37:21+08:00',
        path: 'CliProxyApi/models copy.bru',
        line: 4,
        outdated: false
      })
    ).toMatchObject({
      id: 230557408,
      author: '曲怪',
      body: '这是什么？',
      createdAt: '2026-06-30T15:37:21+08:00',
      path: 'CliProxyApi/models copy.bru',
      line: 4
    })
  })
})
