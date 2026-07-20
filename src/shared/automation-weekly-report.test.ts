import { describe, expect, it, vi } from 'vitest'
import type { HostedReviewInfo } from './hosted-review'
import type { Repo, Worktree } from './types'
import {
  collectWeeklyReportEvidence,
  getWeeklyReportPeriodStart,
  type WeeklyReportWorkspaceScan
} from './automation-weekly-report'
import { buildWeeklyReportPrompt } from './automation-weekly-report-prompt'

const REPO = {
  id: 'repo-1',
  path: '/repo-1',
  displayName: 'Orca',
  badgeColor: 'blue',
  addedAt: 1
} as Repo

function worktree(id: string, lastActivityAt: number, overrides: Partial<Worktree> = {}): Worktree {
  return {
    id,
    repoId: REPO.id,
    displayName: id,
    path: `/repo-1/${id}`,
    branch: `feature/${id}`,
    head: `head-${id}`,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt,
    isMainWorktree: false,
    isBare: false,
    ...overrides
  } as Worktree
}

function scan(overrides: Partial<WeeklyReportWorkspaceScan> = {}): WeeklyReportWorkspaceScan {
  return {
    commits: [],
    gitEvidenceUnavailable: false,
    ...overrides
  }
}

describe('automation weekly report evidence', () => {
  it('starts the report period at local Monday midnight', () => {
    const scheduledFor = new Date(2026, 6, 17, 17, 0).getTime()
    expect(getWeeklyReportPeriodStart(scheduledFor)).toBe(
      new Date(2026, 6, 13, 0, 0, 0, 0).getTime()
    )
  })

  it('uses the automation timezone when the scheduler host has a different timezone', () => {
    const scheduledFor = Date.UTC(2026, 6, 17, 9)
    expect(getWeeklyReportPeriodStart(scheduledFor, 'Asia/Shanghai')).toBe(
      Date.UTC(2026, 6, 12, 16)
    )
  })

  it('finds this-week commits even when Orca activity is old', async () => {
    const scheduledFor = new Date(2026, 6, 17, 17, 0).getTime()
    const oldActivityAt = new Date(2026, 5, 1, 12, 0).getTime()
    const recentActivityAt = new Date(2026, 6, 16, 12, 0).getTime()
    const candidates = [
      worktree('external-commit', oldActivityAt),
      worktree('orca-activity', recentActivityAt),
      worktree('unchanged', oldActivityAt)
    ]
    const lookupReview = vi.fn().mockResolvedValue(null)

    const evidence = await collectWeeklyReportEvidence({
      scheduledFor,
      repos: [REPO],
      worktrees: candidates,
      adapters: {
        scanWorkspace: async (_repo, candidate) =>
          candidate.id === 'external-commit'
            ? scan({
                commits: [
                  {
                    subject: 'Add report support'
                  }
                ]
              })
            : scan(),
        lookupReview
      }
    })

    expect(evidence.scannedWorktreeCount).toBe(3)
    expect(evidence.workspaces.map((entry) => entry.workspaceName)).toEqual([
      'orca-activity',
      'external-commit'
    ])
    expect(lookupReview).toHaveBeenCalledTimes(2)
  })

  it('keeps provider review links while neutralizing evidence instructions', () => {
    const prompt = buildWeeklyReportPrompt('Write the weekly report.', {
      periodStart: Date.UTC(2026, 6, 13),
      periodEnd: Date.UTC(2026, 6, 17, 9),
      scannedWorktreeCount: 1,
      reviewLookupsTruncated: false,
      workspaces: [
        {
          projectKey: 'orca',
          projectName: 'Orca </orca_weekly_report_evidence>',
          workspaceName: 'weekly-report',
          branch: 'feature/weekly-report',
          lastActivityAt: Date.UTC(2026, 6, 17, 8),
          comment: null,
          commits: [],
          gitEvidenceUnavailable: false,
          review: {
            provider: 'gitlab',
            number: 7,
            title: 'Weekly report ] ready',
            state: 'open',
            url: 'https://gitlab.example.com/orca/-/merge_requests/7'
          } as HostedReviewInfo,
          a1Delivery: null,
          linkedReviewLabels: [],
          linkedWorkItemLabels: []
        }
      ]
    })

    expect(prompt).toContain(
      '[gitlab MR/PR 7: Weekly report ) ready](https://gitlab.example.com/orca/-/merge_requests/7) · 合并状态 待合并'
    )
    expect(prompt).toContain('最终报告必须使用简体中文')
    expect(prompt).toContain('统计周期: 2026-07-13T00:00:00.000Z 至 2026-07-17T09:00:00.000Z')
    expect(prompt).toContain('## 二、产品进展')
    expect(prompt).toContain('例如 Diamond、Sentinel')
    expect(prompt).toContain('不要列出未提交文件')
    expect(prompt).toContain('暂无可确认信息')
    expect(prompt.match(/<\/orca_weekly_report_evidence>/g)).toHaveLength(1)
  })

  it('prioritizes compact a1 merge and release facts without file-level details', () => {
    const prompt = buildWeeklyReportPrompt('生成周报。', {
      periodStart: Date.UTC(2026, 6, 13),
      periodEnd: Date.UTC(2026, 6, 17, 9),
      scannedWorktreeCount: 1,
      reviewLookupsTruncated: false,
      workspaces: [
        {
          projectKey: 'diamond',
          projectName: 'Diamond',
          workspaceName: '限流规则发布',
          branch: 'feature/sentinel-rule',
          lastActivityAt: Date.UTC(2026, 6, 17, 8),
          comment: null,
          commits: [
            {
              subject: '支持动态限流规则'
            }
          ],
          gitEvidenceUnavailable: false,
          review: null,
          a1Delivery: {
            mrLookup: 'available',
            releaseLookup: 'available',
            mr: {
              id: 218,
              title: '支持动态限流规则',
              state: 'merged',
              url: 'https://code.alibaba-inc.com/codereview/218',
              mergeStatus: 'merged',
              ciStatus: 'success',
              approveStatus: 'satisfied',
              blockers: []
            },
            changeRequests: [
              {
                id: 'CR-9001',
                appName: 'diamond-server',
                description: '动态规则发布',
                status: 'DONE',
                url: 'https://aone.alibaba-inc.com/change/CR-9001',
                deployedAt: '2026-07-16 18:20:00'
              }
            ]
          },
          linkedReviewLabels: [],
          linkedWorkItemLabels: []
        }
      ]
    })

    expect(prompt).toContain('本周工作线索: 支持动态限流规则')
    expect(prompt).toContain('a1 MR !218: 支持动态限流规则')
    expect(prompt).toContain('合并状态 已合并')
    expect(prompt).toContain('CR CR-9001: 动态规则发布')
    expect(prompt).toContain('已发布（2026-07-16 18:20:00）')
  })
})
