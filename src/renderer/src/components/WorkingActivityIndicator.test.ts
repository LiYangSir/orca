import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkingActivityIndicator } from './WorkingActivityIndicator'

function renderIndicator(phaseKey: string, size: 'sm' | 'md' = 'sm'): string {
  return renderToStaticMarkup(
    React.createElement(WorkingActivityIndicator, {
      'aria-label': 'Working',
      phaseKey,
      size
    })
  )
}

function readPhase(markup: string): string {
  const phase = markup.match(/--working-activity-phase:([^;"]+)/)?.[1]
  expect(phase).toBeDefined()
  return phase!
}

describe('WorkingActivityIndicator', () => {
  it('renders the requested fixed footprint and accessible label', () => {
    const markup = renderIndicator('worktree-1', 'md')

    expect(markup).toContain('working-activity-indicator')
    expect(markup).toContain('data-size="md"')
    expect(markup).toContain('aria-label="Working"')
  })

  it('assigns stable staggered phases from task identity', () => {
    const firstPhase = readPhase(renderIndicator('worktree-1'))
    const repeatedPhase = readPhase(renderIndicator('worktree-1'))
    const secondPhase = readPhase(renderIndicator('worktree-2'))

    expect(repeatedPhase).toBe(firstPhase)
    expect(secondPhase).not.toBe(firstPhase)
  })
})
