import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { SkillSourceType } from '../../../../shared/skills'
import type { SkillsPageTab, SkillsInstallTab } from '../../components/skills/skills-page-tabs'
import type { SkillsViewMode } from '../../components/skills/skills-view-constants'

export type SkillsViewSlice = {
  skillsViewActiveTab: SkillsPageTab
  skillsViewMode: SkillsViewMode
  skillsViewSelectedSkillId: string | null
  skillsViewSearch: string
  skillsViewFilterSourceKind: SkillSourceType | null
  skillsViewFilterTags: string[]
  skillsViewInstallTab: SkillsInstallTab

  setSkillsViewActiveTab: (tab: SkillsPageTab) => void
  setSkillsViewMode: (mode: SkillsViewMode) => void
  setSkillsViewSelectedSkillId: (id: string | null) => void
  setSkillsViewSearch: (query: string) => void
  setSkillsViewFilterSourceKind: (kind: SkillSourceType | null) => void
  setSkillsViewFilterTags: (tags: string[]) => void
  setSkillsViewInstallTab: (tab: SkillsInstallTab) => void
  clearSkillsViewFilters: () => void
}

export const createSkillsViewSlice: StateCreator<AppState, [], [], SkillsViewSlice> = (set) => ({
  skillsViewActiveTab: 'my-skills',
  skillsViewMode: 'grid',
  skillsViewSelectedSkillId: null,
  skillsViewSearch: '',
  skillsViewFilterSourceKind: null,
  skillsViewFilterTags: [],
  skillsViewInstallTab: 'market',

  setSkillsViewActiveTab: (tab) => set({ skillsViewActiveTab: tab }),
  setSkillsViewMode: (mode) => set({ skillsViewMode: mode }),
  setSkillsViewSelectedSkillId: (id) => set({ skillsViewSelectedSkillId: id }),
  setSkillsViewSearch: (query) => set({ skillsViewSearch: query }),
  setSkillsViewFilterSourceKind: (kind) => set({ skillsViewFilterSourceKind: kind }),
  setSkillsViewFilterTags: (tags) => set({ skillsViewFilterTags: tags }),
  setSkillsViewInstallTab: (tab) => set({ skillsViewInstallTab: tab }),
  clearSkillsViewFilters: () =>
    set({
      skillsViewSearch: '',
      skillsViewFilterSourceKind: null,
      skillsViewFilterTags: []
    })
})
