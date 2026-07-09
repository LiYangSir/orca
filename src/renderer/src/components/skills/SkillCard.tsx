import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SkillTarget } from '../../../../shared/skills'
import { SyncDots } from './SyncDots'
import { getSourceColor, getUpdateInfo } from './skills-view-constants'

type ToolInfo = {
  key: string
  displayName: string
  installed: boolean
  enabled: boolean
}

type SkillCardProps = {
  skill: {
    id: string
    name: string
    description: string | null
    sourceType: string
    updateStatus: string
    enabled: boolean
    tags: string[] | null
    targets: SkillTarget[]
  }
  tools?: ToolInfo[]
  viewMode: 'grid' | 'list'
  isSelected: boolean
  onClick: () => void
}

export function SkillCard({
  skill,
  tools,
  viewMode,
  isSelected,
  onClick
}: SkillCardProps): React.JSX.Element {
  const updateInfo = getUpdateInfo(skill.updateStatus)
  const hasSyncedTargets = skill.targets.length > 0

  if (viewMode === 'list') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'grid w-full cursor-pointer items-center gap-x-3 border-b border-border/30 px-3 py-2 text-left transition-colors hover:bg-accent/40',
          'grid-cols-[minmax(140px,1.2fr)_2fr_auto_auto_auto]',
          isSelected && 'bg-accent',
          !skill.enabled && 'opacity-50'
        )}
      >
        <span className="truncate text-[13px] font-medium">{skill.name}</span>
        <span className="truncate text-[11px] text-muted-foreground">
          {skill.description ?? '—'}
        </span>
        <SyncDots targets={skill.targets} tools={tools} maxVisible={4} size="sm" />
        <Badge
          variant="outline"
          className="h-4 w-14 justify-center px-1.5 text-[9px]"
          style={{ borderColor: getSourceColor(skill.sourceType) }}
        >
          {skill.sourceType}
        </Badge>
        {skill.updateStatus === 'update_available' ? (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: updateInfo.color }}
          />
        ) : (
          <span className="size-1.5 shrink-0" />
        )}
      </button>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'group cursor-pointer rounded-lg border border-border bg-card/80 p-3 transition-all hover:border-border/80 hover:bg-accent/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)]',
        isSelected && 'bg-accent/60 ring-1 ring-primary',
        !skill.enabled && 'opacity-50'
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="flex-1 truncate text-[13px] font-medium leading-snug">{skill.name}</span>
        {skill.updateStatus === 'update_available' && (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: updateInfo.color }}
          />
        )}
        <Badge
          variant="outline"
          className="h-4 shrink-0 px-1.5 text-[9px]"
          style={{ borderColor: getSourceColor(skill.sourceType) }}
        >
          {skill.sourceType}
        </Badge>
      </div>

      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {skill.description ?? 'No description'}
      </p>

      {hasSyncedTargets && (
        <div className="mt-2 flex items-center">
          <SyncDots targets={skill.targets} tools={tools} size="sm" />
        </div>
      )}
    </div>
  )
}
