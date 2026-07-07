/**
 * Agent identity classification from terminal titles — determines which coding
 * agent (Claude Code, Gemini CLI, Pi, Codex, etc.) owns a given terminal title
 * and provides the display label for that agent.
 *
 * Why separate: these identity-classification functions are logically distinct
 * from the status-detection and title-normalization code in agent-detection.ts.
 */

import {
  AGY_AGENT_NAME_RE,
  DROID_AGENT_NAME_RE,
  HERMES_AGENT_NAME_RE,
  titleHasAgentName,
  titleHasAnyLegacyAgentName
} from './agent-name-token-match'
import {
  getPiCompatibleSyntheticAgentLabel,
  isLegacyPiCompatibleTitle
} from './pi-compatible-synthetic-title'

export const CLAUDE_IDLE = '✳' // ✳ (eight-spoked asterisk — Claude Code idle prefix)
const CLAUDE_MANAGEMENT_TITLE_RE =
  /^\s*(?:"(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?"|'(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?'|(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?)\s+agents\s*$/i

export const GEMINI_WORKING = '✦' // ✦
export const GEMINI_SILENT_WORKING = '⏲' // ⏲
export const GEMINI_IDLE = '◇' // ◇
export const GEMINI_PERMISSION = '✋' // ✋

export function containsBrailleSpinner(title: string): boolean {
  for (const char of title) {
    const codePoint = char.codePointAt(0)
    if (codePoint !== undefined && codePoint >= 0x2800 && codePoint <= 0x28ff) {
      return true
    }
  }
  return false
}

export function isPiAgentTitle(title: string): boolean {
  return isLegacyPiCompatibleTitle(title)
}

export function containsAgentName(title: string): boolean {
  return (
    titleHasAnyLegacyAgentName(title) ||
    AGY_AGENT_NAME_RE.test(title) ||
    DROID_AGENT_NAME_RE.test(title) ||
    HERMES_AGENT_NAME_RE.test(title)
  )
}

export function isGeminiTerminalTitle(title: string): boolean {
  // Why: Gemini OSC glyphs are stronger evidence than any cwd/session text.
  if (
    title.includes(GEMINI_PERMISSION) ||
    title.includes(GEMINI_WORKING) ||
    title.includes(GEMINI_SILENT_WORKING) ||
    title.includes(GEMINI_IDLE)
  ) {
    return true
  }
  // Why: Pi/OMP titles include cwd/session text; substring matching made
  // paths like "gemini-project" masquerade as Gemini CLI.
  if (isPiAgentTitle(title)) {
    return false
  }
  return titleHasAgentName(title, 'gemini')
}

export function isPiTerminalTitle(title: string): boolean {
  return isLegacyPiCompatibleTitle(title) && !containsBrailleSpinner(title)
}

export function isClaudeManagementTitle(title: string): boolean {
  return CLAUDE_MANAGEMENT_TITLE_RE.test(title)
}

/**
 * Returns true when the terminal title matches Claude Code's title conventions.
 * Used to scope prompt-cache-timer behavior to Claude sessions only — other
 * agents have different (or no) caching semantics.
 */
export function isClaudeAgent(title: string): boolean {
  if (!title || isClaudeManagementTitle(title)) {
    return false
  }
  const lower = title.toLowerCase()

  // Why: Claude Code titles are prefixed with status indicators (✳, ". ", "* ",
  // braille spinners) followed by the task description. The task text can
  // legitimately mention other agents, so Claude-specific prefixes must win.
  if (title.startsWith(`${CLAUDE_IDLE} `) || title === CLAUDE_IDLE) {
    return true
  }
  // Why: ". " (working) and "* " (idle) are Claude Code title conventions.
  // Other supported agents do not use them, and rejecting titles that mention
  // another agent in the task text caused false negatives for real Claude tabs.
  if (title.startsWith('. ') || title.startsWith('* ')) {
    return true
  }
  if (containsBrailleSpinner(title)) {
    // Why: named non-Claude agents can carry braille spinners too; Claude-only
    // prompt-cache paths must not fire for those explicit agent titles.
    return !lower.includes('cursor') && !lower.includes('openclaude')
  }
  // Why: permission/action-required Claude titles can omit the usual prefixes.
  // Token-match so cwd/worktree titles like "claude-scratch" do not become
  // Claude tabs, while task text that merely mentions Claude still stays out.
  const trimmedTitle = title.trimStart()
  if (
    trimmedTitle.toLowerCase().startsWith('claude') &&
    titleHasAgentName(trimmedTitle, 'claude')
  ) {
    return true
  }

  return false
}

export function getAgentLabel(title: string): string | null {
  if (isClaudeManagementTitle(title)) {
    return null
  }
  // Why: Claude Code title text is often the task title. If that task mentions
  // another CLI, the Claude-specific prefix is the identity signal, not the words.
  if (
    title.startsWith(`${CLAUDE_IDLE} `) ||
    title === CLAUDE_IDLE ||
    title.startsWith('. ') ||
    title.startsWith('* ')
  ) {
    return 'Claude Code'
  }
  if (titleHasAgentName(title, 'qoder')) {
    return 'Qoder'
  }
  if (isGeminiTerminalTitle(title)) {
    return 'Gemini CLI'
  }
  // Why: Pi-compatible synthetic titles can carry braille spinners, which the
  // generic agent-title heuristics would otherwise claim first.
  const piCompatibleSyntheticAgentLabel = getPiCompatibleSyntheticAgentLabel(title)
  if (piCompatibleSyntheticAgentLabel) {
    return piCompatibleSyntheticAgentLabel
  }
  // Why: Pi working titles include a braille spinner prefix, which would be
  // mistaken for Claude Code if we checked `isClaudeAgent` first.
  if (isPiAgentTitle(title)) {
    return 'Pi'
  }
  // Why: Codex/OpenCode/Aider can also use braille spinner prefixes while
  // working. Prefer explicit name matches before Claude's generic spinner
  // heuristic so mixed-agent hovercards stay truthful. Token-match (not
  // substring) so cwd/worktree titles like "opencode-blinker" don't mint a
  // false agent identity.
  if (titleHasAgentName(title, 'codex')) {
    return 'Codex'
  }
  if (titleHasAgentName(title, 'openclaude')) {
    return 'OpenClaude'
  }
  if (titleHasAgentName(title, 'copilot')) {
    return 'GitHub Copilot'
  }
  if (titleHasAgentName(title, 'grok')) {
    return 'Grok'
  }
  if (titleHasAgentName(title, 'devin')) {
    return 'Devin'
  }
  if (titleHasAgentName(title, 'antigravity') || AGY_AGENT_NAME_RE.test(title)) {
    return 'Antigravity'
  }
  if (titleHasAgentName(title, 'opencode')) {
    return 'OpenCode'
  }
  if (titleHasAgentName(title, 'mimo')) {
    return 'MiMo Code'
  }
  if (titleHasAgentName(title, 'aider')) {
    return 'Aider'
  }
  // Why: the cursor-agent native title is the literal string "Cursor Agent"
  // (verified against the 2026.04.17 release) — Orca synthesizes the same
  // label from hook events so the braille-spinner + agent-name path lights
  // up working/permission/idle transitions in the renderer. Match before
  // `isClaudeAgent` because Claude's generic braille heuristic would
  // otherwise claim every "⠋ Cursor Agent" frame as Claude. Token-match so a
  // cwd like "~/cursor-rules" can't masquerade as a Cursor agent.
  if (titleHasAgentName(title, 'cursor')) {
    return 'Cursor'
  }
  // Why: synthesized "⠋ Droid" working title needs to be matched before Claude's braille heuristic.
  // Token matching avoids labeling ordinary Android terminal titles as Droid.
  if (DROID_AGENT_NAME_RE.test(title)) {
    return 'Droid'
  }
  // Why: synthesized "⠋ Hermes" working titles need to be matched before
  // Claude's generic braille-spinner heuristic.
  if (HERMES_AGENT_NAME_RE.test(title)) {
    return 'Hermes'
  }
  if (isClaudeAgent(title)) {
    return 'Claude Code'
  }

  return null
}
