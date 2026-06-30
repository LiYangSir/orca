import type { CreateHostedReviewInput, CreateHostedReviewResult } from '../../shared/hosted-review'
import {
  normalizeHostedReviewBaseRef,
  normalizeHostedReviewHeadRef
} from '../../shared/hosted-review-refs'
import { A1Error, a1ExecJson, type A1ExecOptions } from './a1-runner'
import { getMergeRequestForBranch } from './client'
import type { A1MergeRequest, A1MergeRequestViewPayload } from './types'

function mergeRequestFromPayload(payload: A1MergeRequestViewPayload): A1MergeRequest | null {
  return 'mergeRequest' in payload ? (payload.mergeRequest ?? null) : payload
}

function mergeRequestUrl(mr: A1MergeRequest): string {
  return mr.detailUrl?.trim() || mr.webUrl?.trim() || ''
}

function createdResult(mr: A1MergeRequest): CreateHostedReviewResult {
  const url = mergeRequestUrl(mr)
  if (!url) {
    return {
      ok: false,
      code: 'unknown_completion',
      error: 'MR creation may have completed. Refreshing branch review state...'
    }
  }
  return { ok: true, number: mr.id, url }
}

function classifyCreateCodeMRError(error: unknown): CreateHostedReviewResult {
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof A1Error) {
    if (error.code === 'auth_required') {
      return {
        ok: false,
        code: 'auth_required',
        error:
          'Create MR failed: Aone Code is not authenticated. Next step: run a1 auth login --buc in this environment.'
      }
    }
    if (error.code === 'binary_missing') {
      return {
        ok: false,
        code: 'auth_required',
        error: 'Create MR failed: a1 CLI is not installed or not on PATH.'
      }
    }
    if (error.code === 'not_linked') {
      return {
        ok: false,
        code: 'validation',
        error: 'Create MR failed: run a1 link in this repository before creating a merge request.'
      }
    }
  }
  const lower = `${message}\n${error instanceof A1Error ? error.stderr : ''}`.toLowerCase()
  if (lower.includes('already exists') || lower.includes('merge request already exists')) {
    return {
      ok: false,
      code: 'already_exists',
      error: 'A merge request already exists for this branch.'
    }
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return {
      ok: false,
      code: 'unknown_completion',
      error: 'MR creation may have completed. Refreshing branch review state...'
    }
  }
  return {
    ok: false,
    code: 'unknown',
    error: 'Create MR failed: Aone Code could not create the merge request. Try again in a moment.'
  }
}

export async function createAoneMergeRequest(
  repoPath: string,
  input: CreateHostedReviewInput,
  _connectionId?: string | null,
  _options: unknown = {}
): Promise<CreateHostedReviewResult> {
  if (input.provider !== 'code') {
    return {
      ok: false,
      code: 'unsupported_provider',
      error: 'Creating reviews for this provider is not supported yet.'
    }
  }

  const base = normalizeHostedReviewBaseRef(input.base)
  const head = input.head ? normalizeHostedReviewHeadRef(input.head) : ''
  const title = input.title.trim()
  if (!base || !head || !title) {
    return {
      ok: false,
      code: 'validation',
      error: 'Create MR failed: source branch, target branch, and title are required.'
    }
  }
  if (head.toLowerCase() === base.toLowerCase()) {
    return {
      ok: false,
      code: 'validation',
      error: 'Create MR failed: choose a different target branch before creating a merge request.'
    }
  }

  const args = ['repo', 'mr', 'create', '--source', head, '--target', base, '--title', title]
  if (input.body?.trim()) {
    args.push('--description', input.body)
  }

  const execOptions: A1ExecOptions = { cwd: repoPath, timeout: 60_000 }
  try {
    const created = mergeRequestFromPayload(
      await a1ExecJson<A1MergeRequestViewPayload>(args, execOptions)
    )
    if (!created) {
      return {
        ok: false,
        code: 'unknown_completion',
        error: 'MR creation may have completed. Refreshing branch review state...'
      }
    }
    return createdResult(created)
  } catch (error) {
    const existing = await getMergeRequestForBranch(head, execOptions).catch(() => null)
    if (existing) {
      return {
        ok: false,
        code: 'already_exists',
        error: 'A merge request already exists for this branch.',
        existingReview: { number: existing.id, url: mergeRequestUrl(existing) }
      }
    }
    return classifyCreateCodeMRError(error)
  }
}
