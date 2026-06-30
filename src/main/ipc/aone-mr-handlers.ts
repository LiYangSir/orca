// IPC handlers for MR mutations, status, and diffs against the local `a1`
// CLI. Split from ipc/aone.ts to keep each file within the max-lines budget
// and to group write-flow handlers alongside their task-client helpers.

import { ipcMain } from 'electron'
import {
  closeMergeRequest,
  createMergeRequestComment,
  editMergeRequest,
  getMergeRequestFileDiff,
  getMergeRequestStatus,
  getMergeRequestStatusForBranch,
  getMergeRequestWithExtras,
  listMergeRequestComments,
  listMergeRequestDiffFiles,
  mergeMergeRequest,
  reopenMergeRequest,
  resolveMergeRequestComment,
  type A1MergeArgs,
  type A1MergeMethod,
  type A1MergeRequestViewExtras,
  type A1MutationResult
} from '../aone/task-client'
import type {
  A1MergeRequest,
  A1MergeRequestComment,
  A1MergeRequestDiffFile,
  A1MergeRequestStatus
} from '../aone/types'
import { asPositiveInt, toFailure, type AoneIpcResult } from './aone-ipc-envelope'

const MERGE_METHODS: ReadonlySet<A1MergeMethod> = new Set([
  'no-ff',
  'ff-only',
  'ff',
  'squash',
  'rebase'
])

function asMergeMethod(value: unknown): A1MergeMethod | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return MERGE_METHODS.has(value as A1MergeMethod) ? (value as A1MergeMethod) : undefined
}

export function registerAoneMrHandlers(): void {
  ipcMain.handle(
    'aone:listMRComments',
    async (
      _event,
      args: { mr: number; resolved?: boolean; unresolved?: boolean; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequestComment[]>> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_output', error: 'mr is required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const data = await listMergeRequestComments(mr, {
          cwd,
          resolved: args?.resolved === true,
          unresolved: args?.unresolved === true
        })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:createMRComment',
    async (
      _event,
      args: {
        mr: number
        body: string
        filePath?: string | null
        line?: number | null
        replyTo?: number | null
        repoPath?: string | null
      }
    ): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_input', error: 'mr is required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      return createMergeRequestComment(
        {
          mr,
          body: typeof args?.body === 'string' ? args.body : '',
          filePath: args?.filePath ?? null,
          line: typeof args?.line === 'number' ? args.line : null,
          replyTo: typeof args?.replyTo === 'number' ? args.replyTo : null
        },
        { cwd }
      )
    }
  )

  ipcMain.handle(
    'aone:resolveMRComment',
    async (
      _event,
      args: { mr: number; commentId: number; repoPath?: string | null }
    ): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      const commentId = asPositiveInt(args?.commentId)
      if (!mr || !commentId) {
        return { ok: false, code: 'invalid_input', error: 'mr and commentId are required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      return resolveMergeRequestComment(mr, commentId, { cwd })
    }
  )

  ipcMain.handle(
    'aone:mergeMR',
    async (
      _event,
      args: {
        mr: number
        method?: string
        deleteSourceBranch?: boolean
        message?: string | null
        repoPath?: string | null
      }
    ): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_input', error: 'mr is required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      const payload: A1MergeArgs = {
        mr,
        method: asMergeMethod(args?.method),
        deleteSourceBranch: args?.deleteSourceBranch === true,
        message: typeof args?.message === 'string' ? args.message : null
      }
      return mergeMergeRequest(payload, { cwd })
    }
  )

  ipcMain.handle(
    'aone:closeMR',
    async (_event, args: { mr: number; repoPath?: string | null }): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_input', error: 'mr is required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      return closeMergeRequest(mr, { cwd })
    }
  )

  ipcMain.handle(
    'aone:reopenMR',
    async (_event, args: { mr: number; repoPath?: string | null }): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_input', error: 'mr is required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      return reopenMergeRequest(mr, { cwd })
    }
  )

  ipcMain.handle(
    'aone:editMR',
    async (
      _event,
      args: {
        mr: number
        title?: string
        description?: string
        assignees?: string[]
        repoPath?: string | null
      }
    ): Promise<A1MutationResult> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_input', error: 'mr is required' }
      }
      const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
      const assignees = Array.isArray(args?.assignees)
        ? args.assignees.filter((v): v is string => typeof v === 'string')
        : undefined
      return editMergeRequest(
        {
          mr,
          title: typeof args?.title === 'string' ? args.title : undefined,
          description: typeof args?.description === 'string' ? args.description : undefined,
          assignees
        },
        { cwd }
      )
    }
  )

  ipcMain.handle(
    'aone:getMRStatus',
    async (
      _event,
      args: { mr: number; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequestStatus | null>> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_output', error: 'mr is required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const data = await getMergeRequestStatus(mr, { cwd })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getMRStatusForBranch',
    async (
      _event,
      args: { source: string; target?: string | null; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequestStatus | null>> => {
      const source = typeof args?.source === 'string' ? args.source : ''
      if (!source.trim()) {
        return { ok: false, code: 'invalid_output', error: 'source branch is required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const data = await getMergeRequestStatusForBranch(source, args?.target ?? null, { cwd })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:listMRDiffFiles',
    async (
      _event,
      args: { mr: number; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequestDiffFile[]>> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_output', error: 'mr is required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const data = await listMergeRequestDiffFiles(mr, { cwd })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getMRFileDiff',
    async (
      _event,
      args: { mr: number; filePath: string; context?: number; repoPath?: string | null }
    ): Promise<AoneIpcResult<string | null>> => {
      const mr = asPositiveInt(args?.mr)
      const filePath = typeof args?.filePath === 'string' ? args.filePath : ''
      if (!mr || !filePath.trim()) {
        return { ok: false, code: 'invalid_output', error: 'mr and filePath are required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const context =
          typeof args?.context === 'number' && args.context > 0 ? args.context : undefined
        const data = await getMergeRequestFileDiff(mr, filePath, { cwd, context })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getMRWithExtras',
    async (
      _event,
      args: { mr: number; extras?: A1MergeRequestViewExtras; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequest | null>> => {
      const mr = asPositiveInt(args?.mr)
      if (!mr) {
        return { ok: false, code: 'invalid_output', error: 'mr is required' }
      }
      try {
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const extras: A1MergeRequestViewExtras = {
          workItems: args?.extras?.workItems === true,
          cr: args?.extras?.cr === true,
          files: args?.extras?.files === true,
          ci: args?.extras?.ci === true
        }
        const data = await getMergeRequestWithExtras(mr, extras, { cwd })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )
}
