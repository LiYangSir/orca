import { useMemo, useState } from 'react'
import { FolderOpen, GitBranch, Link2, Server, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { useRepoMap } from '@/store/selectors'
import WorktreeCardAgents from '@/components/sidebar/WorktreeCardAgents'
import { useWorktreeAgentRows } from '@/components/sidebar/useWorktreeAgentRows'
import { WorktreeActivityStatusIndicator } from '@/components/sidebar/WorktreeActivityStatusIndicator'
import { branchDisplayName } from '@/components/sidebar/WorktreeCardHelpers'
import type { LocalTask } from '../../../../shared/local-task-types'
import type { Worktree } from '../../../../shared/types'
import {
  getRuntimePathBasename,
  normalizeRuntimePathForComparison
} from '../../../../shared/cross-platform-path'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'

export function LocalTaskWorkspaces({
  task,
  linkedWorktrees,
  allWorktrees,
  onLink,
  onUnlink
}: {
  task: LocalTask
  linkedWorktrees: Worktree[]
  allWorktrees: Worktree[]
  onLink: (worktreeId: string) => Promise<void>
  onUnlink: (worktreeId: string) => Promise<void>
}): React.JSX.Element {
  return (
    <section className="mt-12 border-t border-border/60 pt-9">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          {translate('auto.components.LocalTaskWorkspaces.title', 'Workspaces')}
          {linkedWorktrees.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {linkedWorktrees.length}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          <WorktreeLinkPicker
            task={task}
            linkedWorktrees={linkedWorktrees}
            allWorktrees={allWorktrees}
            onLink={onLink}
          />
        </div>
      </div>

      {linkedWorktrees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          {translate(
            'auto.components.LocalTaskWorkspaces.empty',
            'Link a workspace to see its agent activity here.'
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {linkedWorktrees.map((worktree) => (
            <LinkedWorktreeActivity key={worktree.id} worktree={worktree} onUnlink={onUnlink} />
          ))}
        </div>
      )}
    </section>
  )
}

function LinkedWorktreeActivity({
  worktree,
  onUnlink
}: {
  worktree: Worktree
  onUnlink: (worktreeId: string) => Promise<void>
}): React.JSX.Element {
  const repo = useRepoMap().get(worktree.repoId)
  const agents = useWorktreeAgentRows(worktree.id)
  const isFolderWorkspace = parseWorkspaceKey(worktree.id)?.type === 'folder'
  const [unlinking, setUnlinking] = useState(false)

  const handleUnlink = async (): Promise<void> => {
    // Why: metadata writes may cross SSH; prevent duplicate unlink requests
    // while the first host operation is still in flight.
    setUnlinking(true)
    try {
      await onUnlink(worktree.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <article className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs">
      <div className="flex items-start gap-3 border-b border-border/50 px-3 py-2.5">
        <button
          type="button"
          onClick={() => activateAndRevealWorktree(worktree.id)}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <WorktreeActivityStatusIndicator worktreeId={worktree.id} className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              {worktree.displayName}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {isFolderWorkspace ? (
                <>
                  <FolderOpen className="size-3" />
                  <span className="truncate">
                    {getRuntimePathBasename(worktree.path) || worktree.path}
                  </span>
                </>
              ) : (
                <>
                  {repo?.connectionId ? <Server className="size-3" /> : null}
                  <span className="truncate">{repo?.displayName ?? worktree.repoId}</span>
                  <span aria-hidden="true">·</span>
                  <GitBranch className="size-3" />
                  <span className="truncate">{branchDisplayName(worktree.branch)}</span>
                </>
              )}
            </div>
          </div>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={unlinking}
              aria-label={translate(
                'auto.components.LocalTaskWorkspaces.unlink',
                'Unlink workspace'
              )}
              onClick={() => void handleUnlink()}
            >
              <Unlink className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {translate('auto.components.LocalTaskWorkspaces.unlink', 'Unlink workspace')}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="px-3 py-2.5">
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
          {translate('auto.components.LocalTaskWorkspaces.agentActivity', 'Agent activity')}
        </div>
        {agents.length > 0 ? (
          <WorktreeCardAgents worktreeId={worktree.id} agents={agents} className="mt-0" />
        ) : (
          <p className="py-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.LocalTaskWorkspaces.noAgentActivity',
              'No agent activity yet.'
            )}
          </p>
        )}
      </div>
    </article>
  )
}

function WorktreeLinkPicker({
  task,
  linkedWorktrees,
  allWorktrees,
  onLink
}: {
  task: LocalTask
  linkedWorktrees: Worktree[]
  allWorktrees: Worktree[]
  onLink: (worktreeId: string) => Promise<void>
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const repoMap = useRepoMap()
  const linkedIds = useMemo(
    () => new Set(linkedWorktrees.map((worktree) => worktree.id)),
    [linkedWorktrees]
  )
  const candidates = useMemo(
    () =>
      allWorktrees
        .filter((worktree) => {
          if (
            worktree.isArchived ||
            worktree.isBare ||
            worktree.linkedLocalTask ||
            linkedIds.has(worktree.id)
          ) {
            return false
          }
          const repoPath = repoMap.get(worktree.repoId)?.path
          return (
            !task.repoPath ||
            Boolean(
              repoPath &&
              normalizeRuntimePathForComparison(repoPath) ===
                normalizeRuntimePathForComparison(task.repoPath)
            )
          )
        })
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt),
    [allWorktrees, linkedIds, repoMap, task.repoPath]
  )

  const handleLink = async (worktreeId: string): Promise<void> => {
    setLinkingId(worktreeId)
    try {
      await onLink(worktreeId)
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="xs">
          <Link2 className="size-3" />
          {translate('auto.components.LocalTaskWorkspaces.link', 'Link existing')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.LocalTaskWorkspaces.search',
              'Search workspaces...'
            )}
          />
          <CommandList>
            <CommandEmpty>
              {translate(
                'auto.components.LocalTaskWorkspaces.noCandidates',
                'No available workspaces for this project.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {candidates.map((worktree) => {
                const repo = repoMap.get(worktree.repoId)
                return (
                  <CommandItem
                    key={worktree.id}
                    value={`${worktree.displayName} ${branchDisplayName(worktree.branch)} ${repo?.displayName ?? ''}`}
                    disabled={linkingId !== null}
                    onSelect={() => void handleLink(worktree.id)}
                  >
                    <WorktreeActivityStatusIndicator worktreeId={worktree.id} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{worktree.displayName}</div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{repo?.displayName ?? worktree.repoId}</span>
                        <span aria-hidden="true">·</span>
                        <GitBranch className="size-3" />
                        <span className="truncate">{branchDisplayName(worktree.branch)}</span>
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
