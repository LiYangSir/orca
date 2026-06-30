// Thin wrapper around the local `a1` CLI. Mirrors the gh/glab runner shape
// (src/main/git/runner.ts:1298 / :1398) but reuses the generic
// commandExecFileAsync rather than duplicating the WSL-and-Windows-shim retry
// loop — `a1` is a single Linux/Mac binary today, so the generic path is
// sufficient.

import { commandExecFileAsync } from '../git/runner'

export type A1ExecOptions = {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeout?: number
  maxBuffer?: number
  signal?: AbortSignal
}

export type A1ExecResult = {
  stdout: string
  stderr: string
}

export type A1ErrorCode =
  | 'binary_missing'
  | 'auth_required'
  | 'not_linked'
  | 'invalid_output'
  | 'unknown'

export class A1Error extends Error {
  readonly code: A1ErrorCode
  readonly stderr: string

  constructor(code: A1ErrorCode, message: string, stderr = '') {
    super(message)
    this.name = 'A1Error'
    this.code = code
    this.stderr = stderr
  }
}

function classifyA1Error(error: unknown): A1Error {
  if (typeof error !== 'object' || error === null) {
    return new A1Error('unknown', String(error))
  }
  const err = error as { code?: string; stderr?: string; message?: string }
  const stderr = typeof err.stderr === 'string' ? err.stderr : ''
  if (err.code === 'ENOENT') {
    return new A1Error(
      'binary_missing',
      'a1 CLI not found on PATH. See https://a1.io.alibaba-inc.com/ to install.',
      stderr
    )
  }
  const haystack = `${stderr}\n${err.message ?? ''}`.toLowerCase()
  if (
    haystack.includes('not logged in') ||
    haystack.includes('authentication') ||
    haystack.includes('unauthorized') ||
    haystack.includes('please run `a1 auth login')
  ) {
    return new A1Error(
      'auth_required',
      'a1 CLI is not authenticated. Run `a1 auth login --buc` to sign in.',
      stderr
    )
  }
  if (haystack.includes('not linked') || haystack.includes('no project linked')) {
    return new A1Error(
      'not_linked',
      'No a1 resource is linked in this directory. Run `a1 link` first.',
      stderr
    )
  }
  return new A1Error('unknown', err.message ?? 'a1 invocation failed', stderr)
}

export async function a1ExecFileAsync(
  args: readonly string[],
  options: A1ExecOptions = {}
): Promise<A1ExecResult> {
  try {
    return await commandExecFileAsync('a1', [...args], {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeout,
      maxBuffer: options.maxBuffer,
      signal: options.signal
    })
  } catch (error) {
    throw classifyA1Error(error)
  }
}

export async function a1ExecJson<T>(
  args: readonly string[],
  options: A1ExecOptions = {}
): Promise<T> {
  const { stdout } = await a1ExecFileAsync([...args, '-f', 'json'], options)
  const trimmed = stdout.trim()
  if (!trimmed) {
    throw new A1Error('invalid_output', 'a1 returned an empty response', '')
  }
  try {
    return JSON.parse(trimmed) as T
  } catch (error) {
    throw new A1Error(
      'invalid_output',
      `Failed to parse a1 JSON output: ${(error as Error).message}`,
      trimmed.slice(0, 500)
    )
  }
}

export async function isA1Installed(): Promise<boolean> {
  try {
    await a1ExecFileAsync(['--version'], { timeout: 3000 })
    return true
  } catch (error) {
    if (error instanceof A1Error && error.code === 'binary_missing') {
      return false
    }
    return true
  }
}
