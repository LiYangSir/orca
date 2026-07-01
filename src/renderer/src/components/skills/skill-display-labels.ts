import type { SkillProvider, SkillSourceKind } from '../../../../shared/skills'

export const providerLabels: Record<SkillProvider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  'agent-skills': 'Agent Skills'
}

export const sourceLabels: Record<SkillSourceKind, string> = {
  home: 'Home',
  repo: 'Repository',
  bundled: 'Bundled',
  plugin: 'Plugin'
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

export function formatSkillUpdatedAt(value: number | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'Unknown'
}

export function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}
