import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import type { Store } from '../persistence'
import { discoverSkills } from '../skills/discovery'
import type {
  DiscoveredSkill,
  SavedSkill,
  SkillDiscoveryResult,
  SkillDiscoveryTarget,
  SkillPreset
} from '../../shared/skills'
import { getDefaultWslDistro, getWslHome } from '../wsl'

type SkillDiscoveryRuntimeTarget =
  | { runtime: 'host' }
  | { runtime: 'wsl'; wslDistro: string | null | undefined }

function getSkillDiscoveryRuntimeTarget(
  target: SkillDiscoveryTarget | undefined
): SkillDiscoveryRuntimeTarget {
  const projectRuntime = target?.projectRuntime
  if (!projectRuntime) {
    return target?.runtime === 'wsl'
      ? { runtime: 'wsl', wslDistro: target.wslDistro }
      : { runtime: 'host' }
  }

  if (projectRuntime.status === 'repair-required') {
    throw new Error(
      `Project runtime requires repair before skill discovery: ${projectRuntime.repair.reason}`
    )
  }

  if (projectRuntime.runtime.kind === 'wsl') {
    return { runtime: 'wsl', wslDistro: projectRuntime.runtime.distro }
  }

  return { runtime: 'host' }
}

export function registerSkillsHandlers(store: Store): void {
  ipcMain.handle(
    'skills:discover',
    async (_event, target?: SkillDiscoveryTarget): Promise<SkillDiscoveryResult> => {
      const runtimeTarget = getSkillDiscoveryRuntimeTarget(target)
      if (runtimeTarget.runtime === 'wsl') {
        if (process.platform !== 'win32') {
          throw new Error('WSL skill discovery is only available on Windows.')
        }
        const distro = runtimeTarget.wslDistro?.trim() || getDefaultWslDistro()
        if (!distro) {
          throw new Error('No WSL distribution is available for skill discovery.')
        }
        const homeDir = getWslHome(distro)
        if (!homeDir) {
          throw new Error(`Could not resolve the WSL home directory for ${distro}.`)
        }
        return discoverSkills({ repos: [], homeDir, cwd: homeDir })
      }

      const cwd = target?.cwd?.trim() || undefined
      return cwd ? discoverSkills({ repos: [], cwd }) : discoverSkills({ repos: store.getRepos() })
    }
  )

  ipcMain.handle('skills:listSaved', (): SavedSkill[] => store.listSavedSkills())

  ipcMain.handle('skills:save', (_event, args: { skill: DiscoveredSkill }): SavedSkill => {
    const now = Date.now()
    const existing = store.listSavedSkills().find((entry) => entry.id === args.skill.id)
    const savedSkill: SavedSkill = {
      id: args.skill.id,
      name: args.skill.name.trim() || args.skill.id,
      description: args.skill.description,
      providers: [...args.skill.providers],
      sourceKind: args.skill.sourceKind,
      sourceLabel: args.skill.sourceLabel,
      rootPath: args.skill.rootPath,
      directoryPath: args.skill.directoryPath,
      skillFilePath: args.skill.skillFilePath,
      fileCount: args.skill.fileCount,
      discoveredUpdatedAt: args.skill.updatedAt,
      savedAt: existing?.savedAt ?? now,
      updatedAt: now
    }
    return store.saveSkill(savedSkill)
  })

  ipcMain.handle('skills:remove', (_event, args: { skillId: string }): void => {
    store.removeSavedSkill(args.skillId)
  })

  ipcMain.handle('skills:listPresets', (): SkillPreset[] => store.listSkillPresets())

  ipcMain.handle(
    'skills:savePreset',
    (_event, args: { id?: string; name: string; skillIds: string[] }): SkillPreset => {
      const savedSkillIds = new Set(store.listSavedSkills().map((skill) => skill.id))
      const skillIds = Array.from(
        new Set(
          args.skillIds
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
            .filter((entry) => savedSkillIds.has(entry))
        )
      )
      if (skillIds.length === 0) {
        throw new Error('Select at least one saved skill before creating a preset.')
      }
      const trimmedName = args.name.trim()
      if (!trimmedName) {
        throw new Error('Preset name is required.')
      }
      const now = Date.now()
      const existing = args.id
        ? store.listSkillPresets().find((entry) => entry.id === args.id)
        : undefined
      return store.saveSkillPreset({
        id: existing?.id ?? randomUUID(),
        name: trimmedName,
        skillIds,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      })
    }
  )

  ipcMain.handle('skills:removePreset', (_event, args: { presetId: string }): void => {
    store.removeSkillPreset(args.presetId)
  })
}
