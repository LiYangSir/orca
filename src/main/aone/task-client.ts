// Higher-level Aone task surface: MR mutations, comments, status, and diff.
// Mirrors the operation set in src/main/ipc/github.ts so the future
// code-provider-bridge can dispatch a single semantic call to either gh or a1.
// All helpers throw A1Error on auth/binary failure; consumers should map to
// IPC result envelopes consistent with the github IPC handlers.

import { A1Error, a1ExecFileAsync, a1ExecJson, type A1ExecOptions } from './a1-runner'
import type {
  A1MergeRequest,
  A1MergeRequestComment,
  A1MergeRequestDiffFile,
  A1MergeRequestStatus
} from './types'

export type A1MergeMethod = 'no-ff' | 'ff-only' | 'ff' | 'squash' | 'rebase'

export type A1CommentCreateArgs = {
  mr: number
  body: string
  filePath?: string | null
  line?: number | null
  replyTo?: number | null
}

export type A1MergeArgs = {
  mr: number
  method?: A1MergeMethod
  deleteSourceBranch?: boolean
  message?: string | null
}

export type A1EditMergeRequestArgs = {
  mr: number
  title?: string
  description?: string
  assignees?: readonly string[]
}

export type A1OkResult = { ok: true }
export type A1ErrResult = { ok: false; code: string; error: string }
export type A1MutationResult = A1OkResult | A1ErrResult

function isEmptyA1JsonOutput(error: unknown): boolean {
  return error instanceof A1Error && error.code === 'invalid_output' && error.stderr === ''
}

function pushFlag(args: string[], flag: string, value: string | number | undefined | null): void {
  if (value === undefined || value === null) {
    return
  }
  const text = String(value)
  if (text === '') {
    return
  }
  args.push(flag, text)
}

function toErrResult(error: unknown): A1ErrResult {
  if (error instanceof A1Error) {
    return { ok: false, code: error.code, error: error.message }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { ok: false, code: 'unknown', error: message }
}

export async function listMergeRequestComments(
  mr: number,
  options: A1ExecOptions & { resolved?: boolean; unresolved?: boolean } = {}
): Promise<A1MergeRequestComment[]> {
  const args = ['repo', 'mr', 'comment', 'list', '--mr', String(mr)]
  if (options.resolved) {
    args.push('--resolved')
  } else if (options.unresolved) {
    args.push('--unresolved')
  }
  try {
    return await a1ExecJson<A1MergeRequestComment[]>(args, options)
  } catch (error) {
    if (isEmptyA1JsonOutput(error)) {
      return []
    }
    throw error
  }
}

export async function createMergeRequestComment(
  input: A1CommentCreateArgs,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  if (!input.body.trim()) {
    return { ok: false, code: 'invalid_input', error: 'Comment body is required' }
  }
  const args = ['repo', 'mr', 'comment', 'create', '--mr', String(input.mr), '-m', input.body]
  pushFlag(args, '--file', input.filePath ?? undefined)
  pushFlag(args, '--line', input.line ?? undefined)
  pushFlag(args, '--reply-to', input.replyTo ?? undefined)
  try {
    await a1ExecFileAsync(args, options)
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function resolveMergeRequestComment(
  mr: number,
  commentId: number,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  try {
    await a1ExecFileAsync(
      ['repo', 'mr', 'comment', 'resolve', String(commentId), '--mr', String(mr)],
      options
    )
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function mergeMergeRequest(
  input: A1MergeArgs,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  const args = ['repo', 'mr', 'merge', String(input.mr)]
  pushFlag(args, '--merge-type', input.method)
  if (input.deleteSourceBranch) {
    args.push('--delete-branch')
  }
  pushFlag(args, '--message', input.message ?? undefined)
  try {
    await a1ExecFileAsync(args, options)
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function closeMergeRequest(
  mr: number,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  try {
    await a1ExecFileAsync(['repo', 'mr', 'close', String(mr)], options)
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function reopenMergeRequest(
  mr: number,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  try {
    await a1ExecFileAsync(['repo', 'mr', 'reopen', String(mr)], options)
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function editMergeRequest(
  input: A1EditMergeRequestArgs,
  options: A1ExecOptions = {}
): Promise<A1MutationResult> {
  const args = ['repo', 'mr', 'edit', String(input.mr)]
  pushFlag(args, '--title', input.title)
  pushFlag(args, '--description', input.description)
  if (input.assignees && input.assignees.length > 0) {
    args.push('--assignees', input.assignees.join(','))
  }
  if (args.length === 4) {
    return { ok: false, code: 'invalid_input', error: 'No edit fields provided' }
  }
  try {
    await a1ExecFileAsync(args, options)
    return { ok: true }
  } catch (error) {
    return toErrResult(error)
  }
}

export async function getMergeRequestStatus(
  mr: number,
  options: A1ExecOptions = {}
): Promise<A1MergeRequestStatus | null> {
  try {
    return await a1ExecJson<A1MergeRequestStatus>(['repo', 'mr', 'status', String(mr)], options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return null
    }
    throw error
  }
}

export async function getMergeRequestStatusForBranch(
  source: string,
  target: string | null | undefined,
  options: A1ExecOptions = {}
): Promise<A1MergeRequestStatus | null> {
  const trimmed = source.trim()
  if (!trimmed) {
    return null
  }
  const args = ['repo', 'mr', 'status', '--source', trimmed]
  const targetTrimmed = target?.trim()
  if (targetTrimmed) {
    args.push('--target', targetTrimmed)
  }
  try {
    return await a1ExecJson<A1MergeRequestStatus>(args, options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return null
    }
    throw error
  }
}

export async function listMergeRequestDiffFiles(
  mr: number,
  options: A1ExecOptions = {}
): Promise<A1MergeRequestDiffFile[]> {
  try {
    return await a1ExecJson<A1MergeRequestDiffFile[]>(['repo', 'mr', 'diff', String(mr)], options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return []
    }
    throw error
  }
}

export async function getMergeRequestFileDiff(
  mr: number,
  filePath: string,
  options: A1ExecOptions & { context?: number } = {}
): Promise<string | null> {
  const trimmed = filePath.trim()
  if (!trimmed) {
    return null
  }
  const args = ['repo', 'mr', 'diff', String(mr), trimmed]
  if (options.context && options.context > 0) {
    args.push('-U', String(options.context))
  }
  // Diff output is a unified-diff text payload; do not request JSON.
  try {
    const { stdout } = await a1ExecFileAsync(args, options)
    return stdout
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return null
    }
    throw error
  }
}

export type A1MergeRequestViewExtras = {
  workItems?: boolean
  cr?: boolean
  files?: boolean
  ci?: boolean
}

export async function getMergeRequestWithExtras(
  mr: number,
  extras: A1MergeRequestViewExtras = {},
  options: A1ExecOptions = {}
): Promise<A1MergeRequest | null> {
  const args = ['repo', 'mr', 'view', String(mr)]
  if (extras.workItems) {
    args.push('--work-items')
  }
  if (extras.cr) {
    args.push('--cr')
  }
  if (extras.files) {
    args.push('--files')
  }
  if (extras.ci) {
    args.push('--ci')
  }
  try {
    return await a1ExecJson<A1MergeRequest>(args, options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output') {
      return null
    }
    throw error
  }
}
