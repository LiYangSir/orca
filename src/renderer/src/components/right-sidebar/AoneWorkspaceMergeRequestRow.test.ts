import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AoneWorkspaceMergeRequestRow } from './AoneWorkspaceMergeRequestRow'

describe('AoneWorkspaceMergeRequestRow', () => {
  it('renders an MR reference with the selected monospace emphasis', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AoneWorkspaceMergeRequestRow, {
        repoName: 'diamond-workspace',
        branch: 'listener-list-config-influence',
        review: {
          id: 28570763,
          title: 'Support listener queries',
          state: 'merged',
          url: null
        }
      })
    )

    expect(markup).toContain('class="shrink-0 font-mono text-[11px] font-semibold text-foreground"')
    expect(markup).toContain('!28570763')
    expect(markup).toContain('class="truncate text-xs text-muted-foreground"')
  })
})
