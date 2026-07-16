import { describe, expect, it } from 'vitest'
import type { GitHubWorkItem, Repo } from '../../../shared/types'
import { groupGitHubWorkItems } from './task-page-github-grouping'

function item(repoId: string, id: number): GitHubWorkItem {
  // Why: the grouping logic only reads repoId, so a minimal cast keeps the
  // fixture focused on the grouping behavior under test.
  return { repoId, id } as unknown as GitHubWorkItem
}

function repo(id: string, displayName: string, badgeColor: string): Repo {
  return { id, displayName, badgeColor } as unknown as Repo
}

describe('groupGitHubWorkItems', () => {
  it('returns a single flat section when grouping is disabled', () => {
    const sections = groupGitHubWorkItems([item('r1', 1), item('r2', 2)], 'none', new Map())
    expect(sections).toHaveLength(1)
    expect(sections[0]?.key).toBe('all')
    expect(sections[0]?.items.map((i) => i.id)).toEqual([1, 2])
  })

  it('buckets items by repository, preserving first-seen order', () => {
    const repoMap = new Map([
      ['r1', repo('r1', 'Service A', '#f00')],
      ['r2', repo('r2', 'Service B', '#0f0')]
    ])
    const sections = groupGitHubWorkItems(
      // Why: interleaved repos must still collapse to one section per repo in
      // first-seen order, not repoMap insertion order.
      [item('r2', 21), item('r1', 11), item('r2', 22), item('r1', 12)],
      'repo',
      repoMap
    )
    expect(sections.map((s) => s.key)).toEqual(['repo:r2', 'repo:r1'])
    expect(sections[0]?.label).toBe('Service B')
    expect(sections[0]?.color).toBe('#0f0')
    expect(sections[0]?.items.map((i) => i.id)).toEqual([21, 22])
    expect(sections[1]?.items.map((i) => i.id)).toEqual([11, 12])
  })

  it('falls back to repoId label and null color for unknown repos', () => {
    const sections = groupGitHubWorkItems([item('mystery', 1)], 'repo', new Map())
    expect(sections).toHaveLength(1)
    expect(sections[0]?.label).toBe('mystery')
    expect(sections[0]?.color).toBeNull()
  })

  it('returns an empty section list for no items grouped by repo', () => {
    expect(groupGitHubWorkItems([], 'repo', new Map())).toEqual([])
  })
})
