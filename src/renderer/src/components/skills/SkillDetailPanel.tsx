import {
  CircleCheck,
  Circle,
  ChevronDown,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { VisuallyHidden } from 'radix-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { CentralSkill, ToolInfo } from '../../../../shared/skills'
import { getAgentIconUrl, hasAgentIcon, shortLabel } from './agent-icons'
import { getSourceColor } from './skills-view-constants'

type SkillDetailPanelProps = {
  skill: CentralSkill | null
  tools?: ToolInfo[]
  onClose: () => void
  onSyncToTool?: (skillId: string, toolKey: string) => void
  onUnsyncFromTool?: (skillId: string, toolKey: string) => void
  onDelete?: (skillId: string) => void
  onCheckUpdate?: (skillId: string) => void
  onReveal?: (path: string) => void
}

function AgentIconImg({
  agentKey,
  className
}: {
  agentKey: string
  className?: string
}): React.JSX.Element | null {
  const src = getAgentIconUrl(agentKey)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return null
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn('h-full w-full object-contain', className)}
      onError={() => setFailed(true)}
    />
  )
}

function AgentToggleButton({
  tool,
  isSynced,
  isPending,
  onToggle
}: {
  tool: ToolInfo
  isSynced: boolean
  isPending: boolean
  onToggle: () => void
}): React.JSX.Element {
  const useIcon = hasAgentIcon(tool.key)

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      className={cn(
        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
        isSynced
          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
          : 'border-border hover:bg-accent/40'
      )}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : isSynced ? (
        <CircleCheck className="size-3.5 text-primary" />
      ) : (
        <Circle className="size-3.5 text-muted-foreground" />
      )}

      {useIcon ? (
        <span className="flex size-4 items-center justify-center overflow-hidden rounded-[3px]">
          <AgentIconImg agentKey={tool.key} />
        </span>
      ) : (
        <span className="flex size-4 items-center justify-center rounded-[3px] bg-muted text-[8px] font-semibold">
          {shortLabel(tool.displayName, tool.key)}
        </span>
      )}

      <span className="flex-1 truncate">{tool.displayName}</span>
    </button>
  )
}

function AgentToggles({
  skill,
  tools,
  onSyncToTool,
  onUnsyncFromTool
}: {
  skill: CentralSkill
  tools: ToolInfo[]
  onSyncToTool?: (skillId: string, toolKey: string) => void
  onUnsyncFromTool?: (skillId: string, toolKey: string) => void
}): React.JSX.Element {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [showUnavailable, setShowUnavailable] = useState(false)

  const syncedKeys = new Set(skill.targets.map((t) => t.tool))
  const activeTools = tools.filter((t) => t.installed && t.enabled)
  const unavailableTools = tools.filter((t) => !t.installed || !t.enabled)
  const syncedCount = activeTools.filter((t) => syncedKeys.has(t.key)).length

  const handleToggle = async (tool: ToolInfo): Promise<void> => {
    if (!onSyncToTool || !onUnsyncFromTool) {
      return
    }
    const isSynced = syncedKeys.has(tool.key)
    setPendingKey(tool.key)
    try {
      if (isSynced) {
        onUnsyncFromTool(skill.id, tool.key)
      } else {
        onSyncToTool(skill.id, tool.key)
      }
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {translate('auto.components.skills.SkillDetailPanel.agents', 'Agents')}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {syncedCount}/{activeTools.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {activeTools.map((tool) => (
          <AgentToggleButton
            key={tool.key}
            tool={tool}
            isSynced={syncedKeys.has(tool.key)}
            isPending={pendingKey === tool.key}
            onToggle={() => void handleToggle(tool)}
          />
        ))}
      </div>

      {unavailableTools.length > 0 && (
        <Collapsible open={showUnavailable} onOpenChange={setShowUnavailable}>
          <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
            <ChevronDown
              className={cn('size-3 transition-transform', !showUnavailable && '-rotate-90')}
            />
            {unavailableTools.length}{' '}
            {translate('auto.components.skills.SkillDetailPanel.unavailable', 'unavailable')}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 grid grid-cols-2 gap-1.5">
            {unavailableTools.map((tool) => (
              <AgentToggleButton
                key={tool.key}
                tool={tool}
                isSynced={false}
                isPending={false}
                onToggle={() => {}}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export function SkillDetailPanel({
  skill,
  tools,
  onClose,
  onSyncToTool,
  onUnsyncFromTool,
  onDelete,
  onCheckUpdate,
  onReveal
}: SkillDetailPanelProps): React.JSX.Element {
  const [document, setDocument] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  const loadDocument = useCallback(async (id: string): Promise<void> => {
    setDocLoading(true)
    try {
      setDocument(await window.api.skills.getDocument({ skillId: id }))
    } catch {
      setDocument(null)
    } finally {
      setDocLoading(false)
    }
  }, [])

  useEffect(() => {
    if (skill) {
      void loadDocument(skill.id)
    } else {
      setDocument(null)
    }
  }, [skill, loadDocument])

  const handleReveal = (): void => {
    if (!skill) {
      return
    }
    if (onReveal) {
      onReveal(skill.centralPath)
    } else {
      void window.api.shell.openInFileManager(skill.centralPath)
    }
  }

  return (
    <Sheet open={skill !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col p-0 sm:max-w-[480px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden.Root asChild>
          <SheetTitle>{skill?.name ?? 'Skill'}</SheetTitle>
        </VisuallyHidden.Root>
        <VisuallyHidden.Root asChild>
          <SheetDescription>Skill detail drawer</SheetDescription>
        </VisuallyHidden.Root>

        {skill && (
          <>
            <div className="flex-none border-b border-border/50 px-5 py-3.5">
              <h2 className="truncate text-sm font-semibold">{skill.name}</h2>
              {skill.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>
              )}
            </div>

            <div className="scrollbar-sleek flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <DetailSection
                  label={translate('auto.components.skills.SkillDetailPanel.source', 'Source')}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="h-4 px-1.5 text-[9px]"
                      style={{ borderColor: getSourceColor(skill.sourceType) }}
                    >
                      {skill.sourceType}
                    </Badge>
                    {skill.sourceRef && (
                      <span className="truncate text-xs text-muted-foreground">
                        {skill.sourceRef}
                      </span>
                    )}
                  </div>
                  {skill.sourceBranch && (
                    <p className="text-[11px] text-muted-foreground">
                      branch: {skill.sourceBranch}
                    </p>
                  )}
                  {skill.sourceRevision && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {skill.sourceRevision.slice(0, 12)}
                    </p>
                  )}
                </DetailSection>

                {skill.tags && skill.tags.length > 0 && (
                  <DetailSection
                    label={translate('auto.components.skills.SkillDetailPanel.tags', 'Tags')}
                  >
                    <div className="flex flex-wrap gap-1">
                      {skill.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </DetailSection>
                )}

                <DetailSection
                  label={translate('auto.components.skills.SkillDetailPanel.path', 'Path')}
                >
                  <p
                    className="truncate font-mono text-[11px] text-muted-foreground"
                    title={skill.centralPath}
                  >
                    {skill.centralPath}
                  </p>
                </DetailSection>

                <Separator />

                {tools && tools.length > 0 && (
                  <AgentToggles
                    skill={skill}
                    tools={tools}
                    onSyncToTool={onSyncToTool}
                    onUnsyncFromTool={onUnsyncFromTool}
                  />
                )}

                {document && (
                  <>
                    <Separator />
                    <DetailSection label="SKILL.md">
                      <CommentMarkdown
                        content={document}
                        variant="document"
                        className="scrollbar-sleek max-h-[500px] overflow-auto rounded-md bg-muted/30 p-3 text-xs leading-relaxed"
                      />
                    </DetailSection>
                  </>
                )}
                {docLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border/50 px-5 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete?.(skill.id)}
              >
                <Trash2 className="size-3" />
                {translate('auto.components.skills.SkillDetailPanel.delete', 'Delete')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => onCheckUpdate?.(skill.id)}
              >
                <RefreshCw className="size-3" />
                {translate('auto.components.skills.SkillDetailPanel.update', 'Update')}
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleReveal}
              >
                <FolderOpen className="size-3" />
                {translate('auto.components.skills.SkillDetailPanel.reveal', 'Reveal')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </section>
  )
}
