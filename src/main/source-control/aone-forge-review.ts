import type { HostedReviewInfo } from '../../shared/hosted-review'
import { getMergeRequest, getMergeRequestForBranch } from '../aone/client'
import { isRepositoryDefaultBranch } from '../aone/repository-default-branch'
import { mapCodeReview } from './forge-review-mappers'
import {
  getHostedReviewLocalGitOptions,
  type HostedReviewExecutionOptions
} from './hosted-review-git-options'

type AoneForgeReviewInput = {
  repoPath: string
  branch: string
  connectionId?: string | null
  linkedReviewNumber?: number | null
} & HostedReviewExecutionOptions

export async function getAoneForgeReviewForBranch(
  input: AoneForgeReviewInput
): Promise<HostedReviewInfo | null> {
  if (
    !input.connectionId &&
    (await isRepositoryDefaultBranch(
      input.repoPath,
      input.branch,
      getHostedReviewLocalGitOptions(input)
    ))
  ) {
    // Why: Code default branches never own change requests; stop before
    // linked-review and branch lookups so sidebar refreshes do not call a1.
    return null
  }
  const linked =
    input.linkedReviewNumber == null
      ? null
      : await getMergeRequest(input.linkedReviewNumber, { cwd: input.repoPath })
  const mr = linked ?? (await getMergeRequestForBranch(input.branch, { cwd: input.repoPath }))
  return mr ? mapCodeReview(mr) : null
}
