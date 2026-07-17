import type { HostedReviewState } from '../../../../shared/hosted-review'
import type { AoneMergeRequest } from './AoneWorkspaceMergeRequests'

export function classifyAoneFailure(code: string | undefined, error: string | undefined): string {
  const message = error?.toLowerCase() ?? ''
  if (message.includes('flow_control_error') || message.includes('sentinel block signature')) {
    return 'rate_limited'
  }
  return code ?? 'unknown'
}

export function mapAoneMergeRequestState(
  review: Pick<AoneMergeRequest, 'state' | 'workInProgress'>
): HostedReviewState {
  if (review.workInProgress === true) {
    return 'draft'
  }
  if (review.state === 'opened') {
    return 'open'
  }
  if (review.state === 'merged') {
    return 'merged'
  }
  return 'closed'
}
