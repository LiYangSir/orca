import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { getAutomationTemplates } from './automation-templates'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('automation templates', () => {
  it('provides a complete Chinese weekly-report template', async () => {
    await i18n.changeLanguage('zh')

    const weeklyReport = getAutomationTemplates().find(
      (template) => template.kind === 'weekly_report'
    )

    expect(weeklyReport).toMatchObject({
      category: '周报',
      label: '本周产品研发周报',
      name: '本周产品研发周报',
      description: '汇总本周所有变更项目的产品进展，重点关联 a1 MR 合并与发布状态。'
    })
    expect(weeklyReport?.prompt).toContain('面向产品的中文周报')
    expect(weeklyReport?.prompt).toContain('MR 合并状态、CR/发布状态')
    expect(weeklyReport?.prompt).toContain('不要罗列未提交文件')
  })
})
