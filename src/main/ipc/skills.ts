import { randomUUID } from 'node:crypto'
import { app, ipcMain } from 'electron'
import type { Store } from '../persistence'
import {
  SkillDiscoveryTargetSchema,
  type DiscoveredSkill,
  type SavedSkill,
  type SkillDiscoveryResult,
  type SkillDiscoveryTarget,
  type SkillPreset
} from '../../shared/skills'
import type { SkillFreshnessInventory } from '../../shared/skill-freshness'
import { inventorySkillFreshness } from '../skills/skill-freshness-inventory'
import {
  discoverSkillsOnTarget,
  resolveSkillDiscoveryTarget
} from '../skills/skill-discovery-target'
import { registerCentralSkillsHandlers } from './skills-central'

export function registerSkillsHandlers(store: Store): void {
  ipcMain.handle(
    'skills:discover',
    async (_event, target?: SkillDiscoveryTarget): Promise<SkillDiscoveryResult> => {
      const parsedTarget = target ? SkillDiscoveryTargetSchema.parse(target) : undefined
      return discoverSkillsOnTarget(resolveSkillDiscoveryTarget(parsedTarget), store.getRepos())
    }
  )

  ipcMain.handle('skills:freshnessInventory', async (): Promise<SkillFreshnessInventory> => {
    // Why: the update command targets this machine's global homes. WSL and SSH
    // inventories stay out until their installer rail has an equivalent proof.
    return inventorySkillFreshness({
      currentAppVersion: app.getVersion(),
      repos: store.getRepos()
    })
  })

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

  // Central-repo skill handlers (superset parity) — split into skills-central.ts
  registerCentralSkillsHandlers(store)
}
