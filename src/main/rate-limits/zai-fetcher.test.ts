import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const netFetchMock = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  net: { fetch: netFetchMock }
}))

import { fetchZaiRateLimits } from './zai-fetcher'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response
}

function badJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('bad json')
    }
  } as unknown as Response
}

const QUOTA_RESPONSE = {
  data: {
    limits: [
      {
        type: 'TOKENS_LIMIT',
        unit: 3,
        percentage: 25,
        nextResetTime: 1_804_000_000_000
      },
      {
        type: 'TOKENS_LIMIT',
        unit: 6,
        percentage: 50,
        nextResetTime: 1_804_100_000_000
      },
      {
        type: 'TIME_LIMIT',
        currentValue: 3,
        usage: 10,
        nextResetTime: 1_804_200_000_000
      }
    ]
  }
}

describe('fetchZaiRateLimits', () => {
  beforeEach(() => {
    netFetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns unavailable when no API key is configured', async () => {
    vi.stubEnv('ZAI_API_KEY', '')
    vi.stubEnv('GLM_API_KEY', '')

    const result = await fetchZaiRateLimits()

    expect(result.provider).toBe('zai')
    expect(result.status).toBe('unavailable')
    expect(result.session).toBeNull()
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('maps session, weekly, and web search quota windows', async () => {
    vi.stubEnv('ZAI_API_KEY', 'zai-key')
    netFetchMock.mockResolvedValueOnce(jsonResponse(QUOTA_RESPONSE))

    const result = await fetchZaiRateLimits()

    expect(result.status).toBe('ok')
    expect(result.session).toMatchObject({
      usedPercent: 25,
      windowMinutes: 300,
      resetsAt: 1_804_000_000_000
    })
    expect(result.weekly).toMatchObject({
      usedPercent: 50,
      windowMinutes: 10080,
      resetsAt: 1_804_100_000_000
    })
    expect(result.monthly).toMatchObject({
      usedPercent: 30,
      windowMinutes: 43200,
      resetsAt: 1_804_200_000_000
    })
    expect(result.monthlyLabel).toBe('Web Searches')

    const [, init] = netFetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer zai-key')
  })

  it('falls back to GLM_API_KEY when ZAI_API_KEY is not set', async () => {
    vi.stubEnv('ZAI_API_KEY', '')
    vi.stubEnv('GLM_API_KEY', 'glm-key')
    netFetchMock.mockResolvedValueOnce(jsonResponse(QUOTA_RESPONSE))

    await fetchZaiRateLimits()

    const [, init] = netFetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer glm-key')
  })

  it('reports invalid API keys as errors', async () => {
    vi.stubEnv('ZAI_API_KEY', 'bad-key')
    netFetchMock.mockResolvedValueOnce(jsonResponse({}, 401))

    const result = await fetchZaiRateLimits()

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/invalid/i)
  })

  it('reports invalid JSON as a parse error', async () => {
    vi.stubEnv('ZAI_API_KEY', 'zai-key')
    netFetchMock.mockResolvedValueOnce(badJsonResponse())

    const result = await fetchZaiRateLimits()

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/invalid/i)
  })

  it('reports empty quota payloads as errors', async () => {
    vi.stubEnv('ZAI_API_KEY', 'zai-key')
    netFetchMock.mockResolvedValueOnce(jsonResponse({ data: { limits: [] } }))

    const result = await fetchZaiRateLimits()

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/quota limits/i)
  })
})
