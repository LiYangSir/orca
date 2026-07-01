import { describe, expect, it } from 'vitest'
import {
  formatSkillMentions,
  removeSavedSkillFromPresets,
  resolvePresetSkills,
  upsertSavedSkill,
  upsertSkillPreset
} from './skill-library'

describe('skill-library', () => {
  it('upserts saved skills by id and sorts by name', () => {
    const result = upsertSavedSkill(
      [
        {
          id: 'b',
          name: 'zeta',
          description: null,
          providers: ['codex'],
          sourceKind: 'home',
          sourceLabel: 'Codex home',
          rootPath: '/skills',
          directoryPath: '/skills/zeta',
          skillFilePath: '/skills/zeta/SKILL.md',
          fileCount: 1,
          discoveredUpdatedAt: null,
          savedAt: 1,
          updatedAt: 1
        }
      ],
      {
        id: 'a',
        name: 'alpha',
        description: null,
        providers: ['codex'],
        sourceKind: 'home',
        sourceLabel: 'Codex home',
        rootPath: '/skills',
        directoryPath: '/skills/alpha',
        skillFilePath: '/skills/alpha/SKILL.md',
        fileCount: 1,
        discoveredUpdatedAt: null,
        savedAt: 1,
        updatedAt: 1
      }
    )

    expect(result.map((skill) => skill.id)).toEqual(['a', 'b'])
  })

  it('removes a saved skill from every preset membership', () => {
    expect(
      removeSavedSkillFromPresets(
        [
          { id: 'preset-1', name: 'One', skillIds: ['a', 'b'], createdAt: 1, updatedAt: 1 },
          { id: 'preset-2', name: 'Two', skillIds: ['b'], createdAt: 1, updatedAt: 1 }
        ],
        'b'
      )
    ).toEqual([
      { id: 'preset-1', name: 'One', skillIds: ['a'], createdAt: 1, updatedAt: 1 },
      { id: 'preset-2', name: 'Two', skillIds: [], createdAt: 1, updatedAt: 1 }
    ])
  })

  it('upserts presets by id and sorts by name', () => {
    const result = upsertSkillPreset(
      [{ id: 'b', name: 'Zulu', skillIds: [], createdAt: 1, updatedAt: 1 }],
      { id: 'a', name: 'Alpha', skillIds: [], createdAt: 1, updatedAt: 1 }
    )

    expect(result.map((preset) => preset.id)).toEqual(['a', 'b'])
  })

  it('resolves preset skills from the saved skill map', () => {
    const skills = resolvePresetSkills(
      { id: 'preset-1', name: 'Review', skillIds: ['a', 'missing'], createdAt: 1, updatedAt: 1 },
      {
        a: {
          id: 'a',
          name: 'review',
          description: null,
          providers: ['codex'],
          sourceKind: 'home',
          sourceLabel: 'Codex home',
          rootPath: '/skills',
          directoryPath: '/skills/review',
          skillFilePath: '/skills/review/SKILL.md',
          fileCount: 1,
          discoveredUpdatedAt: null,
          savedAt: 1,
          updatedAt: 1
        }
      }
    )

    expect(skills.map((skill) => skill.name)).toEqual(['review'])
  })

  it('formats skill mentions for copy-paste use', () => {
    expect(formatSkillMentions([{ name: 'review' }, { name: 'planner' }])).toBe(
      '$review $planner'
    )
  })
})
