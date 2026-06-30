import type { TuiAgent } from './types'

const GEMINI_STYLE_TITLE_LABEL_BY_LAUNCH_AGENT: Partial<Record<TuiAgent, string>> = {
  // Why: Qoder 1.0.x is Gemini-derived and emits Gemini-style OSC title
  // status frames. Orca launch metadata is the provider source of truth.
  qoder: 'Qoder'
}

const FOREGROUND_AGENT_BY_LAUNCH_AND_REPORTED_AGENT: Partial<
  Record<TuiAgent, Partial<Record<TuiAgent, TuiAgent>>>
> = {
  qoder: {
    gemini: 'qoder'
  }
}

export function getGeminiStyleTitleLabel(launchAgent?: TuiAgent | null): string {
  return (launchAgent && GEMINI_STYLE_TITLE_LABEL_BY_LAUNCH_AGENT[launchAgent]) || 'Gemini CLI'
}

export function resolveForegroundAgentForLaunch(
  launchAgent: TuiAgent | null,
  foregroundAgent: TuiAgent
): TuiAgent {
  return (
    (launchAgent &&
      FOREGROUND_AGENT_BY_LAUNCH_AND_REPORTED_AGENT[launchAgent]?.[foregroundAgent]) ||
    foregroundAgent
  )
}
