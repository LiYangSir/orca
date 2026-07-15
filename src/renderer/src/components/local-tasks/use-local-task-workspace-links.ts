import { useCallback, useMemo } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useAllWorktrees } from '@/store/selectors'
import { folderWorkspaceToWorktree } from '../../../../shared/folder-workspace-worktree'
import type { LocalTask } from '../../../../shared/local-task-types'
import type { Worktree } from '../../../../shared/types'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'

export function collectDeletedTaskIds(
  tasks: readonly LocalTask[],
  rootTaskId: string
): Set<string> {
  const deletedIds = new Set([rootTaskId])
  const queue = [rootTaskId]
  while (queue.length > 0) {
    const parentId = queue.pop()
    if (!parentId) {
      continue
    }
    for (const task of tasks) {
      if (task.parentId === parentId && !deletedIds.has(task.id)) {
        deletedIds.add(task.id)
        queue.push(task.id)
      }
    }
  }
  return deletedIds
}

export function useLocalTaskWorkspaceLinks(selectedTaskId: string | null): {
  linkableWorktrees: Worktree[]
  linkedWorkspaces: Worktree[]
  linkWorktree: (taskId: string, worktreeId: string) => Promise<void>
  unlinkWorkspace: (workspaceId: string) => Promise<void>
  clearTaskTreeLinks: (tasks: readonly LocalTask[], rootTaskId: string) => Promise<void>
} {
  const allWorktrees = useAllWorktrees()
  const folderWorkspaces = useAppStore((store) => store.folderWorkspaces)
  const updateWorktreeMeta = useAppStore((store) => store.updateWorktreeMeta)
  const updateFolderWorkspace = useAppStore((store) => store.updateFolderWorkspace)
  const allTaskWorkspaces = useMemo(
    () => [
      ...allWorktrees,
      ...folderWorkspaces.map((workspace) => folderWorkspaceToWorktree(workspace))
    ],
    [allWorktrees, folderWorkspaces]
  )
  const linkedWorkspaces = useMemo(
    () =>
      selectedTaskId
        ? allTaskWorkspaces.filter(
            (workspace) => workspace.linkedLocalTask === selectedTaskId && !workspace.isArchived
          )
        : [],
    [allTaskWorkspaces, selectedTaskId]
  )

  const linkWorktree = useCallback(
    async (taskId: string, worktreeId: string): Promise<void> => {
      await updateWorktreeMeta(worktreeId, { linkedLocalTask: taskId })
    },
    [updateWorktreeMeta]
  )
  const unlinkWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      const workspaceScope = parseWorkspaceKey(workspaceId)
      if (workspaceScope?.type === 'folder') {
        const updated = await updateFolderWorkspace(workspaceScope.folderWorkspaceId, {
          linkedTask: null
        })
        if (!updated) {
          throw new Error(
            translate(
              'auto.components.LocalTaskWorkspaces.unlinkFailed',
              'Failed to unlink workspace.'
            )
          )
        }
        return
      }
      await updateWorktreeMeta(workspaceId, { linkedLocalTask: null })
    },
    [updateFolderWorkspace, updateWorktreeMeta]
  )
  const clearTaskTreeLinks = useCallback(
    async (tasks: readonly LocalTask[], rootTaskId: string): Promise<void> => {
      const deletedTaskIds = collectDeletedTaskIds(tasks, rootTaskId)
      // Why: a disconnected SSH host must not make a local task undeletable;
      // clear every reachable link while tolerating individual host failures.
      await Promise.allSettled([
        ...allWorktrees
          .filter(
            (worktree) => worktree.linkedLocalTask && deletedTaskIds.has(worktree.linkedLocalTask)
          )
          .map((worktree) => updateWorktreeMeta(worktree.id, { linkedLocalTask: null })),
        ...folderWorkspaces
          .filter(
            (workspace) =>
              workspace.linkedTask?.provider === 'local' &&
              Boolean(
                workspace.linkedTask.localIdentifier &&
                deletedTaskIds.has(workspace.linkedTask.localIdentifier)
              )
          )
          .map((workspace) => updateFolderWorkspace(workspace.id, { linkedTask: null }))
      ])
    },
    [allWorktrees, folderWorkspaces, updateFolderWorkspace, updateWorktreeMeta]
  )

  return {
    linkableWorktrees: allWorktrees,
    linkedWorkspaces,
    linkWorktree,
    unlinkWorkspace,
    clearTaskTreeLinks
  }
}
