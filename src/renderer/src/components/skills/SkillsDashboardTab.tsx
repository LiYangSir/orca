import { Download, Search, WandSparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type { CentralSkill, ToolInfo } from '../../../../shared/skills'
import type { SkillsPageTab } from './skills-page-tabs'

type SkillsDashboardTabProps = {
  skills: CentralSkill[]
  tools: ToolInfo[]
  onSelectTab: (tab: SkillsPageTab) => void
}

export function SkillsDashboardTab({
  skills,
  tools,
  onSelectTab
}: SkillsDashboardTabProps): React.JSX.Element {
  const syncedCount = skills.reduce((sum, s) => sum + s.targets.length, 0)
  const agentCount = tools.filter((t) => t.installed && t.enabled).length
  const recentSkills = [...skills]
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {[
          {
            label: translate('auto.components.skills.SkillsDashboardTab.f43ad6edf3', 'Skills'),
            value: skills.length
          },
          {
            label: translate('auto.components.skills.SkillsDashboardTab.synced', 'Synced'),
            value: syncedCount
          },
          {
            label: translate('auto.components.skills.SkillsDashboardTab.agents', 'Agents'),
            value: agentCount
          }
        ].map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
        <div className="min-w-3 flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onSelectTab('install')}
        >
          <Download className="size-3.5" />
          {translate('auto.components.skills.SkillsDashboardTab.3719319720', 'Install')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onSelectTab('my-skills')}
        >
          <Search className="size-3.5" />
          {translate('auto.components.skills.SkillsDashboardTab.6fe75e9d2d', 'Browse')}
        </Button>
      </div>

      {recentSkills.length > 0 ? (
        <section>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {translate('auto.components.skills.SkillsDashboardTab.8fd13a594d', 'Recent')}
          </p>
          <div className="space-y-0.5">
            {recentSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <WandSparkles className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{skill.name}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{skill.sourceType}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="mb-3 size-10 text-muted-foreground/40" />
          <p className="mb-4 text-sm text-muted-foreground">
            {translate(
              'auto.components.skills.SkillsDashboardTab.6693801333',
              'No skills installed yet'
            )}
          </p>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onSelectTab('install')}>
            <Download className="size-3.5" />
            {translate(
              'auto.components.skills.SkillsDashboardTab.b62aa8a171',
              'Install Your First Skill'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
