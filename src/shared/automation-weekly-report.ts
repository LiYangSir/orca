import type { HostedReviewInfo } from './hosted-review'
import { getRepoExecutionHostId } from './execution-host'
import { normalizeGitRemoteUrl } from './git-remote-identity'
import { mapWithConcurrency } from './map-with-concurrency'
import { getWeeklyReportPeriodStart } from './automation-weekly-report-period'
import type { Repo, Worktree } from './types'

export { getWeeklyReportPeriodStart } from './automation-weekly-report-period'

const MAX_REVIEW_LOOKUPS = 40
const REPORT_SCAN_CONCURRENCY = 2

export type WeeklyReportReviewLookupOptions = {
  repoId?: string
  currentHeadOid?: string | null
  linkedGitHubPR?: number | null
  linkedGitLabMR?: number | null
  linkedBitbucketPR?: number | null
  linkedAzureDevOpsPR?: number | null
  linkedGiteaPR?: number | null
  linkedCodeMR?: number | null
}

export type WeeklyReportCommit = {
  subject: string
}

export type WeeklyReportWorkspaceScan = {
  commits: WeeklyReportCommit[]
  gitEvidenceUnavailable: boolean
}

export type WeeklyReportA1LookupState =
  | 'available'
  | 'not_linked'
  | 'unsupported_host'
  | 'unavailable'

export type WeeklyReportA1MergeRequest = {
  id: number
  title: string
  state: string
  url: string | null
  mergeStatus: string | null
  ciStatus: string | null
  approveStatus: string | null
  blockers: string[]
}

export type WeeklyReportA1ChangeRequest = {
  id: string
  appName: string | null
  description: string | null
  status: string | null
  url: string | null
  deployedAt: string | null
}

export type WeeklyReportA1DeliveryEvidence = {
  mrLookup: WeeklyReportA1LookupState
  releaseLookup: WeeklyReportA1LookupState
  mr: WeeklyReportA1MergeRequest | null
  changeRequests: WeeklyReportA1ChangeRequest[]
}

export type WeeklyReportWorkspaceEvidence = WeeklyReportWorkspaceScan & {
  projectKey: string
  projectName: string
  workspaceName: string
  branch: string
  lastActivityAt: number
  comment: string | null
  review: Pick<
    HostedReviewInfo,
    | 'provider'
    | 'number'
    | 'title'
    | 'state'
    | 'url'
    | 'status'
    | 'updatedAt'
    | 'mergeable'
    | 'reviewDecision'
    | 'baseRefName'
  > | null
  a1Delivery: WeeklyReportA1DeliveryEvidence | null
  linkedReviewLabels: string[]
  linkedWorkItemLabels: string[]
}

export type WeeklyReportEvidence = {
  periodStart: number
  periodEnd: number
  timezone?: string
  workspaces: WeeklyReportWorkspaceEvidence[]
  scannedWorktreeCount: number
  reviewLookupsTruncated: boolean
}

export type WeeklyReportEvidenceAdapters = {
  scanWorkspace: (
    repo: Repo,
    worktree: Worktree,
    periodStart: number,
    periodEnd: number
  ) => Promise<WeeklyReportWorkspaceScan>
  lookupReview: (repo: Repo, worktree: Worktree) => Promise<HostedReviewInfo | null>
  lookupA1Delivery?: (
    repo: Repo,
    worktree: Worktree
  ) => Promise<WeeklyReportA1DeliveryEvidence | null>
}

type WeeklyReportEvidenceArgs = {
  scheduledFor: number
  timezone?: string
  repos: readonly Repo[]
  worktrees: readonly Worktree[]
  adapters: WeeklyReportEvidenceAdapters
}

type ScannedWorkspace = WeeklyReportWorkspaceScan & {
  repo: Repo
  worktree: Worktree
}

function getWorktreeActivityAt(worktree: Worktree): number {
  return Math.max(worktree.lastActivityAt || 0, worktree.createdAt || 0)
}

function getWorktreeEvidenceKey(worktree: Worktree): string {
  return `${worktree.hostId ?? ''}\0${worktree.id}`
}

function findOwnedRepo(repos: readonly Repo[], worktree: Worktree): Repo | null {
  const exactHostMatch = repos.find(
    (repo) => repo.id === worktree.repoId && getRepoExecutionHostId(repo) === worktree.hostId
  )
  return exactHostMatch ?? repos.find((repo) => repo.id === worktree.repoId) ?? null
}

function selectCandidateWorktrees(worktrees: readonly Worktree[]): Worktree[] {
  return [
    ...new Map(worktrees.map((worktree) => [getWorktreeEvidenceKey(worktree), worktree])).values()
  ].sort((left, right) => getWorktreeActivityAt(right) - getWorktreeActivityAt(left))
}

function emptyWorkspaceScan(gitEvidenceUnavailable: boolean): WeeklyReportWorkspaceScan {
  return {
    commits: [],
    gitEvidenceUnavailable
  }
}

async function scanCandidate(
  repo: Repo,
  worktree: Worktree,
  periodStart: number,
  periodEnd: number,
  scanWorkspace: WeeklyReportEvidenceAdapters['scanWorkspace']
): Promise<ScannedWorkspace> {
  if (repo.kind === 'folder') {
    return { repo, worktree, ...emptyWorkspaceScan(false) }
  }
  try {
    return {
      repo,
      worktree,
      ...(await scanWorkspace(repo, worktree, periodStart, periodEnd))
    }
  } catch {
    return { repo, worktree, ...emptyWorkspaceScan(true) }
  }
}

function hasWeeklyEvidence(
  entry: ScannedWorkspace,
  periodStart: number,
  periodEnd: number
): boolean {
  const activityAt = getWorktreeActivityAt(entry.worktree)
  return entry.commits.length > 0 || (activityAt >= periodStart && activityAt <= periodEnd)
}

function isAlibabaCodeRemote(remoteUrl: string | null | undefined): boolean {
  const normalized = remoteUrl ? normalizeGitRemoteUrl(remoteUrl) : null
  const host = normalized?.split('/')[0]?.toLowerCase()
  return host === 'alibaba-inc.com' || host?.endsWith('.alibaba-inc.com') === true
}

export function isA1WeeklyReportCandidate(
  repo: Repo,
  worktree: Worktree,
  review: HostedReviewInfo | null = null
): boolean {
  return (
    review?.provider === 'code' ||
    Boolean(worktree.linkedCodeMR) ||
    isAlibabaCodeRemote(repo.gitRemoteIdentity?.remoteUrl ?? repo.gitRemoteIdentity?.canonicalKey)
  )
}

function linkedReviewLabels(worktree: Worktree): string[] {
  return [
    worktree.linkedPR ? `GitHub PR #${worktree.linkedPR}` : null,
    worktree.linkedGitLabMR ? `GitLab MR !${worktree.linkedGitLabMR}` : null,
    worktree.linkedBitbucketPR ? `Bitbucket PR #${worktree.linkedBitbucketPR}` : null,
    worktree.linkedAzureDevOpsPR ? `Azure DevOps PR #${worktree.linkedAzureDevOpsPR}` : null,
    worktree.linkedGiteaPR ? `Gitea PR #${worktree.linkedGiteaPR}` : null,
    worktree.linkedCodeMR ? `Code MR !${worktree.linkedCodeMR}` : null
  ].filter((label): label is string => label !== null)
}

function linkedWorkItemLabels(worktree: Worktree): string[] {
  return [
    worktree.linkedIssue ? `GitHub issue #${worktree.linkedIssue}` : null,
    worktree.linkedGitLabIssue ? `GitLab issue #${worktree.linkedGitLabIssue}` : null,
    worktree.linkedLinearIssue ? `Linear ${worktree.linkedLinearIssue}` : null,
    worktree.linkedLocalTask ? `Local task ${worktree.linkedLocalTask}` : null
  ].filter((label): label is string => label !== null)
}

export function buildWeeklyReportReviewLookupOptions(
  worktree: Worktree
): WeeklyReportReviewLookupOptions {
  return {
    repoId: worktree.repoId,
    currentHeadOid: worktree.head || null,
    linkedGitHubPR: worktree.linkedPR,
    linkedGitLabMR: worktree.linkedGitLabMR ?? null,
    linkedBitbucketPR: worktree.linkedBitbucketPR ?? null,
    linkedAzureDevOpsPR: worktree.linkedAzureDevOpsPR ?? null,
    linkedGiteaPR: worktree.linkedGiteaPR ?? null,
    linkedCodeMR: worktree.linkedCodeMR ?? null
  }
}

export async function collectWeeklyReportEvidence({
  scheduledFor,
  timezone,
  repos,
  worktrees,
  adapters
}: WeeklyReportEvidenceArgs): Promise<WeeklyReportEvidence> {
  const periodStart = getWeeklyReportPeriodStart(scheduledFor, timezone)
  const candidates = selectCandidateWorktrees(worktrees).flatMap((worktree) => {
    const repo = findOwnedRepo(repos, worktree)
    return repo ? [{ repo, worktree }] : []
  })
  // Why: weekly reports may span local, SSH, and runtime hosts. A small worker
  // pool prevents background Git scans from starving interactive status calls.
  const scanned = await mapWithConcurrency(
    candidates,
    REPORT_SCAN_CONCURRENCY,
    ({ repo, worktree }) =>
      scanCandidate(repo, worktree, periodStart, scheduledFor, adapters.scanWorkspace)
  )
  const changed = scanned.filter((entry) => hasWeeklyEvidence(entry, periodStart, scheduledFor))
  const reviewCandidates = changed
    .filter((entry) => Boolean(entry.worktree.branch))
    .slice(0, MAX_REVIEW_LOOKUPS)
  const providerEvidence = await mapWithConcurrency(
    reviewCandidates,
    REPORT_SCAN_CONCURRENCY,
    async ({ repo, worktree }) => {
      let review: HostedReviewInfo | null = null
      try {
        review = await adapters.lookupReview(repo, worktree)
      } catch {
        // Provider evidence is best-effort; keep the project in the report.
      }
      let a1Delivery: WeeklyReportA1DeliveryEvidence | null = null
      if (adapters.lookupA1Delivery && isA1WeeklyReportCandidate(repo, worktree, review)) {
        try {
          a1Delivery = await adapters.lookupA1Delivery(repo, worktree)
        } catch {
          a1Delivery = {
            mrLookup: 'unavailable',
            releaseLookup: 'unavailable',
            mr: null,
            changeRequests: []
          }
        }
      }
      return { review, a1Delivery }
    }
  )
  const providerEvidenceByWorktreeId = new Map(
    reviewCandidates.map((entry, index) => [
      getWorktreeEvidenceKey(entry.worktree),
      providerEvidence[index] ?? { review: null, a1Delivery: null }
    ])
  )

  return {
    periodStart,
    periodEnd: scheduledFor,
    timezone,
    scannedWorktreeCount: candidates.length,
    reviewLookupsTruncated:
      changed.filter((entry) => Boolean(entry.worktree.branch)).length > MAX_REVIEW_LOOKUPS,
    workspaces: changed.map(({ repo, worktree, ...evidence }) => {
      const provider = providerEvidenceByWorktreeId.get(getWorktreeEvidenceKey(worktree))
      return {
        projectKey: worktree.projectId ?? repo.gitRemoteIdentity?.canonicalKey ?? repo.id,
        projectName: repo.displayName,
        workspaceName: worktree.displayName,
        branch: worktree.branch || 'detached HEAD',
        lastActivityAt: getWorktreeActivityAt(worktree),
        comment: worktree.comment.trim() || null,
        ...evidence,
        review: provider?.review ?? null,
        a1Delivery: provider?.a1Delivery ?? null,
        linkedReviewLabels: linkedReviewLabels(worktree),
        linkedWorkItemLabels: linkedWorkItemLabels(worktree)
      }
    })
  }
}
