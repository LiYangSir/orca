// Shared IPC envelope types for Aone handlers. Kept separate so multiple
// aone-*-handlers files can import without circular deps.

import { A1Error } from '../aone/a1-runner'
import type { A1LinkStatus } from '../aone/types'

export type AoneIpcStatus = {
  ok: true
  installed: boolean
  link: A1LinkStatus | null
}

export type AoneIpcFailure = {
  ok: false
  code:
    | 'binary_missing'
    | 'auth_required'
    | 'not_linked'
    | 'rate_limited'
    | 'invalid_output'
    | 'unknown'
  error: string
}

export type AoneIpcResult<T> = { ok: true; data: T } | AoneIpcFailure

export function toFailure(error: unknown): AoneIpcFailure {
  if (error instanceof A1Error) {
    return { ok: false, code: error.code, error: error.message }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { ok: false, code: 'unknown', error: message }
}

export function asPositiveInt(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}
