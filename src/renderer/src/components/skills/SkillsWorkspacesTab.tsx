import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bot,
  ChevronDown,
  ChevronRight,
  Circle,
  FolderOpen,
  Loader2,
  Unlink
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { translate } from '@/i18n/i18n'
import type { CentralSkill, ToolInfo } from '../../../../shared/skills'

type SkillsWorkspacesTabProps = {
  skills: CentralSkill[]
  tools: ToolInfo[]
}

function AgentToolCard({
  tool,
  skills
}: {
  tool: ToolInfo
  skills: CentralSkill[]
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  const syncedSkills = skills.filter((s) => s.targets.some((t) => t.tool === tool.key))

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/40"
        >
          <Bot className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{tool.displayName}</span>
          <Circle
            className={`size-2 shrink-0 fill-current ${
              tool.installed && tool.enabled ? 'text-green-500' : 'text-muted-foreground/40'
            }`}
          />
          <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
            {syncedSkills.length}
          </Badge>
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {syncedSkills.length > 0 ? (
          <div className="ml-6 space-y-0.5 pb-1">
            {syncedSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-accent/40"
              >
                <span className="truncate text-xs">{skill.name}</span>
                <Button variant="ghost" size="icon" className="size-6 shrink-0" title="Unsync">
                  <Unlink className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="ml-6 pb-1">
            <p className="px-3 text-xs text-muted-foreground">
              {translate(
                'auto.components.skills.SkillsWorkspacesTab.928034308a',
                'No skills synced'
              )}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function AgentSection({
  tools,
  skills
}: {
  tools: ToolInfo[]
  skills: CentralSkill[]
}): React.JSX.Element {
  if (tools.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        {translate(
          'auto.components.skills.SkillsWorkspacesTab.noAgentTools',
          'No agent tools detected'
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tools.map((tool) => (
        <AgentToolCard key={tool.key} tool={tool} skills={skills} />
      ))}
    </div>
  )
}

type ProjectEntry = {
  id: string
  name: string
  mainRepoPath: string
}

function ProjectsSection(): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const repos = await window.api.repos.list()
        if (cancelled) {
          return
        }
        setProjects(
          repos.map((repo) => ({
            id: repo.id,
            name: repo.displayName || repo.path.split('/').pop() || repo.path,
            mainRepoPath: repo.path
          }))
        )
      } catch {
        if (!cancelled) {
          setProjects([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        {translate('auto.components.skills.SkillsWorkspacesTab.noProjects', 'No projects found')}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent/40"
        >
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">{project.mainRepoPath}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            title={translate(
              'auto.components.skills.SkillsWorkspacesTab.importFromProject',
              'Import from project'
            )}
          >
            <ArrowDownToLine className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            title={translate(
              'auto.components.skills.SkillsWorkspacesTab.pushToProject',
              'Push to project'
            )}
          >
            <ArrowUpFromLine className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}

export function SkillsWorkspacesTab({
  skills,
  tools
}: SkillsWorkspacesTabProps): React.JSX.Element {
  return (
    <div className="space-y-5 p-4">
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.skills.SkillsWorkspacesTab.9c95e1ce91', 'Agents')}
        </p>
        <AgentSection tools={tools} skills={skills} />
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.skills.SkillsWorkspacesTab.7c1f1b1bb0', 'Projects')}
        </p>
        <ProjectsSection />
      </section>
    </div>
  )
}
