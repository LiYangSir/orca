import type {
  WeeklyReportA1ChangeRequest,
  WeeklyReportA1DeliveryEvidence,
  WeeklyReportA1LookupState,
  WeeklyReportA1MergeRequest
} from '../../shared/automation-weekly-report'
import { A1Error, a1ExecJson, type A1ExecOptions } from './a1-runner'
import { getMergeRequestForBranchWithMergedFallback } from './client'
import { getMergeRequestStatus } from './task-client'
import type { A1MergeRequest, A1MergeRequestStatus } from './types'

const MAX_CHANGE_REQUESTS = 10
const A1_REPORT_TIMEOUT_MS = 15_000

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null
}

function recordsFromPayload(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((value) => {
      const record = asRecord(value)
      return record ? [record] : []
    })
  }
  const root = asRecord(payload)
  if (!root) {
    return []
  }
  for (const key of ['items', 'data', 'result']) {
    if (Array.isArray(root[key])) {
      return recordsFromPayload(root[key])
    }
  }
  return []
}

function lookupStateForError(error: unknown): WeeklyReportA1LookupState {
  return error instanceof A1Error && error.code === 'not_linked' ? 'not_linked' : 'unavailable'
}

async function getChangeRequestsForBranch(
  branch: string,
  options: A1ExecOptions
): Promise<WeeklyReportA1ChangeRequest[]> {
  let payload: unknown
  try {
    payload = await a1ExecJson<unknown>(['app', 'cr', 'get-by-branch', '--branch', branch], options)
  } catch (error) {
    if (error instanceof A1Error && error.code === 'invalid_output' && error.stderr === '') {
      return []
    }
    throw error
  }
  return recordsFromPayload(payload)
    .flatMap((record): WeeklyReportA1ChangeRequest[] => {
      const id = asText(record.crId)
      if (!id) {
        return []
      }
      return [
        {
          id,
          appName: asText(record.appName),
          description: asText(record.description),
          status: asText(record.crStatus),
          url: asText(record.crDetailUrl),
          // Why: deployed_at is a1's direct release fact; CR status alone does
          // not prove that an application reached a published environment.
          deployedAt: asText(record.deployed_at)
        }
      ]
    })
    .slice(0, MAX_CHANGE_REQUESTS)
}

function normalizeMergeRequest(
  mr: A1MergeRequest,
  status: A1MergeRequestStatus | null
): WeeklyReportA1MergeRequest {
  const blockers = (status?.blockers ?? []).flatMap((blocker) => {
    const message = blocker.message?.trim() || blocker.type?.trim()
    return message ? [message] : []
  })
  return {
    id: mr.id,
    title: mr.title,
    state: mr.state,
    url: mr.webUrl?.trim() || mr.detailUrl?.trim() || null,
    mergeStatus: status?.mergeStatus?.trim() || mr.mergeStatus?.trim() || null,
    ciStatus: status?.ciStatus?.trim() || mr.qualityScanStatus?.trim() || null,
    approveStatus:
      status?.approveStatus?.trim() || mr.approveCheckResult?.total_check_result?.trim() || null,
    blockers
  }
}

export async function collectA1WeeklyReportDelivery(
  repoPath: string,
  branch: string
): Promise<WeeklyReportA1DeliveryEvidence> {
  const sourceBranch = branch.replace(/^refs\/heads\//, '').trim()
  if (!sourceBranch) {
    return {
      mrLookup: 'unavailable',
      releaseLookup: 'unavailable',
      mr: null,
      changeRequests: []
    }
  }
  const options: A1ExecOptions = {
    cwd: repoPath,
    timeout: A1_REPORT_TIMEOUT_MS,
    env: { ...process.env, A1_NO_UPDATE_CHECK: '1' }
  }
  const [mrResult, changeRequestResult] = await Promise.allSettled([
    getMergeRequestForBranchWithMergedFallback(sourceBranch, options),
    getChangeRequestsForBranch(sourceBranch, options)
  ])
  const mrLookup: WeeklyReportA1LookupState =
    mrResult.status === 'fulfilled' ? 'available' : lookupStateForError(mrResult.reason)
  const releaseLookup: WeeklyReportA1LookupState =
    changeRequestResult.status === 'fulfilled'
      ? 'available'
      : lookupStateForError(changeRequestResult.reason)
  const rawMr = mrResult.status === 'fulfilled' ? mrResult.value : null
  let status: A1MergeRequestStatus | null = null
  if (rawMr) {
    try {
      status = await getMergeRequestStatus(rawMr.id, options)
    } catch {
      // The list/view payload still proves whether the MR was merged.
    }
  }
  return {
    mrLookup,
    releaseLookup,
    mr: rawMr ? normalizeMergeRequest(rawMr, status) : null,
    changeRequests: changeRequestResult.status === 'fulfilled' ? changeRequestResult.value : []
  }
}
