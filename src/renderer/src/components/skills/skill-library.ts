import type { SavedSkill, SkillPreset } from '../../../../shared/skills'

export function upsertSavedSkill(
  skills: readonly SavedSkill[],
  savedSkill: SavedSkill
): SavedSkill[] {
  const without = skills.filter((entry) => entry.id !== savedSkill.id)
  return [...without, savedSkill].sort((left, right) => left.name.localeCompare(right.name))
}

export function removeSavedSkillFromPresets(
  presets: readonly SkillPreset[],
  skillId: string
): SkillPreset[] {
  return presets.map((preset) => ({
    ...preset,
    skillIds: preset.skillIds.filter((entry) => entry !== skillId)
  }))
}

export function upsertSkillPreset(
  presets: readonly SkillPreset[],
  preset: SkillPreset
): SkillPreset[] {
  const without = presets.filter((entry) => entry.id !== preset.id)
  return [...without, preset].sort((left, right) => left.name.localeCompare(right.name))
}

export function resolvePresetSkills(
  preset: SkillPreset,
  savedSkillsById: Readonly<Record<string, SavedSkill>>
): SavedSkill[] {
  return preset.skillIds
    .map((skillId) => savedSkillsById[skillId])
    .filter((skill): skill is SavedSkill => Boolean(skill))
}

export function formatSkillMentions(skills: readonly Pick<SavedSkill, 'name'>[]): string {
  return skills
    .map((skill) => skill.name.trim())
    .filter((name) => name.length > 0)
    .map((name) => `$${name}`)
    .join(' ')
}
