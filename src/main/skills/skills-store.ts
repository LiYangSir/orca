import type { CentralSkill, SkillSourceType, SkillUpdateStatus } from '../../shared/skills'

export type SkillRecord = {
  id: string
  name: string
  description: string | null
  sourceType: SkillSourceType
  sourceRef: string | null
  sourceBranch: string | null
  sourceRevision: string | null
  remoteRevision: string | null
  centralPath: string
  contentHash: string | null
  enabled: boolean
  tags: string[] | null
  updateStatus: SkillUpdateStatus
  targets: { tool: string; status: string }[]
  createdAt: number
  updatedAt: number
}

export type SkillsStore = {
  skills: SkillRecord[]
  settings: Record<string, string>
}

export function defaultStore(): SkillsStore {
  return { skills: [], settings: {} }
}

/**
 * Deduplicate skill records by name.
 * When duplicates exist, prefer the record whose centralPath is under the given repo.
 */
export function deduplicateByName(skills: SkillRecord[], centralRepoPath: string): SkillRecord[] {
  const byName = new Map<string, number>()
  for (let i = 0; i < skills.length; i++) {
    const s = skills[i]
    const prev = byName.get(s.name)
    if (prev === undefined) {
      byName.set(s.name, i)
    } else if (s.centralPath.startsWith(centralRepoPath)) {
      byName.set(s.name, i)
    }
  }
  return Array.from(byName.values()).map((i) => skills[i])
}

export function createLocalRecord(
  name: string,
  dirPath: string,
  contentHash: string | null
): SkillRecord {
  const now = Date.now()
  return {
    id: `local-${name}-${now}`,
    name,
    description: null,
    sourceType: 'local',
    sourceRef: null,
    sourceBranch: null,
    sourceRevision: null,
    remoteRevision: null,
    centralPath: dirPath,
    contentHash,
    enabled: true,
    tags: null,
    updateStatus: 'local_only',
    targets: [],
    createdAt: now,
    updatedAt: now
  }
}

export function recordToCentral(record: SkillRecord): CentralSkill {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    sourceType: record.sourceType,
    sourceRef: record.sourceRef,
    sourceBranch: record.sourceBranch,
    sourceRevision: record.sourceRevision,
    centralPath: record.centralPath,
    contentHash: record.contentHash,
    enabled: record.enabled,
    tags: record.tags,
    updateStatus: record.updateStatus,
    targets: record.targets,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}
