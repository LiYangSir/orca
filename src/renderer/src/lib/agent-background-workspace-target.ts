import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../shared/constants'
import type { Repo, Worktree } from '../../../shared/types'

type AgentBackgroundWorkspaceTarget = {
  cwd: string
  isFloatingWorkspace: boolean
  repo: Repo | null
  worktree: Worktree | null
}

export async function markAgentBackgroundWorkspaceTrusted(
  preset: 'cursor' | 'copilot' | 'codex' | undefined,
  workspacePath: string
): Promise<void> {
  if (!preset || !window.api.agentTrust?.markTrusted) {
    return
  }
  try {
    await window.api.agentTrust.markTrusted({ preset, workspacePath })
  } catch {
    // Best-effort: the agent can still ask the user to accept its trust prompt.
  }
}

export async function resolveAgentBackgroundWorkspaceTarget({
  worktreeId,
  worktrees,
  repos,
  floatingTerminalCwd
}: {
  worktreeId: string
  worktrees: readonly Worktree[]
  repos: readonly Repo[]
  floatingTerminalCwd?: string
}): Promise<AgentBackgroundWorkspaceTarget> {
  const isFloatingWorkspace = worktreeId === FLOATING_TERMINAL_WORKTREE_ID
  const worktree = worktrees.find((entry) => entry.id === worktreeId) ?? null
  if (!worktree && !isFloatingWorkspace) {
    throw new Error('The target workspace is no longer available.')
  }
  const repo = worktree ? (repos.find((entry) => entry.id === worktree.repoId) ?? null) : null
  // Why: global automation sessions need an app-owned, trusted cwd without
  // borrowing the lifecycle or filesystem of any project.
  const cwd = isFloatingWorkspace
    ? await window.api.app.getFloatingTerminalCwd({
        path: floatingTerminalCwd,
        requireTrusted: true
      })
    : worktree!.path
  return { cwd, isFloatingWorkspace, repo, worktree }
}
