import type { SkillSourceType, SkillUpdateStatus } from '../../../../shared/skills'

export type SkillsViewMode = 'grid' | 'list'

export const SOURCE_TYPES: readonly {
  id: SkillSourceType
  label: string
  color: string
}[] = [
  { id: 'local', label: 'Local', color: '#6b7280' },
  { id: 'import', label: 'Import', color: '#8b5cf6' },
  { id: 'git', label: 'Git', color: '#f97316' },
  { id: 'skillssh', label: 'skills.sh', color: '#3b82f6' },
  { id: 'memory', label: 'Memory', color: '#22c55e' }
]

export const UPDATE_STATUSES: readonly {
  id: SkillUpdateStatus
  label: string
  color: string
}[] = [
  { id: 'up_to_date', label: 'Up to date', color: '#22c55e' },
  { id: 'update_available', label: 'Update available', color: '#f59e0b' },
  { id: 'unknown', label: 'Unknown', color: '#6b7280' },
  { id: 'checking', label: 'Checking...', color: '#3b82f6' },
  { id: 'updating', label: 'Updating...', color: '#3b82f6' },
  { id: 'error', label: 'Error', color: '#ef4444' },
  { id: 'local_only', label: 'Local only', color: '#6b7280' },
  { id: 'source_missing', label: 'Source missing', color: '#ef4444' }
]

export function getSourceColor(sourceType: string): string {
  return SOURCE_TYPES.find((s) => s.id === sourceType)?.color ?? '#6b7280'
}

export function getUpdateInfo(updateStatus: string): (typeof UPDATE_STATUSES)[number] {
  return UPDATE_STATUSES.find((u) => u.id === updateStatus) ?? UPDATE_STATUSES[2]
}
