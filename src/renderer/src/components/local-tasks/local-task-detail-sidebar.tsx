import { useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  FolderOpen,
  Play,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { LocalTask, LocalTaskLabel } from '../../../../shared/local-task-types'
import {
  ALL_PRIORITIES,
  ALL_STATUSES,
  getPriorityLabel,
  PriorityIcon,
  getStatusLabel,
  StatusIcon
} from './local-task-status-priority'
import { LocalTaskLabelPicker } from './local-task-label-manager'
import { DueDatePicker } from './local-task-due-date'

const PROPERTY_ROW_CLASS =
  'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground'

const PROPERTY_ICON_CLASS = 'size-4 shrink-0 text-muted-foreground'

export function DetailSidebar({
  task,
  labels,
  onUpdate,
  onDelete,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onStartWorkspace
}: {
  task: LocalTask
  labels: LocalTaskLabel[]
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onCreateLabel: (name: string, color: string) => void
  onUpdateLabel: (id: string, name: string, color: string) => void
  onDeleteLabel: (id: string) => void
  onStartWorkspace?: (task: LocalTask) => void
}): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const selectedLabelIds = task.labelIds ?? []
  const taskLabels = labels.filter((l) => selectedLabelIds.includes(l.id))

  const handleToggleLabel = (labelId: string): void => {
    const next = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId]
    onUpdate(task.id, { labelIds: next })
  }

  const repoLabel = task.repoPath
    ? (task.repoPath.split('/').pop() ?? task.repoPath)
    : translate('auto.components.LocalTaskDetailPage.no_project', 'None')

  return (
    <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs">
        <div className="flex h-10 items-center gap-1 border-b border-border/50 px-4 text-sm font-medium text-muted-foreground">
          <span>{translate('auto.components.LocalTaskDetailPage.properties', 'Properties')}</span>
        </div>
        <div className="space-y-1 p-3">
          <PropertyPopoverRow
            icon={<StatusIcon status={task.status} className={PROPERTY_ICON_CLASS} />}
            label={getStatusLabel(task.status)}
            active={task.status}
            width="w-48"
            options={ALL_STATUSES.map((s) => ({
              key: s,
              icon: <StatusIcon status={s} className="size-3.5" />,
              label: getStatusLabel(s)
            }))}
            onSelect={(s) => onUpdate(task.id, { status: s })}
          />
          <PropertyPopoverRow
            icon={<PriorityIcon priority={task.priority} className={PROPERTY_ICON_CLASS} />}
            label={getPriorityLabel(task.priority)}
            active={task.priority}
            width="w-36"
            options={ALL_PRIORITIES.map((p) => ({
              key: p,
              icon: <PriorityIcon priority={p} className="size-3.5" />,
              label: getPriorityLabel(p)
            }))}
            onSelect={(p) => onUpdate(task.id, { priority: p })}
          />
          <DueDatePicker
            value={task.dueDate}
            onChange={(date) => onUpdate(task.id, { dueDate: date ?? null })}
          />
          <div className={PROPERTY_ROW_CLASS}>
            <FolderOpen className={PROPERTY_ICON_CLASS} />
            <span className="min-w-0 flex-1 truncate">{repoLabel}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs">
        <div className="flex h-10 items-center gap-1 border-b border-border/50 px-4 text-sm font-medium text-muted-foreground">
          <span>{translate('auto.components.LocalTaskDetailPage.labels', 'Labels')}</span>
        </div>
        <div className="p-3">
          <div className="flex flex-wrap items-center gap-1">
            {taskLabels.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${l.color}1A`,
                  border: `1px solid ${l.color}30`,
                  color: l.color
                }}
              >
                {l.name}
                <button
                  type="button"
                  onClick={() => handleToggleLabel(l.id)}
                  className="rounded-full p-0.5 hover:opacity-70"
                >
                  <X className="size-2" />
                </button>
              </span>
            ))}
            <LocalTaskLabelPicker
              labels={labels}
              selectedIds={selectedLabelIds}
              onToggleLabel={handleToggleLabel}
              onCreateLabel={onCreateLabel}
              onUpdateLabel={onUpdateLabel}
              onDeleteLabel={onDeleteLabel}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-2.5" />
                {taskLabels.length === 0 &&
                  translate('auto.components.LocalTaskDetailPage.add_label', 'Add label')}
              </button>
            </LocalTaskLabelPicker>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs">
        <div className="flex h-10 items-center gap-1 border-b border-border/50 px-4 text-sm font-medium text-muted-foreground">
          <span>{translate('auto.components.LocalTaskDetailPage.actions', 'Actions')}</span>
        </div>
        <div className="space-y-1 p-3">
          {onStartWorkspace ? (
            <button
              type="button"
              onClick={() => onStartWorkspace(task)}
              className={cn(PROPERTY_ROW_CLASS, 'text-muted-foreground')}
            >
              <Play className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {translate(
                  'auto.components.LocalTaskDetailPage.start_workspace',
                  'Start workspace'
                )}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onUpdate(task.id, { archivedAt: task.archivedAt ? null : Date.now() })}
            className={cn(PROPERTY_ROW_CLASS, 'text-muted-foreground')}
          >
            {task.archivedAt ? (
              <ArchiveRestore className="size-4 shrink-0" />
            ) : (
              <Archive className="size-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {task.archivedAt
                ? translate('auto.components.LocalTaskDetailPage.unarchive', 'Unarchive')
                : translate('auto.components.LocalTaskDetailPage.archive', 'Archive')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmDelete) {
                onDelete(task.id)
              } else {
                setConfirmDelete(true)
                setTimeout(() => setConfirmDelete(false), 2000)
              }
            }}
            className={cn(
              PROPERTY_ROW_CLASS,
              confirmDelete
                ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                : 'text-muted-foreground'
            )}
          >
            <Trash2 className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {confirmDelete
                ? translate(
                    'auto.components.LocalTaskDetailPage.confirm_delete',
                    'Click again to delete'
                  )
                : translate('auto.components.LocalTaskDetailPage.delete_task', 'Delete task')}
            </span>
          </button>
        </div>
      </section>
    </aside>
  )
}

function PropertyPopoverRow({
  icon,
  label,
  active,
  width,
  options,
  onSelect
}: {
  icon: React.ReactNode
  label: string
  active: string
  width: string
  options: { key: string; icon: React.ReactNode; label: string }[]
  onSelect: (key: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={PROPERTY_ROW_CLASS}>
          {icon}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-55" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`${width} p-1 scrollbar-sleek`}
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              onSelect(opt.key)
              setOpen(false)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] hover:bg-accent',
              active === opt.key && 'bg-accent/50'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
