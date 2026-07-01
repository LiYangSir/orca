import { BrowserWindow, net } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProviderRateLimits, RateLimitWindow } from '../../shared/rate-limit-types'

const execFileAsync = promisify(execFile)

const IDEALAB_KEYCHAIN_SERVICE = 'OpenUsage-idealab'
const IDEALAB_KEYCHAIN_ACCOUNT = 'OpenUsage-idealab'
const IDEALAB_API_URL = 'https://aistudio.alibaba-inc.com/api/ailab/ak/teamapi/getOrCreate'
const IDEALAB_LOGIN_URL =
  'https://login.alibaba-inc.com/ssoLogin.htm?APP_NAME=idea-lab&BACK_URL=https%3A%2F%2Faistudio.alibaba-inc.com%2Findividual%2Fresource%2Fquery'
const DEFAULT_TEAM_CODE = process.env.IDEALAB_TEAM_CODE?.trim() || 'API_TEAM_CODE_148'
const API_TIMEOUT_MS = 15_000
const MONTHLY_WINDOW_MINUTES = 30 * 24 * 60
const LOGIN_COOKIE_SETTLE_MS = 500

type IdealabResponse = {
  success?: boolean
  message?: string
  data?: {
    cycleUsedAmount?: number
    cycleAmountLimit?: number
    cycleUsedCount?: number
    cycleCallLimit?: number
  } | null
}

type AuthRequiredResult = {
  authRequired: true
}

let loginPromise: Promise<string> | null = null

function unavailable(error: string): ProviderRateLimits {
  return {
    provider: 'idealab',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error,
    status: 'unavailable'
  }
}

function failure(error: string): ProviderRateLimits {
  return {
    provider: 'idealab',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error,
    status: 'error'
  }
}

async function writeIdealabCookiesToKeychain(cookies: string): Promise<void> {
  await execFileAsync('security', [
    'add-generic-password',
    '-U',
    '-s',
    IDEALAB_KEYCHAIN_SERVICE,
    '-a',
    IDEALAB_KEYCHAIN_ACCOUNT,
    '-w',
    cookies
  ])
}

async function clearIdealabCookiesFromKeychain(): Promise<void> {
  try {
    await writeIdealabCookiesToKeychain('')
  } catch {
    // Best effort: stale cookies should not block the interactive login path.
  }
}

function buildWindow(used: unknown, limit: unknown): RateLimitWindow | null {
  if (
    typeof used !== 'number' ||
    !Number.isFinite(used) ||
    typeof limit !== 'number' ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return null
  }
  return {
    usedPercent: Math.min(100, Math.max(0, (used / limit) * 100)),
    windowMinutes: MONTHLY_WINDOW_MINUTES,
    resetsAt: null,
    resetDescription: null
  }
}

function getLoginCookieTargetHost(): string {
  const loginUrl = new URL(IDEALAB_LOGIN_URL)
  const backUrl = loginUrl.searchParams.get('BACK_URL') ?? loginUrl.searchParams.get('back_url')
  if (backUrl) {
    try {
      return new URL(backUrl).host
    } catch {
      // Fall through to the login host when the provider changes the URL shape.
    }
  }
  return loginUrl.host
}

function cookieDomainMatchesHost(domain: string, host: string): boolean {
  const normalizedDomain = domain.trim().replace(/^\./, '').toLowerCase()
  const normalizedHost = host.toLowerCase()
  return (
    normalizedDomain === normalizedHost ||
    normalizedHost.endsWith(`.${normalizedDomain}`) ||
    normalizedDomain.includes(normalizedHost)
  )
}

function isTargetHostUrl(url: string, targetHost: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase()
    const normalizedTarget = targetHost.toLowerCase()
    return host === normalizedTarget || host.endsWith(`.${normalizedTarget}`)
  } catch {
    return url.toLowerCase().includes(targetHost.toLowerCase())
  }
}

async function extractCookiesFromLoginWindow(
  window: BrowserWindow,
  targetHost: string
): Promise<string> {
  const cookies = await window.webContents.session.cookies.get({})
  return cookies
    .filter(
      (cookie) =>
        typeof cookie.domain === 'string' && cookieDomainMatchesHost(cookie.domain, targetHost)
    )
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function performIdealabLogin(): Promise<string> {
  if (process.platform !== 'darwin') {
    throw new Error('IdeaLab login is only supported on macOS.')
  }
  if (loginPromise) {
    return loginPromise
  }

  loginPromise = new Promise<string>((resolve, reject) => {
    const targetHost = getLoginCookieTargetHost()
    const loginWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'IdeaLab Login',
      show: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    let settled = false

    const finish = async (): Promise<void> => {
      if (settled) {
        return
      }
      settled = true
      try {
        await wait(LOGIN_COOKIE_SETTLE_MS)
        const cookies = await extractCookiesFromLoginWindow(loginWindow, targetHost)
        if (!cookies) {
          throw new Error('No IdeaLab cookies found after login.')
        }
        await writeIdealabCookiesToKeychain(cookies)
        resolve(cookies)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      } finally {
        if (!loginWindow.isDestroyed()) {
          loginWindow.close()
        }
      }
    }

    const checkUrl = (url: string): void => {
      if (isTargetHostUrl(url, targetHost)) {
        void finish()
      }
    }

    loginWindow.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new Error('IdeaLab login was cancelled.'))
      }
    })
    loginWindow.webContents.on('did-navigate', (_event, url) => checkUrl(url))
    loginWindow.webContents.on('did-redirect-navigation', (_event, url) => checkUrl(url))
    loginWindow.webContents.on('did-finish-load', () => {
      checkUrl(loginWindow.webContents.getURL())
    })

    void loginWindow.loadURL(IDEALAB_LOGIN_URL).catch((error) => {
      if (!settled) {
        settled = true
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }).finally(() => {
    loginPromise = null
  })

  return loginPromise
}

async function readIdealabCookiesFromKeychain(): Promise<string | null> {
  if (process.platform !== 'darwin') {
    return null
  }
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s',
      IDEALAB_KEYCHAIN_SERVICE,
      '-a',
      IDEALAB_KEYCHAIN_ACCOUNT,
      '-w'
    ])
    const cookies = stdout.trim()
    return cookies ? cookies : null
  } catch (error) {
    const message =
      error && typeof error === 'object'
        ? `${(error as { stderr?: unknown }).stderr ?? ''} ${
            (error as { message?: unknown }).message ?? ''
          }`.toLowerCase()
        : String(error).toLowerCase()
    if (message.includes('could not be found') || message.includes('not be found')) {
      return null
    }
    throw error
  }
}

function isSuccessResponse(value: unknown): value is IdealabResponse {
  return typeof value === 'object' && value !== null
}

async function requestIdealabUsage(
  cookies: string
): Promise<ProviderRateLimits | AuthRequiredResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await net.fetch(IDEALAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies
      },
      body: JSON.stringify({ teamCode: DEFAULT_TEAM_CODE }),
      signal: controller.signal
    })

    if (response.status === 401 || response.status === 403) {
      return { authRequired: true }
    }
    if (response.status >= 300 && response.status < 400) {
      return { authRequired: true }
    }
    if (!response.ok) {
      return failure(`IdeaLab usage request failed (HTTP ${response.status}).`)
    }

    const payload: unknown = await response.json()
    if (!isSuccessResponse(payload)) {
      return failure('IdeaLab usage response was invalid.')
    }
    if (!payload.success) {
      return failure(payload.message?.trim() || 'IdeaLab usage request failed.')
    }
    if (!payload.data) {
      return failure('IdeaLab usage response was empty.')
    }

    const spendWindow = buildWindow(payload.data.cycleUsedAmount, payload.data.cycleAmountLimit)
    const callWindow = buildWindow(payload.data.cycleUsedCount, payload.data.cycleCallLimit)
    const hasData = Boolean(spendWindow || callWindow)

    return {
      provider: 'idealab',
      // Why: OpenUsage prioritizes monthly spend in the overview; keep Orca's
      // primary status-bar segment aligned with that emphasis.
      session: spendWindow,
      weekly: null,
      monthly: callWindow,
      monthlyLabel: callWindow ? 'Monthly Calls' : undefined,
      updatedAt: Date.now(),
      error: hasData ? null : 'IdeaLab quota response did not include monthly limits.',
      status: hasData ? 'ok' : 'error'
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return failure('IdeaLab usage response was invalid.')
    }
    return failure(
      error instanceof Error ? error.message : 'IdeaLab usage request failed. Check your network.'
    )
  } finally {
    clearTimeout(timeout)
  }
}

function isAuthRequiredResult(
  result: ProviderRateLimits | AuthRequiredResult
): result is AuthRequiredResult {
  return 'authRequired' in result
}

async function getCookiesOrLogin(): Promise<string | null> {
  let cookies: string | null
  try {
    cookies = await readIdealabCookiesFromKeychain()
  } catch {
    throw new Error('IdeaLab cookies could not be read from the macOS Keychain.')
  }
  if (cookies) {
    return cookies
  }
  return performIdealabLogin()
}

export async function fetchIdealabRateLimits(enabled = false): Promise<ProviderRateLimits> {
  if (!enabled) {
    return unavailable('IdeaLab usage is disabled in settings.')
  }

  let cookies: string | null
  try {
    cookies = await getCookiesOrLogin()
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'IdeaLab login failed.')
  }
  if (!cookies) {
    return unavailable('IdeaLab cookies not found. Sign in to IdeaLab first.')
  }

  const result = await requestIdealabUsage(cookies)
  if (!isAuthRequiredResult(result)) {
    return result
  }

  await clearIdealabCookiesFromKeychain()
  try {
    const refreshedCookies = await performIdealabLogin()
    const retriedResult = await requestIdealabUsage(refreshedCookies)
    if (isAuthRequiredResult(retriedResult)) {
      return unavailable('IdeaLab login did not authorize quota access.')
    }
    return retriedResult
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'IdeaLab login failed.')
  }
}
