import { net } from 'electron'
import type { ProviderRateLimits, RateLimitWindow } from '../../shared/rate-limit-types'

const ZAI_QUOTA_URL = 'https://api.z.ai/api/monitor/usage/quota/limit'
const API_TIMEOUT_MS = 10_000
const SESSION_WINDOW_MINUTES = 300 // 5h
const WEEKLY_WINDOW_MINUTES = 10080 // 7d
const WEB_SEARCH_WINDOW_MINUTES = 43200 // 30d

type ZaiLimit = {
  type?: string
  name?: string
  unit?: number
  percentage?: number
  nextResetTime?: number
  currentValue?: number
  usage?: number
}

type ZaiQuotaResponse = {
  data?: {
    limits?: ZaiLimit[]
  }
  limits?: ZaiLimit[]
}

function result(status: ProviderRateLimits['status'], error: string | null): ProviderRateLimits {
  return {
    provider: 'zai',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error,
    status
  }
}

function limitsFromResponse(data: unknown): ZaiLimit[] | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  const quota = data as ZaiQuotaResponse
  const container = quota.data ?? quota
  const limits = Array.isArray(container) ? container : container.limits
  return Array.isArray(limits) ? limits : null
}

function findLimit(limits: ZaiLimit[], type: string, unit?: number): ZaiLimit | null {
  let fallback: ZaiLimit | null = null
  for (const item of limits) {
    if (item.type !== type && item.name !== type) {
      continue
    }
    if (unit === undefined || item.unit === unit) {
      return item
    }
    if (fallback === null && item.unit === undefined) {
      fallback = item
    }
  }
  return fallback
}

function resetTimeToMs(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }
  return value
}

function percentWindow(limit: ZaiLimit | null, windowMinutes: number): RateLimitWindow | null {
  if (!limit || typeof limit.percentage !== 'number' || !Number.isFinite(limit.percentage)) {
    return null
  }
  return {
    usedPercent: Math.min(100, Math.max(0, limit.percentage)),
    windowMinutes,
    resetsAt: resetTimeToMs(limit.nextResetTime),
    resetDescription: null
  }
}

function webSearchWindow(limit: ZaiLimit | null): RateLimitWindow | null {
  if (!limit) {
    return null
  }
  const used = typeof limit.currentValue === 'number' ? limit.currentValue : null
  const total = typeof limit.usage === 'number' ? limit.usage : null
  if (used === null || total === null || total <= 0) {
    return null
  }
  return {
    usedPercent: Math.min(100, Math.max(0, (used / total) * 100)),
    windowMinutes: WEB_SEARCH_WINDOW_MINUTES,
    resetsAt: resetTimeToMs(limit.nextResetTime) ?? firstDayOfNextUtcMonth(),
    resetDescription: null
  }
}

function firstDayOfNextUtcMonth(): number {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
}

function mapQuotaResponse(data: unknown): ProviderRateLimits {
  const limits = limitsFromResponse(data)
  if (!limits || limits.length === 0) {
    return result('error', 'Z.ai usage response did not include quota limits')
  }

  const session = percentWindow(findLimit(limits, 'TOKENS_LIMIT', 3), SESSION_WINDOW_MINUTES)
  const weekly = percentWindow(findLimit(limits, 'TOKENS_LIMIT', 6), WEEKLY_WINDOW_MINUTES)
  const monthly = webSearchWindow(findLimit(limits, 'TIME_LIMIT'))
  const hasData = Boolean(session || weekly || monthly)

  return {
    provider: 'zai',
    session,
    weekly,
    monthly,
    monthlyLabel: monthly ? 'Web Searches' : undefined,
    updatedAt: Date.now(),
    error: hasData ? null : 'Z.ai usage response did not include quota windows',
    status: hasData ? 'ok' : 'error'
  }
}

// Why: Settings is the sole credential source so dev and packaged launches
// behave identically; shell environment variables must not shadow saved state.
export async function fetchZaiRateLimits(apiKey: string): Promise<ProviderRateLimits> {
  const normalizedApiKey = apiKey.trim()
  if (!normalizedApiKey) {
    return result('unavailable', 'Add your Z.ai API key in Settings > Accounts.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const res = await net.fetch(ZAI_QUOTA_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${normalizedApiKey}`, Accept: 'application/json' },
      signal: controller.signal
    })
    if (res.status === 401 || res.status === 403) {
      return result('error', 'API key invalid. Check your Z.ai API key.')
    }
    if (!res.ok) {
      return result('error', `Z.ai usage request failed (HTTP ${res.status}). Try again later.`)
    }
    const data: unknown = await res.json()
    return mapQuotaResponse(data)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return result('error', 'Z.ai usage response invalid. Try again later.')
    }
    return result(
      'error',
      err instanceof Error ? err.message : 'Z.ai usage request failed. Check your connection.'
    )
  } finally {
    clearTimeout(timeout)
  }
}
