import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AoneWorkspaceMergeRequestOverview } from './AoneWorkspaceMergeRequestOverview'

describe('AoneWorkspaceMergeRequestOverview', () => {
  it('counts merge requests separately from repositories', () => {
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <AoneWorkspaceMergeRequestOverview
          parentRepoName="workspace"
          parentReview={null}
          parentLookupErrorCode={null}
          branch="feature/listener_influence"
          entries={[
            {
              repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
              branch: 'feature/diamond-listener',
              review: { id: 28612989, title: 'Listener queries', state: 'merged' },
              lookupErrorCode: null
            },
            {
              repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
              branch: 'feature/mw-listener',
              review: null,
              lookupErrorCode: null
            }
          ]}
          loading={false}
          scanFailed={false}
          onRefresh={vi.fn()}
          onSelectParent={vi.fn()}
          onSelectChild={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(markup).toContain('3 repositories')
    expect(markup).toContain('<span class="tabular-nums">1</span>')
  })
})
