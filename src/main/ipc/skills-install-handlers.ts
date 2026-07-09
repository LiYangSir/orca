import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ipcMain } from 'electron'
import { installFromLocal } from '../skills/installer'
import {
  parseGitSource,
  previewGitInstall as gitPreview,
  resolveSkillDir,
  getHeadRevision,
  cleanupTemp
} from '../skills/git-fetcher'
import { fetchLeaderboard, searchMarketplace } from '../skills/marketplace'
import type { SkillsRepository, SkillRecord } from '../skills/skills-repository'
import type { CentralSkill, GitPreviewResult, SkillsShSkill } from '../../shared/skills'

export function registerSkillsInstallHandlers(repo: SkillsRepository): void {
  ipcMain.handle(
    'skills:installLocal',
    async (_event, args: { path: string; name?: string }): Promise<CentralSkill> => {
      const centralRepo = await repo.ensureCentralRepo()
      const result = await installFromLocal(args.path, args.name ?? null, centralRepo)
      const now = Date.now()
      const record: SkillRecord = {
        id: `local-${result.name}-${now}`,
        name: result.name,
        description: result.description,
        sourceType: 'local',
        sourceRef: args.path,
        sourceBranch: null,
        sourceRevision: null,
        remoteRevision: null,
        centralPath: result.centralPath,
        contentHash: result.contentHash,
        enabled: true,
        tags: null,
        updateStatus: 'local_only',
        targets: [],
        createdAt: now,
        updatedAt: now
      }
      const skill = await repo.upsertSkill(record)
      await repo.syncSkillToAllEnabledTools(record.id)
      return skill
    }
  )

  ipcMain.handle(
    'skills:installGit',
    async (_event, args: { url: string }): Promise<CentralSkill> => {
      const source = parseGitSource(args.url)
      const centralRepo = await repo.ensureCentralRepo()
      const tempDir = await gitPreview(source.cloneUrl)

      try {
        const skillDir = resolveSkillDir(tempDir.tempDir, source)
        const revision = await getHeadRevision(tempDir.tempDir)
        const result = await installFromLocal(skillDir, null, centralRepo)
        const now = Date.now()
        const record: SkillRecord = {
          id: `git-${result.name}-${now}`,
          name: result.name,
          description: result.description,
          sourceType: 'git',
          sourceRef: args.url,
          sourceBranch: source.branch,
          sourceRevision: revision,
          remoteRevision: revision,
          centralPath: result.centralPath,
          contentHash: result.contentHash,
          enabled: true,
          tags: null,
          updateStatus: 'up_to_date',
          targets: [],
          createdAt: now,
          updatedAt: now
        }
        const skill = await repo.upsertSkill(record)
        await repo.syncSkillToAllEnabledTools(record.id)
        return skill
      } finally {
        await cleanupTemp(tempDir.tempDir)
      }
    }
  )

  ipcMain.handle(
    'skills:installFromMarketplace',
    async (_event, args: { source: string; name: string }): Promise<CentralSkill> => {
      const source = parseGitSource(args.source)
      const centralRepo = await repo.ensureCentralRepo()
      const preview = await gitPreview(source.cloneUrl)

      try {
        const skillDir = resolveSkillDir(preview.tempDir, source)
        const revision = await getHeadRevision(preview.tempDir)
        const result = await installFromLocal(skillDir, args.name, centralRepo)
        const now = Date.now()
        const record: SkillRecord = {
          id: `skillssh-${result.name}-${now}`,
          name: result.name,
          description: result.description,
          sourceType: 'skillssh',
          sourceRef: args.source,
          sourceBranch: source.branch,
          sourceRevision: revision,
          remoteRevision: revision,
          centralPath: result.centralPath,
          contentHash: result.contentHash,
          enabled: true,
          tags: null,
          updateStatus: 'up_to_date',
          targets: [],
          createdAt: now,
          updatedAt: now
        }
        const skill = await repo.upsertSkill(record)
        await repo.syncSkillToAllEnabledTools(record.id)
        return skill
      } finally {
        await cleanupTemp(preview.tempDir)
      }
    }
  )

  ipcMain.handle(
    'skills:previewGitInstall',
    async (_event, args: { url: string }): Promise<GitPreviewResult> => {
      return gitPreview(args.url)
    }
  )

  ipcMain.handle(
    'skills:confirmGitInstall',
    async (
      _event,
      args: { tempDir: string; selections: { relativePath: string; name: string }[] }
    ): Promise<CentralSkill[]> => {
      const centralRepo = await repo.ensureCentralRepo()
      const results: CentralSkill[] = []

      for (const selection of args.selections) {
        const skillDir = join(args.tempDir, selection.relativePath)
        const result = await installFromLocal(skillDir, selection.name, centralRepo)
        const now = Date.now()
        const record: SkillRecord = {
          id: `git-${result.name}-${now}`,
          name: result.name,
          description: result.description,
          sourceType: 'git',
          sourceRef: null,
          sourceBranch: null,
          sourceRevision: null,
          remoteRevision: null,
          centralPath: result.centralPath,
          contentHash: result.contentHash,
          enabled: true,
          tags: null,
          updateStatus: 'unknown',
          targets: [],
          createdAt: now,
          updatedAt: now
        }
        const skill = await repo.upsertSkill(record)
        await repo.syncSkillToAllEnabledTools(record.id)
        results.push(skill)
      }

      await cleanupTemp(args.tempDir)
      return results
    }
  )

  ipcMain.handle(
    'skills:batchImportFolder',
    async (_event, args: { path: string }): Promise<CentralSkill[]> => {
      const entries = await readdir(args.path, { withFileTypes: true })
      const centralRepo = await repo.ensureCentralRepo()
      const results: CentralSkill[] = []

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
          continue
        }
        const dirPath = join(args.path, entry.name)
        try {
          const result = await installFromLocal(dirPath, null, centralRepo)
          const now = Date.now()
          const record: SkillRecord = {
            id: `import-${result.name}-${now}`,
            name: result.name,
            description: result.description,
            sourceType: 'import',
            sourceRef: dirPath,
            sourceBranch: null,
            sourceRevision: null,
            remoteRevision: null,
            centralPath: result.centralPath,
            contentHash: result.contentHash,
            enabled: true,
            tags: null,
            updateStatus: 'local_only',
            targets: [],
            createdAt: now,
            updatedAt: now
          }
          const skill = await repo.upsertSkill(record)
          await repo.syncSkillToAllEnabledTools(record.id)
          results.push(skill)
        } catch {
          // skip dirs that fail to import
        }
      }

      return results
    }
  )

  ipcMain.handle(
    'skills:marketplace:fetchLeaderboard',
    async (_event, args: { sort: 'hot' | 'trending' | 'all_time' }): Promise<SkillsShSkill[]> => {
      return fetchLeaderboard(args.sort)
    }
  )

  ipcMain.handle(
    'skills:marketplace:search',
    async (_event, args: { query: string }): Promise<SkillsShSkill[]> => {
      return searchMarketplace(args.query)
    }
  )
}
