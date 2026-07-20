import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Automation } from '../../shared/automations-types'
import type { HostedReviewInfo } from '../../shared/hosted-review'
import type { Repo, Worktree } from '../../shared/types'
import { buildHeadlessWeeklyReportPrompt } from './weekly-report-context'

describe('headless weekly report context', () => {
  it('collects weekly commits and hosted-review evidence before launching the agent', async () => {
    const repoPath = path.join('srv', 'orca')
    const repo = {
      id: 'repo-1',
      path: repoPath,
      displayName: 'Orca',
      badgeColor: 'blue',
      addedAt: 1,
      kind: 'git'
    } as Repo
    const worktree = {
      id: 'worktree-1',
      repoId: repo.id,
      path: repoPath,
      displayName: 'Weekly report',
      branch: 'feature/weekly-report',
      head: 'abc12345',
      comment: '',
      linkedIssue: null,
      linkedPR: 17,
      linkedLinearIssue: null,
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: Date.UTC(2026, 6, 16, 8)
    } as Worktree
    const runtime = {
      listRepos: vi.fn(() => [repo]),
      listManagedWorktrees: vi.fn().mockResolvedValue({
        worktrees: [worktree],
        totalCount: 1,
        truncated: false
      }),
      getRuntimeGitHistory: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'abc123456789',
            displayId: 'abc12345',
            subject: 'Add weekly reports',
            author: 'Li Yang',
            timestamp: Date.UTC(2026, 6, 15, 8)
          }
        ]
      }),
      getHostedReviewForBranch: vi.fn().mockResolvedValue({
        provider: 'github',
        number: 17,
        title: 'Add weekly reports',
        state: 'open',
        url: 'https://github.com/example/orca/pull/17'
      } as HostedReviewInfo)
    }

    const prompt = await buildHeadlessWeeklyReportPrompt({
      runtime: runtime as never,
      automation: {
        prompt: 'Write a weekly report.',
        timezone: 'Asia/Shanghai'
      } as Automation,
      scheduledFor: Date.UTC(2026, 6, 17, 9)
    })

    expect(runtime.getRuntimeGitHistory).toHaveBeenCalledWith('id:worktree-1', { limit: 100 })
    expect(runtime.getHostedReviewForBranch).toHaveBeenCalledWith(
      expect.objectContaining({ repoSelector: 'id:repo-1', linkedGitHubPR: 17 })
    )
    expect(prompt).toContain('本周工作线索: Add weekly reports')
    expect(prompt).toContain(
      '[github MR/PR 17: Add weekly reports](https://github.com/example/orca/pull/17) · 合并状态 待合并'
    )
    expect(prompt).toContain('# 本周产品研发周报')
  })
})
