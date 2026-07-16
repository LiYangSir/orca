import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  collectLocalTaskAgentActivityCounts,
  LocalTaskAgentActivityIndicator
} from './local-task-agent-activity'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, values?: Record<string, unknown>) =>
    fallback.replace('{{value0}}', String(values?.value0 ?? ''))
}))

describe('local task Agent activity', () => {
  it('counts Agent rows across workspaces linked to the same task', () => {
    const counts = collectLocalTaskAgentActivityCounts([
      {
        worktrees: [
          { worktree: { linkedLocalTask: 'task-1' }, agents: [{}, {}] },
          { worktree: { linkedLocalTask: 'task-1' }, agents: [{}] },
          { worktree: { linkedLocalTask: 'task-2' }, agents: [] },
          { worktree: { linkedLocalTask: null }, agents: [{}] }
        ]
      }
    ])

    expect(counts.get('task-1')).toBe(3)
    expect(counts.has('task-2')).toBe(false)
  })

  it('renders a compact count only when Agent activity exists', () => {
    expect(renderToStaticMarkup(<LocalTaskAgentActivityIndicator count={0} />)).toBe('')

    const markup = renderToStaticMarkup(<LocalTaskAgentActivityIndicator count={2} />)
    expect(markup).toContain('aria-label="Agent activity: 2"')
    expect(markup).toContain('>2</span>')
  })
})
