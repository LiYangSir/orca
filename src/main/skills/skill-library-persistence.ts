import type { SavedSkill, SkillPreset } from '../../shared/skills'
import type { PersistedState } from '../../shared/types'

type SkillLibraryState = Pick<PersistedState, 'savedSkillsById' | 'skillPresets'>

export function listSavedSkills(state: SkillLibraryState): SavedSkill[] {
  return Object.values(state.savedSkillsById ?? {}).sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}

export function saveSkill(state: SkillLibraryState, skill: SavedSkill): SavedSkill {
  state.savedSkillsById = {
    ...state.savedSkillsById,
    [skill.id]: skill
  }
  return skill
}

export function removeSavedSkill(state: SkillLibraryState, skillId: string): boolean {
  if (!state.savedSkillsById[skillId]) {
    return false
  }
  const nextSavedSkillsById = { ...state.savedSkillsById }
  delete nextSavedSkillsById[skillId]
  state.savedSkillsById = nextSavedSkillsById
  state.skillPresets = (state.skillPresets ?? []).map((preset) => ({
    ...preset,
    skillIds: preset.skillIds.filter((entry) => entry !== skillId)
  }))
  return true
}

export function listSkillPresets(state: SkillLibraryState): SkillPreset[] {
  return [...(state.skillPresets ?? [])].sort((left, right) => left.name.localeCompare(right.name))
}

export function saveSkillPreset(state: SkillLibraryState, preset: SkillPreset): SkillPreset {
  const existing = state.skillPresets ?? []
  const index = existing.findIndex((entry) => entry.id === preset.id)
  state.skillPresets =
    index === -1 ? [...existing, preset] : existing.map((entry, i) => (i === index ? preset : entry))
  return preset
}

export function removeSkillPreset(state: SkillLibraryState, presetId: string): boolean {
  const existing = state.skillPresets ?? []
  const nextPresets = existing.filter((entry) => entry.id !== presetId)
  if (nextPresets.length === existing.length) {
    return false
  }
  state.skillPresets = nextPresets
  return true
}
