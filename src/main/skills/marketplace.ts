import type { SkillsShSkill } from '../../shared/skills'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

function parseSkillObject(obj: Record<string, unknown>): SkillsShSkill | null {
  const source = typeof obj.source === 'string' ? obj.source : ''
  if (!source) {
    return null
  }

  const skillId =
    typeof obj.skillId === 'string'
      ? obj.skillId
      : typeof obj.skill_id === 'string'
        ? obj.skill_id
        : typeof obj.id === 'string'
          ? obj.id
          : ''
  if (!skillId) {
    return null
  }

  const name = typeof obj.name === 'string' && obj.name ? obj.name : skillId
  const installs = typeof obj.installs === 'number' ? obj.installs : 0

  return { id: `${source}/${skillId}`, skillId, name, source, installs }
}

function parseSkillsArray(arr: unknown[]): SkillsShSkill[] {
  const results: SkillsShSkill[] = []
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const skill = parseSkillObject(item as Record<string, unknown>)
      if (skill) {
        results.push(skill)
      }
    }
  }
  return results
}

function parseLeaderboardHtml(html: string): SkillsShSkill[] {
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1])
      const props = data?.props?.pageProps
      if (props) {
        for (const key of ['initialSkills', 'skills', 'items']) {
          if (Array.isArray(props[key]) && props[key].length > 0) {
            return parseSkillsArray(props[key])
          }
        }
      }
    } catch {
      // failed to parse Next.js data
    }
  }

  const skills: SkillsShSkill[] = []

  const patterns = [
    /\{[^{}]*"source"\s*:\s*"[^"]+"\s*,\s*"(?:skillId|skill_id)"\s*:\s*"[^"]+[^{}]*\}/g,
    /\{[^{}]*\\"source\\"\s*:\s*\\"[^"\\]+\\"\s*,\s*\\"(?:skillId|skill_id)\\"\s*:\s*\\"[^"\\]+[^{}]*\}/g
  ]

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      try {
        const raw = match[0].replace(/\\"/g, '"')
        const obj = JSON.parse(raw)
        const skill = parseSkillObject(obj)
        if (skill) {
          const exists = skills.some((s) => s.id === skill.id)
          if (!exists) {
            skills.push(skill)
          }
        }
      } catch {
        // skip unparseable match
      }
    }
    if (skills.length > 0) {
      break
    }
  }

  return skills
}

const leaderboardCache = new Map<string, { data: SkillsShSkill[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

const LEADERBOARD_URLS: Record<string, string> = {
  hot: 'https://skills.sh/hot',
  trending: 'https://skills.sh/trending',
  all_time: 'https://skills.sh/'
}

export async function fetchLeaderboard(
  sort: 'hot' | 'trending' | 'all_time'
): Promise<SkillsShSkill[]> {
  const cacheKey = `leaderboard_${sort}`

  const cached = leaderboardCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const url = LEADERBOARD_URLS[sort] ?? LEADERBOARD_URLS.hot

  const response = await fetch(url, {
    headers: { 'User-Agent': 'orca-skills-manager' },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow'
  })
  if (!response.ok) {
    // Why: undici crashes the process on unread response bodies (orca#8695).
    await cancelUnreadResponseBody(response)
    throw new Error(`skills.sh returned ${response.status}`)
  }
  const html = await response.text()
  const skills = parseLeaderboardHtml(html)

  leaderboardCache.set(cacheKey, { data: skills, timestamp: Date.now() })

  return skills
}

export async function searchMarketplace(query: string): Promise<SkillsShSkill[]> {
  const limit = 60
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const url = `https://skills.sh/api/search?${params}`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'orca-skills-manager' },
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) {
    // Why: undici crashes the process on unread response bodies (orca#8695).
    await cancelUnreadResponseBody(response)
    throw new Error(`skills.sh returned ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const data = (await response.json()) as unknown
    if (Array.isArray(data)) {
      return parseSkillsArray(data)
    }
    if (
      data &&
      typeof data === 'object' &&
      'skills' in data &&
      Array.isArray((data as { skills: unknown }).skills)
    ) {
      return parseSkillsArray((data as { skills: unknown[] }).skills)
    }
    return []
  }

  const html = await response.text()
  return parseLeaderboardHtml(html)
}
