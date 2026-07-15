import { useEffect, useMemo, useState } from 'react'
import { ListChecks, LoaderCircle, Plus } from 'lucide-react'
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
import { translate } from '@/i18n/i18n'
import type { LocalTask } from '../../../../shared/local-task-types'
import {
  getRuntimePathBasename,
  normalizeRuntimePathForComparison
} from '../../../../shared/cross-platform-path'
import { getStatusLabel } from '@/components/local-tasks/local-task-status-priority'

type LocalTaskListResult = { ok: true; data: LocalTask[] } | { ok: false; error: string }

export function LocalTaskLinkPicker({
  repoPath,
  onSelect
}: {
  repoPath: string | null
  onSelect: (task: LocalTask) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    if (!window.api?.localTasks) {
      setTasks([])
      setLoading(false)
      setError(
        translate(
          'auto.components.new.workspace.LocalTaskLinkPicker.unavailable',
          'Local tasks are not available in this session.'
        )
      )
      return
    }
    void (window.api.localTasks.list() as Promise<LocalTaskListResult>)
      .then((result) => {
        if (cancelled) {
          return
        }
        if (!result.ok) {
          setTasks([])
          setError(result.error)
          return
        }
        setTasks(result.data)
      })
      .catch((cause) => {
        if (!cancelled) {
          setTasks([])
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const availableTasks = useMemo(() => {
    const normalizedRepoPath = repoPath ? normalizeRuntimePathForComparison(repoPath) : null
    return tasks
      .filter(
        (task) =>
          !task.archivedAt &&
          (!normalizedRepoPath ||
            !task.repoPath ||
            normalizeRuntimePathForComparison(task.repoPath) === normalizedRepoPath)
      )
      .sort((a, b) => {
        const aMatches =
          normalizedRepoPath && a.repoPath
            ? Number(normalizeRuntimePathForComparison(a.repoPath) === normalizedRepoPath)
            : 0
        const bMatches =
          normalizedRepoPath && b.repoPath
            ? Number(normalizeRuntimePathForComparison(b.repoPath) === normalizedRepoPath)
            : 0
        return bMatches - aMatches || b.updatedAt - a.updatedAt
      })
  }, [repoPath, tasks])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 px-1.5 text-muted-foreground"
        >
          <Plus className="size-3" />
          {translate(
            'auto.components.new.workspace.LocalTaskLinkPicker.linkLocalTask',
            'Link local task'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.new.workspace.LocalTaskLinkPicker.searchPlaceholder',
              'Search local tasks...'
            )}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                {translate(
                  'auto.components.new.workspace.LocalTaskLinkPicker.loading',
                  'Loading tasks...'
                )}
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {error ??
                    translate(
                      'auto.components.new.workspace.LocalTaskLinkPicker.empty',
                      'No matching local tasks.'
                    )}
                </CommandEmpty>
                <CommandGroup>
                  {availableTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`${task.title} ${task.id} ${task.repoPath ?? ''}`}
                      onSelect={() => {
                        onSelect(task)
                        setOpen(false)
                      }}
                    >
                      <ListChecks className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{task.title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {(task.repoPath && getRuntimePathBasename(task.repoPath)) ||
                            translate(
                              'auto.components.new.workspace.LocalTaskLinkPicker.noProject',
                              'No project'
                            )}
                          {' · '}
                          {getStatusLabel(task.status)}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
