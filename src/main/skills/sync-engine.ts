import fs from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'

export type SyncResult = {
  success: boolean
  targetPath: string
  error?: string
}

export async function syncSkill(source: string, target: string): Promise<SyncResult> {
  try {
    await fs.mkdir(path.dirname(target), { recursive: true })
    ensureDstNotInsideSrc(source, target)
    await removeTarget(target)
    await fs.symlink(source, target, 'dir')

    return { success: true, targetPath: target }
  } catch (err) {
    return {
      success: false,
      targetPath: target,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export async function removeTarget(target: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.lstat>>
  try {
    stat = await fs.lstat(target)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    throw err
  }

  if (stat.isSymbolicLink()) {
    await fs.unlink(target)
  } else if (stat.isDirectory()) {
    await fs.rm(target, { recursive: true, force: true })
  } else {
    await fs.unlink(target)
  }
}

export async function copyDirRecursive(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name === '.git') {
      continue
    }

    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)

    await (entry.isDirectory() ? copyDirRecursive(srcPath, dstPath) : fs.copyFile(srcPath, dstPath))
  }
}

export function targetDirName(centralPath: string, skillName: string): string {
  return path.basename(centralPath) || skillName
}

export async function detectExistingTargets<T extends { key: string }>(
  centralRepoPath: string,
  adapters: T[],
  getDir: (adapter: T) => string
): Promise<Map<string, { tool: string; status: string }[]>> {
  const resolved = await fs.realpath(centralRepoPath).catch(() => centralRepoPath)
  const result = new Map<string, { tool: string; status: string }[]>()

  for (const adapter of adapters) {
    const toolDir = getDir(adapter)
    let entries: Dirent<string>[]
    try {
      entries = (await fs.readdir(toolDir, {
        withFileTypes: true,
        encoding: 'utf-8'
      })) as Dirent<string>[]
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

        const target = await fs.realpath(entryPath)
        if (!target.startsWith(resolved + path.sep) && target !== resolved) {
          continue
        }

        const existing = result.get(target) ?? []
        if (!existing.some((t) => t.tool === adapter.key)) {
          existing.push({ tool: adapter.key, status: 'synced' })
          result.set(target, existing)
        }
      } catch {
        // skip broken symlinks
      }
    }
  }

  return result
}

export function ensureDstNotInsideSrc(src: string, dst: string): void {
  const resolvedSrc = path.resolve(src)
  const resolvedDst = path.resolve(dst)

  if (resolvedDst === resolvedSrc || resolvedDst.startsWith(`${resolvedSrc}${path.sep}`)) {
    throw new Error(
      `Target "${dst}" is inside source "${src}", which would cause infinite recursion`
    )
  }
}
