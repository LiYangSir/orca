import { describe, expect, it } from 'vitest'
import type { SavedSkill, SkillPreset } from '../../shared/skills'
import type { PersistedState } from '../../shared/types'
import {
  listSavedSkills,
  listSkillPresets,
  removeSavedSkill,
  removeSkillPreset,
  saveSkill,
  saveSkillPreset
} from './skill-library-persistence'

function makeState(): Pick<PersistedState, 'savedSkillsById' | 'skillPresets'> {
  return {
    savedSkillsById: {},
    skillPresets: []
  }
}

function makeSkill(id: string, name: string): SavedSkill {
  return {
    id,
    name,
    description: null,
    providers: ['codex'],
    sourceKind: 'home',
    sourceLabel: 'Home',
    rootPath: '/skills',
    directoryPath: `/skills/${id}`,
    skillFilePath: `/skills/${id}/SKILL.md`,
    fileCount: 1,
    discoveredUpdatedAt: null,
    savedAt: 1,
    updatedAt: 2
  }
}

function makePreset(id: string, name: string, skillIds: string[]): SkillPreset {
  return {
    id,
    name,
    skillIds,
    createdAt: 1,
    updatedAt: 2
  }
}

describe('skill-library-persistence', () => {
  it('saves and lists skills sorted by name', () => {
    const state = makeState()

    saveSkill(state, makeSkill('beta', 'Beta'))
    saveSkill(state, makeSkill('alpha', 'Alpha'))

    expect(listSavedSkills(state).map((skill) => skill.id)).toEqual(['alpha', 'beta'])
  })

  it('removes saved skills from presets', () => {
    const state = makeState()
    saveSkill(state, makeSkill('alpha', 'Alpha'))
    state.skillPresets = [makePreset('preset', 'Preset', ['alpha', 'missing'])]

    expect(removeSavedSkill(state, 'alpha')).toBe(true)

    expect(state.savedSkillsById.alpha).toBeUndefined()
    expect(state.skillPresets[0]?.skillIds).toEqual(['missing'])
  })

  it('upserts and removes presets', () => {
    const state = makeState()

    saveSkillPreset(state, makePreset('p2', 'Beta', ['b']))
    saveSkillPreset(state, makePreset('p1', 'Alpha', ['a']))
    saveSkillPreset(state, makePreset('p1', 'Alpha updated', ['a', 'b']))

    expect(listSkillPresets(state).map((preset) => preset.name)).toEqual(['Alpha updated', 'Beta'])
    expect(removeSkillPreset(state, 'p1')).toBe(true)
    expect(removeSkillPreset(state, 'missing')).toBe(false)
    expect(state.skillPresets.map((preset) => preset.id)).toEqual(['p2'])
  })
})
