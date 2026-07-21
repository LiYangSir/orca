// Public surface for talking to the local `a1` CLI. Mirrors the role of
// src/main/gitlab/client.ts (which wraps `glab`): every function returns
// either the parsed JSON or null/[] on missing data, and throws A1Error for
// auth/binary/parse failures so the IPC layer can map errors uniformly.

import {
  A1Error,
  a1ExecFileAsync,
  a1ExecJson,
  isA1Installed,
  type A1ExecOptions
} from './a1-runner'
import { gitExecFileAsync } from '../git/runner'
import type { A1LinkStatus, A1MergeRequest, A1MergeRequestViewPayload, A1WorkItem } from './types'
import { isRepositoryDefaultBranch } from './repository-default-branch'

export type AoneWorkItemListFilter = {
  scope?: 'personal' | 'project' | 'team' | 'all' | 'collect' | 'associate' | 'child'
  category?: readonly string[]
  status?: readonly string[]
  pageSize?: number
  project?: string
}

export type AoneMergeRequestListFilter = {
  mine?: 'created' | 'review'
  state?: 'opened' | 'accepted' | 'merged'
  source?: string
  target?: string
  page?: number
}

const MERGE_REQUEST_RATE_LIMIT_COOLDOWN_MS = 60_000
let mergeRequestQueryTail: Promise<void> = Promise.resolve()
let mergeRequestRateLimitedUntil = 0

function runMergeRequestQuery<T>(query: () => Promise<T>): Promise<T> {
  const result = mergeRequestQueryTail.then(async () => {
    // Why: one Sentinel rejection applies to the user, so queued repository
    // lookups must stop spawning a1 processes until the service can recover.
    if (Date.now() < mergeRequestRateLimitedUntil) {
      throw new A1Error(
        'rate_limited',
        'Aone is temporarily rate limiting merge request queries. Try again shortly.'
      )
    }
    try {
      return await query()
    } catch (error) {
      if (error instanceof A1Error && error.code === 'rate_limited') {
        mergeRequestRateLimitedUntil = Date.now() + MERGE_REQUEST_RATE_LIMIT_COOLDOWN_MS
      }
      throw error
    }
  })
  mergeRequestQueryTail = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function pushArg(args: string[], flag: string, value: string | number | undefined): void {
  if (value === undefined || value === null || value === '') {
    return
  }
  args.push(flag, String(value))
}

function pushCsv(args: string[], flag: string, values: readonly string[] | undefined): void {
  if (!values || values.length === 0) {
    return
  }
  args.push(flag, values.join(','))
}

function mergeRequestFromPayload(payload: A1MergeRequestViewPayload): A1MergeRequest | null {
  return 'mergeRequest' in payload ? (payload.mergeRequest ?? null) : payload
}

function isEmptyA1JsonOutput(error: unknown): boolean {
  return error instanceof A1Error && error.code === 'invalid_output' && error.stderr === ''
}

export async function getA1LinkStatus(options: A1ExecOptions = {}): Promise<A1LinkStatus> {
  // a1 link status -f json returns {} when nothing is linked.
  return a1ExecJson<A1LinkStatus>(['link', 'status'], options)
}

export async function isAoneAvailable(): Promise<boolean> {
  return isA1Installed()
}

export async function isA1Authenticated(options: A1ExecOptions = {}): Promise<boolean> {
  try {
    await a1ExecFileAsync(['auth', 'whoami'], options)
    return true
  } catch {
    return false
  }
}

export async function listWorkItems(
  filter: AoneWorkItemListFilter = {},
  options: A1ExecOptions = {}
): Promise<A1WorkItem[]> {
  const args = ['project', 'workitem', 'list']
  pushArg(args, '--scope', filter.scope)
  pushCsv(args, '--category', filter.category)
  pushCsv(args, '--status', filter.status)
  pushArg(args, '--page-size', filter.pageSize)
  pushArg(args, '--project', filter.project)
  try {
    return await a1ExecJson<A1WorkItem[]>(args, options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      // Empty result sets sometimes serialize as nothing; treat as [].
      return []
    }
    throw error
  }
}

export async function getWorkItem(
  identifier: string,
  options: A1ExecOptions = {}
): Promise<A1WorkItem | null> {
  if (!identifier.trim()) {
    return null
  }
  try {
    return await a1ExecJson<A1WorkItem>(['project', 'workitem', 'get', identifier.trim()], options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return null
    }
    throw error
  }
}

export async function listMergeRequests(
  filter: AoneMergeRequestListFilter = {},
  options: A1ExecOptions = {}
): Promise<A1MergeRequest[]> {
  const args = ['repo', 'mr', 'list']
  if (filter.mine) {
    args.push('--mine', filter.mine)
  }
  pushArg(args, '--state', filter.state)
  pushArg(args, '--source', filter.source)
  pushArg(args, '--target', filter.target)
  pushArg(args, '--page', filter.page)
  try {
    return await runMergeRequestQuery(() => a1ExecJson<A1MergeRequest[]>(args, options))
  } catch (error) {
    if (isEmptyA1JsonOutput(error)) {
      return []
    }
    throw error
  }
}

export async function getMergeRequest(
  mrId: number,
  options: A1ExecOptions = {}
): Promise<A1MergeRequest | null> {
  if (!Number.isFinite(mrId) || mrId <= 0) {
    return null
  }
  try {
    return mergeRequestFromPayload(
      await a1ExecJson<A1MergeRequestViewPayload>(['repo', 'mr', 'view', String(mrId)], options)
    )
  } catch (error) {
    if (isEmptyA1JsonOutput(error)) {
      return null
    }
    throw error
  }
}

export async function getMergeRequestForBranch(
  branch: string,
  options: A1ExecOptions = {}
): Promise<A1MergeRequest | null> {
  // a1 doesn't expose a single "mr for branch" subcommand; emulate by listing
  // open MRs and matching sourceBranch client-side. Keeps the surface small
  // and avoids encoding URL-style branch refs.
  const trimmed = branch.trim()
  if (!trimmed) {
    return null
  }
  const mrs = await listMergeRequests({ state: 'opened', source: trimmed }, options)
  const listed = mrs.find((mr) => mr.sourceBranch === trimmed) ?? null
  if (!listed) {
    return null
  }
  // Why: a1's list payload omits detailUrl/webUrl for some Code hosts; view
  // returns the canonical /codereview/<id> URL used by browser links.
  return (await getMergeRequest(listed.id, options)) ?? listed
}

export async function getMergeRequestForBranchWithMergedFallback(
  branch: string,
  options: A1ExecOptions = {}
): Promise<A1MergeRequest | null> {
  const opened = await getMergeRequestForBranch(branch, options)
  if (opened) {
    return opened
  }
  const trimmed = branch.trim()
  if (!trimmed) {
    return null
  }
  // Why: completed workspace work still needs its MR surfaced in the review
  // overview, while creation checks must continue to consider only open MRs.
  const merged = await listMergeRequests({ state: 'merged', source: trimmed }, options)
  const listed = merged
    .filter((mr) => mr.sourceBranch === trimmed)
    .sort(
      (left, right) =>
        Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '') || right.id - left.id
    )[0]
  if (!listed) {
    return null
  }
  return (await getMergeRequest(listed.id, options)) ?? listed
}

export async function getMergeRequestForRepositoryCurrentBranch(
  repoPath: string,
  options: { lookupMergeRequest?: boolean } = {}
): Promise<{
  branch: string | null
  isDefaultBranch: boolean
  mergeRequest: A1MergeRequest | null
}> {
  const { stdout } = await gitExecFileAsync(['branch', '--show-current'], { cwd: repoPath })
  const branch = stdout.trim() || null
  if (!branch) {
    return { branch: null, isDefaultBranch: false, mergeRequest: null }
  }
  const isDefaultBranch = await isRepositoryDefaultBranch(repoPath, branch)
  // Why: nested repositories can be linked to a different branch than their
  // parent workspace; default branches never own Aone change requests.
  const mergeRequest =
    !isDefaultBranch && options.lookupMergeRequest !== false
      ? await getMergeRequestForBranchWithMergedFallback(branch, { cwd: repoPath })
      : null
  return { branch, isDefaultBranch, mergeRequest }
}

// `code` review host detection: Alibaba-hosted code remotes can sit behind
// multiple internal host prefixes (Code, GitLab, future aliases). We expose
// two complementary checks:
//   * URL-based: cheap, no CLI roundtrip — used as the fast path
//   * a1 link status — slower but authoritative for non-standard hosts
const ALIBABA_INC_HOST = 'alibaba-inc.com'

function remoteUrlHost(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim()
  if (!trimmed) {
    return null
  }
  try {
    return new URL(trimmed).hostname.toLowerCase()
  } catch {
    // Support scp-style git remotes such as git@gitlab.alibaba-inc.com:group/repo.git.
    const scpLike = /^(?:[^@\s]+@)?([^:\s/]+):/.exec(trimmed)
    if (scpLike?.[1]) {
      return scpLike[1].toLowerCase()
    }
    return null
  }
}

export function isAoneCodeRemoteUrl(remoteUrl: string | null | undefined): boolean {
  if (!remoteUrl) {
    return false
  }
  const host = remoteUrlHost(remoteUrl)
  return host === ALIBABA_INC_HOST || host?.endsWith(`.${ALIBABA_INC_HOST}`) === true
}

export async function resolveAoneCodeRepoSlug(
  repoPath: string,
  options: A1ExecOptions = {}
): Promise<string | null> {
  try {
    const link = await getA1LinkStatus({ ...options, cwd: repoPath || options.cwd })
    const path = link.repo?.path?.trim()
    return path ? path : null
  } catch {
    return null
  }
}
