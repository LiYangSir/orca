// IPC surface for the Aone task provider. Mirrors the shape of ipc/linear.ts
// (one ipcMain.handle per logical operation, called from preload) but does
// not own credentials — auth lives in the user's local `a1` CLI installation.

import { ipcMain } from 'electron'
import {
  getA1LinkStatus,
  getMergeRequest,
  getMergeRequestForBranch,
  getWorkItem,
  isAoneAvailable,
  listMergeRequests,
  listWorkItems,
  type AoneMergeRequestListFilter,
  type AoneWorkItemListFilter
} from '../aone/client'
import { A1Error } from '../aone/a1-runner'
import type { A1WorkItem, A1MergeRequest } from '../aone/types'
import {
  toFailure,
  type AoneIpcFailure,
  type AoneIpcResult,
  type AoneIpcStatus
} from './aone-ipc-envelope'
import { registerAoneMrHandlers } from './aone-mr-handlers'

export type { AoneIpcFailure, AoneIpcResult, AoneIpcStatus } from './aone-ipc-envelope'

function asWorkItemFilter(value: unknown): AoneWorkItemListFilter {
  const raw = (value ?? {}) as Record<string, unknown>
  const filter: AoneWorkItemListFilter = {}
  if (typeof raw.scope === 'string') {
    filter.scope = raw.scope as AoneWorkItemListFilter['scope']
  }
  if (Array.isArray(raw.category)) {
    filter.category = raw.category.filter((v): v is string => typeof v === 'string')
  }
  if (Array.isArray(raw.status)) {
    filter.status = raw.status.filter((v): v is string => typeof v === 'string')
  }
  if (typeof raw.pageSize === 'number' && raw.pageSize > 0) {
    filter.pageSize = raw.pageSize
  }
  if (typeof raw.project === 'string' && raw.project.trim()) {
    filter.project = raw.project.trim()
  }
  return filter
}

function asMergeRequestFilter(value: unknown): AoneMergeRequestListFilter {
  const raw = (value ?? {}) as Record<string, unknown>
  const filter: AoneMergeRequestListFilter = {}
  if (raw.mine === 'created' || raw.mine === 'review') {
    filter.mine = raw.mine
  }
  if (raw.state === 'opened' || raw.state === 'closed' || raw.state === 'merged') {
    filter.state = raw.state
  }
  if (typeof raw.pageSize === 'number' && raw.pageSize > 0) {
    filter.pageSize = raw.pageSize
  }
  return filter
}

export function registerAoneHandlers(): void {
  ipcMain.handle('aone:getStatus', async (): Promise<AoneIpcStatus | AoneIpcFailure> => {
    const installed = await isAoneAvailable()
    if (!installed) {
      return { ok: true, installed: false, link: null }
    }
    try {
      const link = await getA1LinkStatus()
      return { ok: true, installed: true, link }
    } catch (error) {
      if (error instanceof A1Error && error.code === 'auth_required') {
        return { ok: true, installed: true, link: null }
      }
      return toFailure(error)
    }
  })

  ipcMain.handle(
    'aone:listWorkItems',
    async (_event, args: unknown): Promise<AoneIpcResult<A1WorkItem[]>> => {
      try {
        const data = await listWorkItems(asWorkItemFilter(args))
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getWorkItem',
    async (_event, args: { identifier: string }): Promise<AoneIpcResult<A1WorkItem | null>> => {
      try {
        const data = await getWorkItem(args?.identifier ?? '')
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:listMergeRequests',
    async (_event, args: unknown): Promise<AoneIpcResult<A1MergeRequest[]>> => {
      try {
        const data = await listMergeRequests(asMergeRequestFilter(args))
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getMergeRequest',
    async (_event, args: { iid: number }): Promise<AoneIpcResult<A1MergeRequest | null>> => {
      try {
        const iid = Number(args?.iid)
        const data = await getMergeRequest(iid)
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  ipcMain.handle(
    'aone:getMergeRequestForBranch',
    async (
      _event,
      args: { branch: string; repoPath?: string | null }
    ): Promise<AoneIpcResult<A1MergeRequest | null>> => {
      try {
        const branch = typeof args?.branch === 'string' ? args.branch : ''
        const cwd = typeof args?.repoPath === 'string' ? args.repoPath : undefined
        const data = await getMergeRequestForBranch(branch, { cwd })
        return { ok: true, data }
      } catch (error) {
        return toFailure(error)
      }
    }
  )

  registerAoneMrHandlers()
}
