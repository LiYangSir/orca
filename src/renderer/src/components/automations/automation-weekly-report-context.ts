import {
  buildWeeklyReportReviewLookupOptions,
  collectWeeklyReportEvidence as collectEvidence,
  type WeeklyReportA1DeliveryEvidence,
  type WeeklyReportCommit,
  type WeeklyReportEvidence
} from '../../../../shared/automation-weekly-report'
import { buildWeeklyReportPrompt } from '../../../../shared/automation-weekly-report-prompt'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import type { HostedReviewInfo } from '../../../../shared/hosted-review'
import type { GlobalSettings, Repo, Worktree } from '../../../../shared/types'
import { getRepoOwnerRoutedSettings } from '@/lib/repo-runtime-owner'
import { getRuntimeGitHistory } from '@/runtime/runtime-git-client'

const MAX_COMMITS_PER_WORKTREE = 20
const GIT_HISTORY_LIMIT = 100

type WeeklyReportContextArgs = {
  scheduledFor: number
  timezone: string
  repos: readonly Repo[]
  worktrees: readonly Worktree[]
  settings: GlobalSettings | null
  fetchHostedReviewForBranch: (
    repoPath: string,
    branch: string,
    options: ReturnType<typeof buildWeeklyReportReviewLookupOptions>
  ) => Promise<HostedReviewInfo | null>
}

export { buildWeeklyReportPrompt }
export type { WeeklyReportEvidence }

async function getA1DeliveryForWorkspace(
  repo: Repo,
  worktree: Worktree
): Promise<WeeklyReportA1DeliveryEvidence> {
  if (getRepoExecutionHostId(repo) !== 'local') {
    // Why: the local a1 CLI cannot safely query a path owned by SSH or a
    // runtime host; report the gap instead of accidentally using another repo.
    return {
      mrLookup: 'unsupported_host',
      releaseLookup: 'unsupported_host',
      mr: null,
      changeRequests: []
    }
  }
  const response = (await window.api.aone.getWeeklyReportDelivery({
    branch: worktree.branch,
    repoPath: worktree.path
  })) as { ok?: boolean; data?: WeeklyReportA1DeliveryEvidence }
  if (response?.ok && response.data) {
    return response.data
  }
  return {
    mrLookup: 'unavailable',
    releaseLookup: 'unavailable',
    mr: null,
    changeRequests: []
  }
}

export async function collectWeeklyReportEvidence({
  scheduledFor,
  timezone,
  repos,
  worktrees,
  settings,
  fetchHostedReviewForBranch
}: WeeklyReportContextArgs): Promise<WeeklyReportEvidence> {
  return collectEvidence({
    scheduledFor,
    timezone,
    repos,
    worktrees,
    adapters: {
      scanWorkspace: async (repo, worktree, periodStart, periodEnd) => {
        const context = {
          settings: getRepoOwnerRoutedSettings(settings, repo),
          worktreeId: worktree.id,
          worktreePath: worktree.path,
          connectionId: repo.connectionId ?? undefined
        }
        const history = await getRuntimeGitHistory(context, { limit: GIT_HISTORY_LIMIT })
        const commits: WeeklyReportCommit[] = history.items
          .filter(
            (item) =>
              item.timestamp !== undefined &&
              item.timestamp >= periodStart &&
              item.timestamp <= periodEnd
          )
          .slice(0, MAX_COMMITS_PER_WORKTREE)
          .map((item) => ({ subject: item.subject }))
        return {
          commits,
          gitEvidenceUnavailable: false
        }
      },
      lookupReview: (_repo, worktree) =>
        fetchHostedReviewForBranch(
          worktree.path,
          worktree.branch,
          buildWeeklyReportReviewLookupOptions(worktree)
        ),
      lookupA1Delivery: getA1DeliveryForWorkspace
    }
  })
}
