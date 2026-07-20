import { describe, expect, it } from 'vitest'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../shared/constants'
import type { AutomationRun } from '../../../../shared/automations-types'
import { getAutomationRunWorkspaceDisplay } from './automation-run-workspace-display'

function makeRun(): AutomationRun {
  return {
    id: 'run-1',
    automationId: 'automation-1',
    title: 'Weekly report #1',
    scheduledFor: 1,
    status: 'completed',
    trigger: 'scheduled',
    workspaceId: FLOATING_TERMINAL_WORKTREE_ID,
    workspaceDisplayName: '浮动工作区',
    sessionKind: 'terminal',
    chatSessionId: null,
    terminalSessionId: 'tab-1',
    terminalPaneKey: 'tab-1:leaf-1',
    terminalPtyId: 'pty-1',
    outputSnapshot: null,
    precheckResult: null,
    usage: null,
    error: null,
    startedAt: 1,
    dispatchedAt: 1,
    createdAt: 1
  }
}

describe('getAutomationRunWorkspaceDisplay', () => {
  it('keeps the global floating workspace available without a project worktree', () => {
    expect(getAutomationRunWorkspaceDisplay({ run: makeRun(), worktree: null })).toEqual({
      rowLabel: 'Floating Workspace',
      detailLabel: 'Floating Workspace',
      muted: false,
      title: 'Floating Workspace'
    })
  })
})
