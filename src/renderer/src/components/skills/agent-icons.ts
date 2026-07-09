import adalIcon from '@/assets/agent-icons/adal.png'
import ampIcon from '@/assets/agent-icons/amp.svg'
import antigravityIcon from '@/assets/agent-icons/antigravity.png'
import augmentIcon from '@/assets/agent-icons/augment.svg'
import bobIcon from '@/assets/agent-icons/bob.png'
import claudeCodeIcon from '@/assets/agent-icons/claude_code.svg'
import clineIcon from '@/assets/agent-icons/cline.png'
import codebuddyIcon from '@/assets/agent-icons/codebuddy.svg'
import codexIcon from '@/assets/agent-icons/codex.svg'
import commandCodeIcon from '@/assets/agent-icons/command_code.svg'
import continueIcon from '@/assets/agent-icons/continue.png'
import cortexIcon from '@/assets/agent-icons/cortex.png'
import crushIcon from '@/assets/agent-icons/crush.png'
import cursorIcon from '@/assets/agent-icons/cursor.png'
import deepagentsIcon from '@/assets/agent-icons/deepagents.png'
import droidIcon from '@/assets/agent-icons/droid.svg'
import firebenderIcon from '@/assets/agent-icons/firebender.svg'
import geminiCliIcon from '@/assets/agent-icons/gemini_cli.svg'
import githubCopilotIcon from '@/assets/agent-icons/github_copilot.png'
import gooseIcon from '@/assets/agent-icons/goose.png'
import hermesIcon from '@/assets/agent-icons/hermes.png'
import iflowIcon from '@/assets/agent-icons/iflow.png'
import junieIcon from '@/assets/agent-icons/junie.png'
import kiloCodeIcon from '@/assets/agent-icons/kilo_code.svg'
import kimiIcon from '@/assets/agent-icons/kimi.svg'
import kiroIcon from '@/assets/agent-icons/kiro.svg'
import kodeIcon from '@/assets/agent-icons/kode.png'
import mcpjamIcon from '@/assets/agent-icons/mcpjam.png'
import mistralVibeIcon from '@/assets/agent-icons/mistral_vibe.svg'
import muxIcon from '@/assets/agent-icons/mux.png'
import neovateIcon from '@/assets/agent-icons/neovate.png'
import openclawIcon from '@/assets/agent-icons/openclaw.svg'
import opencodeIcon from '@/assets/agent-icons/opencode.png'
import openhandsIcon from '@/assets/agent-icons/openhands.png'
import piIcon from '@/assets/agent-icons/pi.svg'
import pochiIcon from '@/assets/agent-icons/pochi.png'
import qoderIcon from '@/assets/agent-icons/qoder.svg'
import qwenCodeIcon from '@/assets/agent-icons/qwen_code.png'
import replitIcon from '@/assets/agent-icons/replit.png'
import rooCodeIcon from '@/assets/agent-icons/roo_code.svg'
import traeIcon from '@/assets/agent-icons/trae.svg'
import traeCnIcon from '@/assets/agent-icons/trae_cn.svg'
import warpIcon from '@/assets/agent-icons/warp.svg'
import windsurfIcon from '@/assets/agent-icons/windsurf.svg'
import zencoderIcon from '@/assets/agent-icons/zencoder.png'

const AGENT_ICONS: Record<string, string> = {
  adal: adalIcon,
  amp: ampIcon,
  antigravity: antigravityIcon,
  augment: augmentIcon,
  bob: bobIcon,
  claude_code: claudeCodeIcon,
  cline: clineIcon,
  codebuddy: codebuddyIcon,
  codex: codexIcon,
  command_code: commandCodeIcon,
  continue: continueIcon,
  cortex: cortexIcon,
  crush: crushIcon,
  cursor: cursorIcon,
  deepagents: deepagentsIcon,
  droid: droidIcon,
  firebender: firebenderIcon,
  gemini_cli: geminiCliIcon,
  github_copilot: githubCopilotIcon,
  goose: gooseIcon,
  hermes: hermesIcon,
  iflow: iflowIcon,
  junie: junieIcon,
  kilo_code: kiloCodeIcon,
  kimi: kimiIcon,
  kiro: kiroIcon,
  kode: kodeIcon,
  mcpjam: mcpjamIcon,
  mistral_vibe: mistralVibeIcon,
  mux: muxIcon,
  neovate: neovateIcon,
  openclaw: openclawIcon,
  opencode: opencodeIcon,
  openhands: openhandsIcon,
  pi: piIcon,
  pochi: pochiIcon,
  qoder: qoderIcon,
  qwen_code: qwenCodeIcon,
  replit: replitIcon,
  roo_code: rooCodeIcon,
  trae: traeIcon,
  trae_cn: traeCnIcon,
  warp: warpIcon,
  windsurf: windsurfIcon,
  zencoder: zencoderIcon
}

export function getAgentIconUrl(agentKey: string): string | null {
  return AGENT_ICONS[agentKey] ?? null
}

export function hasAgentIcon(agentKey: string): boolean {
  return agentKey in AGENT_ICONS
}

export function shortLabel(displayName: string, key: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  const word = words[0] || key
  return word.slice(0, 2).toUpperCase()
}
