// Public surface for talking to the local `a1` CLI. Mirrors the role of
// src/main/gitlab/client.ts (which wraps `glab`): every function returns
// either the parsed JSON or null/[] on missing data, and throws A1Error for
// auth/binary/parse failures so the IPC layer can map errors uniformly.

import { A1Error, a1ExecJson, isA1Installed, type A1ExecOptions } from './a1-runner'
import type { A1LinkStatus, A1MergeRequest, A1WorkItem } from './types'

export type AoneWorkItemListFilter = {
  scope?: 'personal' | 'project' | 'team' | 'all' | 'collect' | 'associate' | 'child'
  category?: readonly string[]
  status?: readonly string[]
  pageSize?: number
  project?: string
}

export type AoneMergeRequestListFilter = {
  mine?: 'created' | 'review'
  state?: 'opened' | 'closed' | 'merged'
  pageSize?: number
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

export async function getA1LinkStatus(options: A1ExecOptions = {}): Promise<A1LinkStatus> {
  // a1 link status -f json returns {} when nothing is linked.
  return a1ExecJson<A1LinkStatus>(['link', 'status'], options)
}

export async function isAoneAvailable(): Promise<boolean> {
  return isA1Installed()
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
  pushArg(args, '--page-size', filter.pageSize)
  try {
    return await a1ExecJson<A1MergeRequest[]>(args, options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return []
    }
    throw error
  }
}

export async function getMergeRequest(
  iid: number,
  options: A1ExecOptions = {}
): Promise<A1MergeRequest | null> {
  if (!Number.isFinite(iid) || iid <= 0) {
    return null
  }
  try {
    return await a1ExecJson<A1MergeRequest>(['repo', 'mr', 'view', String(iid)], options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
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
  const mrs = await listMergeRequests({ state: 'opened', pageSize: 50 }, options)
  return mrs.find((mr) => mr.sourceBranch === trimmed) ?? null
}

// `code` review host detection: project-bound code.alibaba-inc.com URLs are
// the canonical Aone Code remote. We expose two complementary checks:
//   * URL-based: cheap, no CLI roundtrip — used as the fast path
//   * a1 link status — slower but authoritative for non-standard hosts
const CODE_HOST_RE = /code\.alibaba-inc\.com/i

export function isAoneCodeRemoteUrl(remoteUrl: string | null | undefined): boolean {
  if (!remoteUrl) {
    return false
  }
  return CODE_HOST_RE.test(remoteUrl)
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
