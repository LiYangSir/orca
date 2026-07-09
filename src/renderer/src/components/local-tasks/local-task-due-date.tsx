import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { LocalTaskStatus } from '../../../../shared/local-task-types'

export function isOverdue(dueDate: string, status: LocalTaskStatus): boolean {
  if (status === 'done') {
    return false
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${dueDate}T00:00:00`) < today
}

export function formatDueDate(date: string): string {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) {
    return translate('auto.components.LocalTask.due_today', 'Today')
  }
  if (diff === 1) {
    return translate('auto.components.LocalTask.due_tomorrow', 'Tomorrow')
  }
  if (diff === -1) {
    return translate('auto.components.LocalTask.due_yesterday', 'Yesterday')
  }
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DueDatePicker({
  value,
  onChange
}: {
  value?: string
  onChange: (date: string | undefined) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>
            {value
              ? formatDueDate(value)
              : translate('auto.components.LocalTask.set_due_date', 'Set due date')}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  onChange(undefined)
                }
              }}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) {
              onChange(toIsoDate(day))
            } else {
              onChange(undefined)
            }
            setOpen(false)
          }}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DueDateChip({
  dueDate,
  status,
  className
}: {
  dueDate: string
  status: LocalTaskStatus
  className?: string
}): React.JSX.Element {
  const overdue = isOverdue(dueDate, status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px]',
        overdue ? 'text-red-500' : 'text-muted-foreground',
        className
      )}
    >
      <CalendarDays className="size-3" />
      {formatDueDate(dueDate)}
    </span>
  )
}
