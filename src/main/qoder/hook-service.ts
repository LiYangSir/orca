import { ClaudeHookService } from '../claude/hook-service'
import { QODER_HOOK_SETTINGS } from '../claude/hook-settings'

// Why: Qoder exposes Claude-compatible hooks in ~/.qoder/settings.json but needs its own attribution.
export const qoderHookService = new ClaudeHookService({
  agent: 'qoder',
  displayName: 'Qoder',
  settings: QODER_HOOK_SETTINGS,
  hookSource: 'qoder'
})
