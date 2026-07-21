import { normalizeHostedReviewBaseRef } from '../../shared/hosted-review-refs'
import { resolveDefaultBaseRefWithLocalGit } from '../git/repo'

export async function isRepositoryDefaultBranch(
  repoPath: string,
  branch: string,
  options: { wslDistro?: string } = {}
): Promise<boolean> {
  const defaultBaseRef = await resolveDefaultBaseRefWithLocalGit({ cwd: repoPath, ...options })
  return (
    defaultBaseRef !== null &&
    branch.toLowerCase() === normalizeHostedReviewBaseRef(defaultBaseRef).toLowerCase()
  )
}
