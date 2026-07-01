import { Bookmark, Clock, FolderOpen, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { DiscoveredSkill } from '../../../../shared/skills'
import {
  formatSkillUpdatedAt,
  pluralizeCount,
  providerLabels,
  sourceLabels
} from './skill-display-labels'

type SkillListItemProps = {
  skill: DiscoveredSkill
  saved: boolean
  compact?: boolean
  onToggleSaved: (skill: DiscoveredSkill) => void
}

export function SkillListItem({
  skill,
  saved,
  compact = false,
  onToggleSaved
}: SkillListItemProps): React.JSX.Element {
  const revealSkill = async (): Promise<void> => {
    const result = await window.api.shell.openInFileManager(skill.skillFilePath)
    if (!result.ok) {
      toast.error(
        translate('auto.components.skills.SkillsPage.995fde8337', 'Could not reveal skill file')
      )
    }
  }

  return (
    <div
      className={cn(
        'group rounded-lg border border-border/60 bg-card transition-colors hover:bg-accent/35',
        compact ? 'px-3 py-2' : 'px-3.5 py-3'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
          <WandSparkles className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-[13px] font-medium leading-5">{skill.name}</h3>
            <Badge variant={saved ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[9px]">
              {saved
                ? translate('auto.components.skills.SkillListItem.f04164db24', 'Saved')
                : sourceLabels[skill.sourceKind]}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {skill.description ??
              translate('auto.components.skills.SkillListItem.9963dff6d3', 'No description found.')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={saved ? 'secondary' : 'ghost'}
                size="icon-sm"
                className="size-7"
                onClick={() => onToggleSaved(skill)}
              >
                <Bookmark className={cn('size-3.5', saved && 'fill-current')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {saved
                ? translate(
                    'auto.components.skills.SkillListItem.b784f9682d',
                    'Remove from My Skills'
                  )
                : translate('auto.components.skills.SkillListItem.a264d8bf16', 'Save to My Skills')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => {
                  void revealSkill()
                }}
              >
                <FolderOpen className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {translate('auto.components.skills.SkillsPage.dc4c3328ee', 'Reveal file')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {!compact ? (
        <div className="mt-3 grid gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="min-w-0 truncate font-mono" title={skill.skillFilePath}>
            {skill.skillFilePath}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {skill.providers.map((provider) => (
              <Badge key={provider} variant="outline" className="h-4 px-1.5 text-[9px]">
                {providerLabels[provider]}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span>{pluralizeCount(skill.fileCount, 'file')}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatSkillUpdatedAt(skill.updatedAt)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
