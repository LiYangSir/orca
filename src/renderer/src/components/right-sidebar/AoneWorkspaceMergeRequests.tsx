import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { mapWithConcurrency } from '../../../../shared/map-with-concurrency'
import type { HostedReviewState } from '../../../../shared/hosted-review'
import type { NestedRepoCandidate } from '../../../../shared/types'
import { AoneWorkspaceMergeRequestDetail } from './AoneWorkspaceMergeRequestDetail'
import { AoneWorkspaceMergeRequestOverview } from './AoneWorkspaceMergeRequestOverview'
import { classifyAoneFailure, mapAoneMergeRequestState } from './aone-review-normalization'

export type AoneMergeRequest = {
  id: number
  title: string
  state: string
  webUrl?: string | null
  detailUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  workInProgress?: boolean | null
}

type AoneMergeRequestResponse = {
  ok: boolean
  data?: AoneMergeRequest | null
  code?: string
  error?: string
}

export type AoneWorkspaceMergeRequestEntry = {
  repo: NestedRepoCandidate
  review: AoneMergeRequest | null
  lookupErrorCode: string | null
}

type AoneMergeRequestLookup = Pick<AoneWorkspaceMergeRequestEntry, 'review' | 'lookupErrorCode'>

export type AoneWorkspaceParentReview = {
  number: number
  title: string
  state: HostedReviewState
  url: string
}

type LoadAoneWorkspaceMergeRequestsArgs = {
  parentWorktreePath: string
  branch: string
  scanNestedRepos: (args: {
    path: string
    options?: Record<string, unknown>
  }) => Promise<{ repos: NestedRepoCandidate[] }>
  getMergeRequestForBranch: (args: { branch: string; repoPath?: string | null }) => Promise<unknown>
}

async function loadAoneMergeRequestForRepository({
  branch,
  repoPath,
  getMergeRequestForBranch
}: Pick<LoadAoneWorkspaceMergeRequestsArgs, 'branch' | 'getMergeRequestForBranch'> & {
  repoPath: string
}): Promise<AoneMergeRequestLookup> {
  try {
    const args = { branch, repoPath }
    let response = (await getMergeRequestForBranch(args)) as AoneMergeRequestResponse
    if (!response.ok && response.code === 'invalid_output') {
      // Why: malformed CLI output can be transient; retry once before asking
      // the user to refresh the whole workspace review.
      response = (await getMergeRequestForBranch(args)) as AoneMergeRequestResponse
    }
    return {
      review: response.ok ? (response.data ?? null) : null,
      lookupErrorCode: response.ok ? null : classifyAoneFailure(response.code, response.error)
    }
  } catch (error) {
    return {
      review: null,
      lookupErrorCode: classifyAoneFailure(
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}

export async function loadAoneChildMergeRequests({
  parentWorktreePath,
  branch,
  scanNestedRepos,
  getMergeRequestForBranch
}: LoadAoneWorkspaceMergeRequestsArgs): Promise<AoneWorkspaceMergeRequestEntry[]> {
  const scan = await scanNestedRepos({
    path: parentWorktreePath,
    options: { descendIntoGitRepoRoot: true, maxRepos: 50, timeoutMs: 10_000 }
  })
  const childRepos = scan.repos.filter((candidate) => candidate.depth > 0)
  // Why: workspace-mounted child repos represent the same task branch as the
  // parent worktree; query that branch in each repository instead of its default.
  return mapWithConcurrency(childRepos, 1, async (repo) => {
    const lookup = await loadAoneMergeRequestForRepository({
      branch,
      repoPath: repo.path,
      getMergeRequestForBranch
    })
    return { repo, ...lookup }
  })
}

export async function loadAoneWorkspaceMergeRequests(
  args: LoadAoneWorkspaceMergeRequestsArgs,
  lookupParent: boolean
): Promise<{
  entries: AoneWorkspaceMergeRequestEntry[]
  parentLookup: AoneMergeRequestLookup | null
}> {
  const entries = await loadAoneChildMergeRequests(args)
  // Why: ordinary single-repo projects retain the existing panel and avoid an
  // extra Aone request; workspace mode fills a missing merged parent explicitly.
  const parentLookup =
    entries.length > 0 && lookupParent
      ? await loadAoneMergeRequestForRepository({
          branch: args.branch,
          repoPath: args.parentWorktreePath,
          getMergeRequestForBranch: args.getMergeRequestForBranch
        })
      : null
  return { entries, parentLookup }
}

type AoneWorkspaceMergeRequestsProps = {
  parentWorktreePath: string
  parentRepoName: string
  branch: string
  parentReview: AoneWorkspaceParentReview | null
  parentContent: ReactNode
  refreshGeneration: number
}

type Selection = { kind: 'parent' } | { kind: 'child'; entry: AoneWorkspaceMergeRequestEntry }

export function AoneWorkspaceMergeRequests({
  parentWorktreePath,
  parentRepoName,
  branch,
  parentReview,
  parentContent,
  refreshGeneration
}: AoneWorkspaceMergeRequestsProps): React.JSX.Element {
  const [retryGeneration, setRetryGeneration] = useState(0)
  const requestKey = `${parentWorktreePath}\0${branch}\0${refreshGeneration}\0${retryGeneration}`
  const contextKey = `${parentWorktreePath}\0${branch}`
  const [loaded, setLoaded] = useState<{
    requestKey: string
    contextKey: string
    entries: AoneWorkspaceMergeRequestEntry[]
    parentLookup: AoneMergeRequestLookup | null
    error: boolean
  } | null>(null)
  const [showLoading, setShowLoading] = useState(false)
  const [view, setView] = useState<{ contextKey: string; selection: Selection } | null>(null)
  const lookupParent = parentReview === null
  const selection = view?.contextKey === contextKey ? view.selection : null
  const current = loaded?.requestKey === requestKey ? loaded : null

  useEffect(() => {
    let cancelled = false
    const loadingTimer = window.setTimeout(() => setShowLoading(true), 200)
    void loadAoneWorkspaceMergeRequests(
      {
        parentWorktreePath,
        branch,
        scanNestedRepos: window.api.projectGroups.scanNested,
        getMergeRequestForBranch: window.api.aone.getMergeRequestForBranch
      },
      lookupParent
    )
      .then(({ entries, parentLookup }) => {
        if (!cancelled) {
          setLoaded({ requestKey, contextKey, entries, parentLookup, error: false })
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load child repository merge requests:', error)
        if (!cancelled) {
          setLoaded((previous) => ({
            requestKey,
            contextKey,
            entries: previous?.contextKey === contextKey ? previous.entries : [],
            parentLookup: previous?.contextKey === contextKey ? previous.parentLookup : null,
            error: true
          }))
        }
      })
      .finally(() => {
        window.clearTimeout(loadingTimer)
        if (!cancelled) {
          setShowLoading(false)
        }
      })
    return () => {
      cancelled = true
      window.clearTimeout(loadingTimer)
    }
  }, [branch, contextKey, lookupParent, parentWorktreePath, requestKey])

  // Keep the last workspace snapshot visible while a manual refresh is in
  // flight; switching workspaces still gets the delayed single-repo fallback.
  const previous = loaded?.contextKey === contextKey ? loaded : null
  const displayed = current ?? previous
  const discoveredParentReview = displayed?.parentLookup?.review ?? null
  const resolvedParentReview = parentReview ?? mapAoneParentReview(discoveredParentReview)

  if (selection?.kind === 'parent') {
    if (!parentReview && discoveredParentReview) {
      return (
        <AoneWorkspaceMergeRequestDetail
          entry={{
            repo: { path: parentWorktreePath, displayName: parentRepoName, depth: 0 },
            review: discoveredParentReview,
            lookupErrorCode: null
          }}
          onBack={() => setView(null)}
        />
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
          <Button type="button" variant="ghost" size="xs" onClick={() => setView(null)}>
            <ArrowLeft className="size-3.5" />
            {translate('auto.components.rightSidebar.AoneWorkspaceMergeRequests.back', 'Back')}
          </Button>
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {parentRepoName}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{parentContent}</div>
      </div>
    )
  }
  if (selection?.kind === 'child') {
    return <AoneWorkspaceMergeRequestDetail entry={selection.entry} onBack={() => setView(null)} />
  }

  // Why: ordinary single-repo Aone projects should keep the existing Checks
  // layout; the workspace overview only earns the extra navigation when a
  // child repository exists or the scan itself needs recovery.
  if (!displayed && !showLoading) {
    return <>{parentContent}</>
  }
  if (current && current.entries.length === 0 && !current.error) {
    return <>{parentContent}</>
  }

  return (
    <AoneWorkspaceMergeRequestOverview
      parentRepoName={parentRepoName}
      parentReview={resolvedParentReview}
      parentLookupErrorCode={
        resolvedParentReview ? null : (displayed?.parentLookup?.lookupErrorCode ?? null)
      }
      branch={branch}
      entries={displayed?.entries ?? []}
      loading={!current}
      scanFailed={current?.error === true}
      onRefresh={() => setRetryGeneration((value) => value + 1)}
      onSelectParent={() => setView({ contextKey, selection: { kind: 'parent' } })}
      onSelectChild={(entry) => setView({ contextKey, selection: { kind: 'child', entry } })}
    />
  )
}

function mapAoneParentReview(review: AoneMergeRequest | null): AoneWorkspaceParentReview | null {
  return review
    ? {
        number: review.id,
        title: review.title,
        state: mapAoneMergeRequestState(review),
        url: review.detailUrl?.trim() || review.webUrl?.trim() || ''
      }
    : null
}
