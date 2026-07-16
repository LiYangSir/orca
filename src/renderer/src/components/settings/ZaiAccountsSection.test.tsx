// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import type React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

vi.mock('@/i18n/localized-catalog', () => ({
  createLocalizedCatalog:
    <T,>(loader: () => T) =>
    () =>
      loader()
}))

vi.mock('./settings-search-keywords', () => ({
  translateSearchKeyword: (_key: string, fallback: string) => [fallback]
}))

vi.mock('./SearchableSetting', () => ({
  SearchableSetting: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

import { ZaiAccountsSection } from './ZaiAccountsSection'

describe('ZaiAccountsSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('saves a trimmed API key before refreshing usage', async () => {
    const updateSettings = vi.fn(async () => undefined)
    const refreshRateLimits = vi.fn(async () => undefined)
    const user = userEvent.setup()

    render(
      <ZaiAccountsSection
        apiKey=""
        usageError={null}
        updateSettings={updateSettings}
        refreshRateLimits={refreshRateLimits}
      />
    )

    const input = screen.getByLabelText('API Key')
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.type(input, '  zai-key  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateSettings).toHaveBeenCalledWith({ zaiApiKey: 'zai-key' })
    expect(refreshRateLimits).toHaveBeenCalledTimes(1)
    expect(updateSettings.mock.invocationCallOrder[0]).toBeLessThan(
      refreshRateLimits.mock.invocationCallOrder[0]!
    )
  })

  it('clears a saved key and surfaces the latest usage error', async () => {
    const updateSettings = vi.fn(async () => undefined)
    const refreshRateLimits = vi.fn(async () => undefined)
    const user = userEvent.setup()

    render(
      <ZaiAccountsSection
        apiKey="saved-key"
        usageError="API key invalid. Check your Z.ai API key."
        updateSettings={updateSettings}
        refreshRateLimits={refreshRateLimits}
      />
    )

    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('API key invalid')

    await user.click(screen.getByRole('button', { name: 'Clear Key' }))

    expect(updateSettings).toHaveBeenCalledWith({ zaiApiKey: '' })
    expect(refreshRateLimits).toHaveBeenCalledTimes(1)
  })
})
