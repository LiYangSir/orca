import type { HostedReviewCreationBlockedReason } from '../../../../shared/hosted-review'
import { translate } from '@/i18n/i18n'

type PRRefreshStatus = 'queued' | 'in-flight' | 'paused' | 'error' | 'skipped' | undefined

type ChecksPanelEmptyStateInput = {
  operationLabel: string | null
  prRefreshStatus: PRRefreshStatus
  hostedReviewBlockedReason: HostedReviewCreationBlockedReason | undefined
  hasUpstream: boolean | undefined
  hasCurrentBranch?: boolean
  reviewLabel?: 'pull request' | 'merge request'
  reviewShortLabel?: 'PR' | 'MR'
  hasAmbiguousGitHubHostedReview?: boolean
}

type ChecksPanelEmptyStateCopy = {
  title: string
  description: string
}

/**
 * Chooses neutral empty-state copy when GitHub review status is still ambiguous.
 */
export function getChecksPanelEmptyStateCopy(
  input: ChecksPanelEmptyStateInput
): ChecksPanelEmptyStateCopy {
  const reviewLabel = input.reviewLabel ?? 'pull request'
  const reviewShortLabel = input.reviewShortLabel ?? 'PR'
  if (input.operationLabel) {
    return {
      title: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.d77c513c1e',
        '{{value0}} in progress',
        { value0: input.operationLabel }
      ),
      description: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.05e4aec17b',
        '{{value0}} checks will be available after the operation completes',
        { value0: reviewShortLabel }
      )
    }
  }

  const blockedReason = input.hostedReviewBlockedReason
  // Why: hosted-review metadata with missing PR cache data is ambiguous, so
  // avoid showing "no PR" or publish guidance until GitHub status is refreshed.
  if (
    input.hasAmbiguousGitHubHostedReview === true &&
    (input.prRefreshStatus === 'paused' ||
      input.prRefreshStatus === 'skipped' ||
      input.prRefreshStatus === undefined)
  ) {
    return {
      title: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.3322603418',
        '{{value0}} status unavailable',
        { value0: reviewShortLabel }
      ),
      description: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.b597440265',
        'Refresh {{value0}} status for this branch to load checks and review.',
        { value0: reviewShortLabel }
      )
    }
  }

  if (
    shouldShowChecksPanelPublishBranchAction({
      hostedReviewBlockedReason: blockedReason,
      hasUpstream: input.hasUpstream,
      hasCurrentBranch: input.hasCurrentBranch
    })
  ) {
    // Why: a local-only branch cannot have GitHub PR status yet; surfacing a
    // refresh error here makes a normal pre-publish state look broken.
    return {
      title: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.41252bc53f',
        'Branch not published'
      ),
      description: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.f8543140cc',
        'Publish this branch before creating a {{value0}}.',
        { value0: reviewLabel }
      )
    }
  }

  if (blockedReason === 'needs_push') {
    return {
      title: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.76e15946a9',
        'Branch has unpushed commits'
      ),
      description: translate(
        'auto.components.right.sidebar.checks.panel.empty.state.6ce9d4e069',
        'Push your branch before creating a {{value0}}.',
        { value0: reviewLabel }
      )
    }
  }

  switch (input.prRefreshStatus) {
    case 'error':
      return {
        title: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.5f478ab3d3',
          'Could not refresh {{value0}}',
          { value0: reviewLabel }
        ),
        description: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.2bdd7aaf2d',
          '{{value0}} status could not be refreshed. Existing cached data was preserved.',
          { value0: reviewShortLabel }
        )
      }
    case 'queued':
      return {
        title: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.938b5606a6',
          'Checking for {{value0}}',
          { value0: reviewLabel }
        ),
        description: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.6ba2440770',
          'Waiting to refresh {{value0}} status for this branch',
          { value0: reviewShortLabel }
        )
      }
    case 'in-flight':
      return {
        title: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.938b5606a6',
          'Checking for {{value0}}',
          { value0: reviewLabel }
        ),
        description: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.3d4af82ff4',
          'Refreshing {{value0}} status for this branch',
          { value0: reviewShortLabel }
        )
      }
    case 'paused':
      return {
        title: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.7c299df37b',
          'No {{value0}} found',
          { value0: reviewLabel }
        ),
        description: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.d372072df1',
          '{{value0}} refresh is paused by the current rate-limit budget',
          { value0: reviewShortLabel }
        )
      }
    case 'skipped':
    case undefined:
      return {
        title: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.13e1c7d5ed',
          'No {{value0}} found',
          { value0: reviewLabel }
        ),
        description: translate(
          'auto.components.right.sidebar.checks.panel.empty.state.5b0cfae9a5',
          'Create a {{value0}} to start checks and review.',
          { value0: reviewLabel }
        )
      }
  }
}

/**
 * Separates local-only branch guidance from hosted-review refresh uncertainty.
 */
export function shouldShowChecksPanelPublishBranchAction(input: {
  hostedReviewBlockedReason: HostedReviewCreationBlockedReason | undefined
  hasUpstream: boolean | undefined
  hasCurrentBranch?: boolean
}): boolean {
  if (input.hasCurrentBranch === false) {
    return false
  }
  const blockedReason = input.hostedReviewBlockedReason
  return input.hasUpstream === false || blockedReason === 'no_upstream'
}
