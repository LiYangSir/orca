import type { NestedRepoScanResult } from './types'

/**
 * Why: a plain parent folder ('non_git_folder') and a git-repo workspace root
 * whose scan surfaced nested members ('git_repo_with_nested') both route through
 * the nested-import review. Centralized so every add-repo flow (local folder,
 * server path, onboarding) agrees on which scan kinds trigger the review UI.
 */
export function isNestedRepoScanReviewKind(
  selectedPathKind: NestedRepoScanResult['selectedPathKind']
): boolean {
  return selectedPathKind === 'non_git_folder' || selectedPathKind === 'git_repo_with_nested'
}
