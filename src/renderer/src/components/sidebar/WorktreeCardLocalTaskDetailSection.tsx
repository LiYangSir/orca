import { ListChecks } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { getLocalTaskDisplayId } from '../../../../shared/local-task-types'
import {
  WorktreeCardDetailSection,
  WorktreeCardDetailSectionContent
} from './WorktreeCardDetailSection'
import { DetailHeader, MetaIconBadge } from './WorktreeCardMetadataControls'

export function WorktreeCardLocalTaskBadge({ taskId }: { taskId: string }): React.JSX.Element {
  const displayId = getLocalTaskDisplayId(taskId)
  return (
    <MetaIconBadge
      label={translate(
        'auto.components.sidebar.WorktreeCardMeta.linkedLocalTask',
        'Linked local task {{value0}}',
        { value0: displayId }
      )}
    >
      <ListChecks className="text-muted-foreground" />
    </MetaIconBadge>
  )
}

export function WorktreeCardLocalTaskDetailSection({
  taskId
}: {
  taskId: string
}): React.JSX.Element {
  return (
    <WorktreeCardDetailSection>
      <DetailHeader
        icon={<ListChecks className="size-3 text-muted-foreground" />}
        label={translate('auto.components.sidebar.WorktreeCardMeta.localTask', 'Local task')}
      />
      <WorktreeCardDetailSectionContent>
        <div className="font-mono text-[12px] font-medium text-foreground">
          {getLocalTaskDisplayId(taskId)}
        </div>
      </WorktreeCardDetailSectionContent>
    </WorktreeCardDetailSection>
  )
}
