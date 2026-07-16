import type { GitHubWorkItem, Repo } from '../../../shared/types'
import type { GitHubGroupBy } from './task-page-localized-options'

export type GitHubGroupSection = {
  key: string
  label: string
  color: string | null
  items: GitHubWorkItem[]
}

// Why: mirrors LinearIssueListRow so the GitHub PR/issue list can render one
// group-header row per repository in a multi-repo workspace.
export type GitHubWorkItemListRow =
  | { type: 'section'; key: string; label: string; color: string | null; count: number }
  | { type: 'item'; item: GitHubWorkItem }

/**
 * Buckets the merged cross-repo work-item list into one section per repository
 * (keyed by `GitHubWorkItem.repoId`). `groupBy: 'none'` keeps the existing flat
 * merge — only `'repo'` adds per-repository group headers.
 */
export function groupGitHubWorkItems(
  items: GitHubWorkItem[],
  groupBy: GitHubGroupBy,
  repoMap: ReadonlyMap<string, Repo>
): GitHubGroupSection[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', color: null, items }]
  }
  const sections = new Map<string, GitHubGroupSection>()
  for (const item of items) {
    const repo = repoMap.get(item.repoId)
    const key = `repo:${item.repoId}`
    const section = sections.get(key)
    if (section) {
      section.items.push(item)
    } else {
      sections.set(key, {
        key,
        label: repo?.displayName ?? item.repoId,
        color: repo?.badgeColor ?? null,
        items: [item]
      })
    }
  }
  return [...sections.values()]
}
