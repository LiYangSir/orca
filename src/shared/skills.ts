import type { ProjectExecutionRuntimeResolution } from './project-execution-runtime'

export type SkillProvider = 'codex' | 'claude' | 'agent-skills'

export type SkillSourceKind = 'home' | 'repo' | 'bundled' | 'plugin'

export type DiscoveredSkill = {
  id: string
  name: string
  description: string | null
  providers: SkillProvider[]
  sourceKind: SkillSourceKind
  sourceLabel: string
  rootPath: string
  directoryPath: string
  skillFilePath: string
  installed: boolean
  fileCount: number
  updatedAt: number | null
}

/** Snapshot of a discovered skill kept in the local skill library. */
export type SavedSkill = {
  id: string
  name: string
  description: string | null
  providers: SkillProvider[]
  sourceKind: SkillSourceKind
  sourceLabel: string
  rootPath: string
  directoryPath: string
  skillFilePath: string
  fileCount: number
  discoveredUpdatedAt: number | null
  savedAt: number
  updatedAt: number
}

/** Reusable group of saved skills; future per-skill options can layer on here. */
export type SkillPreset = {
  id: string
  name: string
  skillIds: string[]
  createdAt: number
  updatedAt: number
}

export type SkillDiscoverySource = {
  id: string
  label: string
  path: string
  sourceKind: SkillSourceKind
  providers: SkillProvider[]
  exists: boolean
  skippedReason?: 'missing' | 'remote-repo'
}

export type SkillDiscoveryResult = {
  skills: DiscoveredSkill[]
  sources: SkillDiscoverySource[]
  scannedAt: number
}

export type SkillDiscoveryTarget = {
  runtime?: 'host' | 'wsl'
  wslDistro?: string | null
  /** Workspace path whose local .agents/.claude skill roots should be scanned. */
  cwd?: string | null
  projectRuntime?: ProjectExecutionRuntimeResolution
}

export type SkillFrontmatterSummary = {
  name: string | null
  description: string | null
}

// ---------------------------------------------------------------------------
// Central-repo skill model (superset parity)
// ---------------------------------------------------------------------------

export type SkillSourceType = 'local' | 'import' | 'git' | 'skillssh' | 'memory'

export type SkillUpdateStatus =
  | 'up_to_date'
  | 'update_available'
  | 'unknown'
  | 'checking'
  | 'updating'
  | 'error'
  | 'local_only'
  | 'source_missing'

export type SkillTarget = {
  tool: string
  status: string
}

/** A skill managed by the central repository. */
export type CentralSkill = {
  id: string
  name: string
  description: string | null
  sourceType: SkillSourceType
  sourceRef: string | null
  sourceBranch: string | null
  sourceRevision: string | null
  centralPath: string
  contentHash: string | null
  enabled: boolean
  tags: string[] | null
  updateStatus: SkillUpdateStatus
  targets: SkillTarget[]
  createdAt: number
  updatedAt: number
}

export type ToolCategory = 'coding' | 'lobster'

export type ToolInfo = {
  key: string
  displayName: string
  installed: boolean
  enabled: boolean
  category: ToolCategory
}

export type SkillsShSkill = {
  id: string
  skillId: string
  name: string
  source: string
  installs: number
}

export type GitSkillPreview = {
  name: string
  relativePath: string
  description: string | null
  hasSkillMd: boolean
}

export type GitPreviewResult = {
  tempDir: string
  skills: GitSkillPreview[]
}
