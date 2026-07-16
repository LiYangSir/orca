import { useId, useState } from 'react'
import { Loader2, Lock, LockOpen } from 'lucide-react'

import type { GlobalSettings } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { AgentLetterIcon } from '@/lib/agent-icon-glyphs'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { getAccountsZaiSearchEntries } from './accounts-search'

type ZaiAccountsSectionProps = {
  apiKey: string
  usageError: string | null
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  refreshRateLimits: () => void | Promise<void>
}

export function ZaiAccountsSection({
  apiKey,
  usageError,
  updateSettings,
  refreshRateLimits
}: ZaiAccountsSectionProps): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const [submittedKey, setSubmittedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputId = useId()
  const errorId = useId()
  const configured = apiKey.trim().length > 0
  const searchEntry = getAccountsZaiSearchEntries()[0]
  // Why: hide a submitted key only after Settings reflects that exact value.
  // A failed persistence attempt therefore leaves the draft available to retry.
  const visibleDraft = submittedKey === apiKey.trim() ? '' : draft

  const persistApiKey = async (nextApiKey: string): Promise<void> => {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      await updateSettings({ zaiApiKey: nextApiKey })
      await refreshRateLimits()
    } catch (error) {
      console.error('Failed to update Z.ai API key:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="accounts-zai" className="space-y-4 scroll-mt-6">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AgentLetterIcon letter="Z" size={16} />
          {searchEntry.title}
        </h3>
        <p className="text-xs text-muted-foreground">{searchEntry.description}</p>
      </div>

      <SearchableSetting {...searchEntry} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={inputId}>
            {translate(
              'auto.components.settings.OpenAiTranscriptionKeyDialog.16015322f9',
              'API Key'
            )}
          </Label>
          <Badge
            variant={configured ? 'secondary' : 'outline'}
            className="h-5 gap-1 rounded-full px-2 text-[10px] font-medium text-muted-foreground"
          >
            {configured ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
            {configured
              ? translate('auto.components.settings.AccountsPane.73ea15f24b', 'Saved')
              : translate('auto.components.settings.AccountsPane.23afe8f226', 'Not saved')}
          </Badge>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const nextApiKey = visibleDraft.trim()
            if (nextApiKey) {
              setSubmittedKey(nextApiKey)
              void persistApiKey(nextApiKey)
            }
          }}
        >
          <Input
            id={inputId}
            type="password"
            value={visibleDraft}
            onChange={(event) => {
              setDraft(event.target.value)
              setSubmittedKey(null)
            }}
            disabled={busy}
            aria-describedby={configured && usageError ? errorId : undefined}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 text-xs"
          />
          <Button
            type="submit"
            size="xs"
            disabled={busy || !visibleDraft.trim()}
            className="h-7 shrink-0 text-xs"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            {configured
              ? translate('auto.components.settings.AccountsPane.f38b9cc4bd', 'Replace')
              : translate('auto.components.settings.AccountsPane.590a3130f9', 'Save')}
          </Button>
          {configured ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={busy}
              onClick={() => {
                setDraft('')
                setSubmittedKey(null)
                void persistApiKey('')
              }}
              className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {translate(
                'auto.components.settings.OpenAiTranscriptionKeyDialog.07b26f2742',
                'Clear Key'
              )}
            </Button>
          ) : null}
        </form>

        <p className="text-xs text-muted-foreground">
          {translate(
            'settings.appearance.statusBar.zaiToggleDescription',
            'Show Z.ai coding-plan quota usage when an API key is configured in Accounts.'
          )}
        </p>
        {configured && usageError ? (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {usageError}
          </p>
        ) : null}
      </SearchableSetting>
    </section>
  )
}
