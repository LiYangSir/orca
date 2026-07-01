import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import type {
  DiscoveredSkill,
  SavedSkill,
  SkillDiscoveryResult,
  SkillPreset
} from '../../../../shared/skills'
import { SkillsDashboardTab } from './SkillsDashboardTab'
import { SkillsInstallTab } from './SkillsInstallTab'
import { SkillsMySkillsTab } from './SkillsMySkillsTab'
import { SkillsWorkspacesTab } from './SkillsWorkspacesTab'
import { removeSavedSkillFromPresets, upsertSavedSkill } from './skill-library'
import { skillsPageTabs, type SkillsPageTab } from './skills-page-tabs'

const EMPTY_SKILLS: DiscoveredSkill[] = []

function getTabLabel(tab: SkillsPageTab): string {
  switch (tab) {
    case 'dashboard':
      return translate('auto.components.skills.SkillsPage.5bdcf2c305', 'Dashboard')
    case 'my-skills':
      return translate('auto.components.skills.SkillsPage.fd8be694ec', 'My Skills')
    case 'install':
      return translate('auto.components.skills.SkillsPage.3719319720', 'Install')
    case 'workspaces':
      return translate('auto.components.skills.SkillsPage.7c1f1b1bb0', 'Workspaces')
  }
}

export default function SkillsPage(): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [activeTab, setActiveTab] = useState<SkillsPageTab>('my-skills')
  const [result, setResult] = useState<SkillDiscoveryResult | null>(null)
  const [savedSkills, setSavedSkills] = useState<SavedSkill[]>([])
  const [skillPresets, setSkillPresets] = useState<SkillPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [libraryLoading, setLibraryLoading] = useState(true)

  const loadSkills = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const nextResult = await window.api.skills.discover()
      if (mountedRef.current) {
        setResult(nextResult)
      }
    } catch (error) {
      console.error('Failed to discover skills:', error)
      if (mountedRef.current) {
        toast.error(
          translate('auto.components.skills.SkillsPage.ea72d6185b', 'Could not scan local skills')
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [mountedRef])

  const loadLibrary = useCallback(async (): Promise<void> => {
    setLibraryLoading(true)
    try {
      const [nextSavedSkills, nextPresets] = await Promise.all([
        window.api.skills.listSaved(),
        window.api.skills.listPresets()
      ])
      if (mountedRef.current) {
        setSavedSkills(nextSavedSkills)
        setSkillPresets(nextPresets)
      }
    } catch (error) {
      console.error('Failed to load skill library:', error)
      if (mountedRef.current) {
        toast.error(
          translate('auto.components.skills.SkillsPage.3ffd35b491', 'Could not load skill library')
        )
      }
    } finally {
      if (mountedRef.current) {
        setLibraryLoading(false)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void Promise.all([loadSkills(), loadLibrary()])
  }, [loadLibrary, loadSkills])

  const skills = result?.skills ?? EMPTY_SKILLS
  const savedSkillIds = useMemo(() => new Set(savedSkills.map((skill) => skill.id)), [savedSkills])
  const isBusy = loading || libraryLoading

  const refreshAll = (): void => {
    void Promise.all([loadSkills(), loadLibrary()])
  }

  const toggleSavedSkill = async (skill: DiscoveredSkill): Promise<void> => {
    try {
      if (savedSkillIds.has(skill.id)) {
        await window.api.skills.remove({ skillId: skill.id })
        setSavedSkills((current) => current.filter((entry) => entry.id !== skill.id))
        setSkillPresets((current) => removeSavedSkillFromPresets(current, skill.id))
        toast.success(
          translate('auto.components.skills.SkillsPage.c4d59090b3', 'Removed from My Skills'),
          { description: skill.name }
        )
        return
      }

      const saved = await window.api.skills.save({ skill })
      setSavedSkills((current) => upsertSavedSkill(current, saved))
      toast.success(
        translate('auto.components.skills.SkillsPage.c59d9f0cc1', 'Saved to My Skills'),
        { description: skill.name }
      )
    } catch (error) {
      toast.error(
        translate('auto.components.skills.SkillsPage.929e3eb91b', 'Could not update saved skills'),
        {
          description: error instanceof Error ? error.message : String(error)
        }
      )
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SkillsPageTab)}
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-1.5">
          <span className="text-xs font-medium text-foreground/70">
            {translate('auto.components.skills.SkillsPage.f43ad6edf3', 'Skills')}
            <span className="ml-2 text-foreground/40">{skills.length}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-foreground/60 hover:text-foreground"
            disabled={isBusy}
            onClick={refreshAll}
          >
            <RefreshCw className={isBusy ? 'size-3.5 animate-spin' : 'size-3.5'} />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border/50 px-4 py-2">
          <TabsList variant="line" className="h-auto justify-start gap-1">
            {skillsPageTabs.map(({ id, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="h-7 gap-1.5 px-3 py-1 text-xs">
                <Icon className="size-3.5" />
                {getTabLabel(id)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <TabsContent value="dashboard" className="m-0 h-full overflow-auto">
            <SkillsDashboardTab
              skills={skills}
              savedCount={savedSkills.length}
              presetCount={skillPresets.length}
              sources={result?.sources ?? []}
              onSelectTab={setActiveTab}
            />
          </TabsContent>
          <TabsContent value="my-skills" className="m-0 h-full overflow-hidden">
            <SkillsMySkillsTab
              skills={skills}
              savedSkills={savedSkills}
              savedSkillIds={savedSkillIds}
              loading={loading}
              onRefresh={refreshAll}
              onToggleSaved={(nextSkill) => {
                void toggleSavedSkill(nextSkill)
              }}
            />
          </TabsContent>
          <TabsContent value="install" className="m-0 h-full overflow-hidden">
            <SkillsInstallTab loading={loading} onScanInstalled={refreshAll} />
          </TabsContent>
          <TabsContent value="workspaces" className="m-0 h-full overflow-auto">
            <SkillsWorkspacesTab skills={skills} sources={result?.sources ?? []} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
