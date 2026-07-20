import type { Tab, TerminalTab } from './types'
import { normalizeCompatibleAgentTitleForOwner } from './agent-title-owner'
import { isMeaningfulOpenCodeTerminalTitle } from './opencode-terminal-title'

export function resolveTerminalTabTitle(
  tab: Pick<
    TerminalTab,
    'customTitle' | 'quickCommandLabel' | 'generatedTitle' | 'title' | 'launchAgent'
  >,
  generatedTitlesEnabled: boolean,
  fallback = ''
): string {
  // Why: Gemini-derived agents can persist Gemini's raw OSC label; launch ownership names the UI.
  const liveTitle = normalizeCompatibleAgentTitleForOwner(tab.title?.trim() ?? '', tab.launchAgent)
  return (
    tab.customTitle?.trim() ||
    tab.quickCommandLabel?.trim() ||
    (isMeaningfulOpenCodeTerminalTitle(liveTitle) ? liveTitle : '') ||
    (generatedTitlesEnabled ? tab.generatedTitle?.trim() : '') ||
    liveTitle ||
    fallback
  )
}

export function resolveUnifiedTabLabel(
  tab: Pick<Tab, 'customLabel' | 'quickCommandLabel' | 'generatedLabel' | 'label'> | undefined,
  generatedTitlesEnabled: boolean,
  fallback = ''
): string {
  const liveLabel = tab?.label?.trim() ?? ''
  return (
    tab?.customLabel?.trim() ||
    tab?.quickCommandLabel?.trim() ||
    (isMeaningfulOpenCodeTerminalTitle(liveLabel) ? liveLabel : '') ||
    (generatedTitlesEnabled ? tab?.generatedLabel?.trim() : '') ||
    liveLabel ||
    fallback
  )
}
