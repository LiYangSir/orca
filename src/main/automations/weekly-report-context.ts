import {
  buildWeeklyReportReviewLookupOptions,
  collectWeeklyReportEvidence,
  type WeeklyReportA1DeliveryEvidence,
  type WeeklyReportCommit
} from '../../shared/automation-weekly-report'
import { buildWeeklyReportPrompt } from '../../shared/automation-weekly-report-prompt'
import type { Automation } from '../../shared/automations-types'
import { getRepoExecutionHostId } from '../../shared/execution-host'
import type { Repo, Worktree } from '../../shared/types'
import { collectA1WeeklyReportDelivery } from '../aone/weekly-report-delivery'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

const MAX_COMMITS_PER_WORKTREE = 20
const GIT_HISTORY_LIMIT = 100

type WeeklyReportRuntime = Pick<
  OrcaRuntimeService,
  'getHostedReviewForBranch' | 'getRuntimeGitHistory' | 'listManagedWorktrees' | 'listRepos'
>

function getA1DeliveryForWorkspace(
  repo: Repo,
  worktree: Worktree
): Promise<WeeklyReportA1DeliveryEvidence> {
  if (getRepoExecutionHostId(repo) !== 'local') {
    // Why: a local a1 process must never receive an SSH/runtime-owned path;
    // that could query an unrelated local directory with the same spelling.
    return Promise.resolve({
      mrLookup: 'unsupported_host',
      releaseLookup: 'unsupported_host',
      mr: null,
      changeRequests: []
    })
  }
  return collectA1WeeklyReportDelivery(worktree.path, worktree.branch)
}

export async function buildHeadlessWeeklyReportPrompt({
  runtime,
  automation,
  scheduledFor
}: {
  runtime: WeeklyReportRuntime
  automation: Automation
  scheduledFor: number
}): Promise<string> {
  // Direct runtime calls are not paginated; this requests the complete visible
  // set so an arbitrary list cap cannot silently omit a changed project.
  const listed = await runtime.listManagedWorktrees(undefined, Number.MAX_SAFE_INTEGER)
  const evidence = await collectWeeklyReportEvidence({
    scheduledFor,
    timezone: automation.timezone,
    repos: runtime.listRepos(),
    worktrees: listed.worktrees,
    adapters: {
      scanWorkspace: async (_repo, worktree, periodStart, periodEnd) => {
        const history = await runtime.getRuntimeGitHistory(`id:${worktree.id}`, {
          limit: GIT_HISTORY_LIMIT
        })
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
      lookupReview: (repo, worktree) =>
        runtime.getHostedReviewForBranch({
          repoSelector: `id:${repo.id}`,
          branch: worktree.branch,
          ...buildWeeklyReportReviewLookupOptions(worktree)
        }),
      lookupA1Delivery: getA1DeliveryForWorkspace
    }
  })
  return buildWeeklyReportPrompt(automation.prompt, evidence)
}
