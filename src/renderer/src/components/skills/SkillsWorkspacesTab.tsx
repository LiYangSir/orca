import { Bot, ChevronDown, ChevronRight, Circle, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { translate } from '@/i18n/i18n'
import type { DiscoveredSkill, SkillDiscoverySource } from '../../../../shared/skills'
import { sourceLabels } from './skill-display-labels'

type SkillsWorkspacesTabProps = {
  skills: DiscoveredSkill[]
  sources: SkillDiscoverySource[]
}

export function SkillsWorkspacesTab({
  skills,
  sources
}: SkillsWorkspacesTabProps): React.JSX.Element {
  const sourcesByKind = sources.reduce<
    Record<SkillDiscoverySource['sourceKind'], SkillDiscoverySource[]>
  >(
    (groups, source) => {
      groups[source.sourceKind].push(source)
      return groups
    },
    { home: [], repo: [], bundled: [], plugin: [] }
  )

  return (
    <div className="space-y-5 p-4">
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.skills.SkillsWorkspacesTab.9c95e1ce91', 'Agents')}
        </p>
        <div className="space-y-0.5">
          {(['codex', 'claude', 'agent-skills'] as const).map((provider) => {
            const syncedSkills = skills.filter((skill) => skill.providers.includes(provider))
            return (
              <AgentProviderRow
                key={provider}
                label={
                  provider === 'agent-skills'
                    ? translate(
                        'auto.components.skills.SkillsWorkspacesTab.38e0951c3a',
                        'Agent Skills'
                      )
                    : provider
                }
                skillNames={syncedSkills.map((skill) => skill.name)}
              />
            )
          })}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.skills.SkillsWorkspacesTab.7c1f1b1bb0', 'Workspaces')}
        </p>
        <div className="space-y-0.5">
          {Object.entries(sourcesByKind).map(([kind, kindSources]) => (
            <WorkspaceSourceGroup
              key={kind}
              title={sourceLabels[kind as SkillDiscoverySource['sourceKind']]}
              sources={kindSources}
              skillCount={skills.filter((skill) => skill.sourceKind === kind).length}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function AgentProviderRow({
  label,
  skillNames
}: {
  label: string
  skillNames: string[]
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/40"
        >
          <Bot className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium capitalize">{label}</span>
          <Circle
            className={
              skillNames.length > 0
                ? 'size-2 shrink-0 fill-current text-muted-foreground'
                : 'size-2 shrink-0 fill-current text-muted-foreground/35'
            }
          />
          <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
            {skillNames.length}
          </Badge>
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 space-y-0.5 pb-1">
          {skillNames.length > 0 ? (
            skillNames.map((name) => (
              <div key={name} className="rounded-lg px-3 py-1.5 text-xs">
                {name}
              </div>
            ))
          ) : (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">
              {translate(
                'auto.components.skills.SkillsWorkspacesTab.928034308a',
                'No skills synced'
              )}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function WorkspaceSourceGroup({
  title,
  sources,
  skillCount
}: {
  title: string
  sources: SkillDiscoverySource[]
  skillCount: number
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border/60">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
          {skillCount}
        </Badge>
      </div>
      <div className="border-t border-border/40 px-3 py-2">
        {sources.length > 0 ? (
          <div className="space-y-1.5">
            {sources.map((source) => (
              <div key={source.id} className="flex min-w-0 items-center gap-2 text-xs">
                <Circle
                  className={
                    source.exists
                      ? 'size-2 shrink-0 fill-current text-muted-foreground'
                      : 'size-2 shrink-0 fill-current text-muted-foreground/35'
                  }
                />
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                  {source.path}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.skills.SkillsWorkspacesTab.a48b40a635',
              'No source paths registered.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
