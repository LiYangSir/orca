import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { copyDirRecursive } from './sync-engine'
import { getDefaultAdapters, getSkillsDir, isToolInstalled } from './tool-adapters'

const LEGACY_CENTRAL_REPO = path.join(os.homedir(), '.superset', 'skills')

async function dirHasEntries(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath)
    return entries.some((e) => !e.startsWith('.'))
  } catch {
    return false
  }
}

async function migrateCentralRepo(orcaSkillsDir: string): Promise<number> {
  const entries = await fs.readdir(LEGACY_CENTRAL_REPO, { withFileTypes: true })
  let migrated = 0

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue
    }
    const srcPath = path.join(LEGACY_CENTRAL_REPO, entry.name)
    const dstPath = path.join(orcaSkillsDir, entry.name)

    try {
      await fs.access(dstPath)
      continue
    } catch {
      // destination doesn't exist yet — proceed with copy
    }

    try {
      await copyDirRecursive(srcPath, dstPath)
      migrated++
    } catch {
      // skip skills that fail to copy
    }
  }

  return migrated
}

async function updateAgentSymlinks(orcaSkillsDir: string): Promise<void> {
  const adapters = getDefaultAdapters().filter((a) => isToolInstalled(a))

  for (const adapter of adapters) {
    const toolDir = getSkillsDir(adapter)
    let entries: Awaited<ReturnType<typeof fs.readdir>>
    try {
      entries = await fs.readdir(toolDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const entryPath = path.join(toolDir, entry.name)
      try {
        const stat = await fs.lstat(entryPath)
        if (!stat.isSymbolicLink()) {
          continue
        }

        const linkTarget = await fs.readlink(entryPath)
        if (!linkTarget.startsWith(LEGACY_CENTRAL_REPO)) {
          continue
        }

        const skillName = path.basename(linkTarget)
        const newTarget = path.join(orcaSkillsDir, skillName)

        try {
          await fs.access(newTarget)
        } catch {
          continue
        }

        await fs.unlink(entryPath)
        await fs.symlink(newTarget, entryPath, 'dir')
      } catch {
        // skip entries that fail
      }
    }
  }
}

export async function migrateIfNeeded(orcaSkillsDir: string): Promise<boolean> {
  const orcaHasContent = await dirHasEntries(orcaSkillsDir)
  if (orcaHasContent) {
    return false
  }

  const legacyHasContent = await dirHasEntries(LEGACY_CENTRAL_REPO)
  if (!legacyHasContent) {
    return false
  }

  const migrated = await migrateCentralRepo(orcaSkillsDir)
  if (migrated > 0) {
    await updateAgentSymlinks(orcaSkillsDir)
  }

  return migrated > 0
}
