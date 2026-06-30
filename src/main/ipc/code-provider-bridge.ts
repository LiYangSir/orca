import { getRemoteUrl } from '../git/repo'
import { aoneCodeReviewProviderAdapter } from '../aone/gh-adapter'
import type { GitHubPullRequestStateUpdate, PRComment, PRInfo } from '../../shared/types'

export type CodeProvider = 'github' | 'code'

export type HostedReviewMergeMethod = 'merge' | 'squash' | 'rebase'

export type HostedReviewMutationResult = { ok: true } | { ok: false; error: string }

export type CodeReviewProviderAdapter = {
  id: Exclude<CodeProvider, 'github'>
  matchesRemoteUrl(remoteUrl: string | null | undefined): boolean
  prForBranch?: (args: {
    repoPath: string
    branch: string
    linkedPRNumber: number | null
  }) => Promise<PRInfo | null>
  prComments?: (args: { repoPath: string; prNumber: number }) => Promise<PRComment[]>
  mergePR?: (args: {
    repoPath: string
    prNumber: number
    method?: HostedReviewMergeMethod
  }) => Promise<HostedReviewMutationResult>
  updatePRState?: (args: {
    repoPath: string
    prNumber: number
    updates: GitHubPullRequestStateUpdate
  }) => Promise<HostedReviewMutationResult>
}

const codeReviewProviderAdapters: readonly CodeReviewProviderAdapter[] = [
  aoneCodeReviewProviderAdapter
]

function getCodeReviewProviderAdapter(
  repoPath: string | null | undefined
): CodeReviewProviderAdapter | null {
  if (!repoPath) {
    return null
  }
  try {
    const remoteUrl = getRemoteUrl(repoPath)
    return codeReviewProviderAdapters.find((adapter) => adapter.matchesRemoteUrl(remoteUrl)) ?? null
  } catch {
    return null
  }
}

export function detectCodeProvider(repoPath: string | null | undefined): CodeProvider {
  return getCodeReviewProviderAdapter(repoPath)?.id ?? 'github'
}

export async function routePRForBranchByCodeProvider(
  args: { repoPath: string; branch: string; linkedPRNumber: number | null },
  githubImpl: () => Promise<PRInfo | null>
): Promise<PRInfo | null> {
  const adapter = getCodeReviewProviderAdapter(args.repoPath)
  return adapter?.prForBranch ? adapter.prForBranch(args) : githubImpl()
}

export async function routePRCommentsByCodeProvider(
  args: { repoPath: string; prNumber: number },
  githubImpl: () => Promise<PRComment[]>
): Promise<PRComment[]> {
  const adapter = getCodeReviewProviderAdapter(args.repoPath)
  return adapter?.prComments ? adapter.prComments(args) : githubImpl()
}

export async function routeMergePRByCodeProvider(
  args: { repoPath: string; prNumber: number; method?: HostedReviewMergeMethod },
  githubImpl: () => Promise<HostedReviewMutationResult>
): Promise<HostedReviewMutationResult> {
  const adapter = getCodeReviewProviderAdapter(args.repoPath)
  return adapter?.mergePR ? adapter.mergePR(args) : githubImpl()
}

export async function routeUpdatePRStateByCodeProvider(
  args: { repoPath: string; prNumber: number; updates: GitHubPullRequestStateUpdate },
  githubImpl: () => Promise<HostedReviewMutationResult>
): Promise<HostedReviewMutationResult> {
  const adapter = getCodeReviewProviderAdapter(args.repoPath)
  return adapter?.updatePRState ? adapter.updatePRState(args) : githubImpl()
}
