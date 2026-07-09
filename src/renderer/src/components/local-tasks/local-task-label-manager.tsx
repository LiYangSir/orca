import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import type { LocalTaskLabel } from '../../../../shared/local-task-types'

const DEFAULT_COLORS = [
  '#E5534B',
  '#5E6AD2',
  '#26B59A',
  '#D6A96A',
  '#A78BFA',
  '#E8704A',
  '#F59E0B',
  '#06B6D4'
]

export function LocalTaskLabelPicker({
  labels,
  selectedIds,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  children
}: {
  labels: LocalTaskLabel[]
  selectedIds: string[]
  onToggleLabel: (labelId: string) => void
  onCreateLabel: (name: string, color: string) => void
  onUpdateLabel: (id: string, name: string, color: string) => void
  onDeleteLabel: (id: string) => void
  children: React.ReactNode
}): React.JSX.Element {
  const [creating, setCreating] = useState(false)

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.LocalTaskList.labels', 'Labels')}
        </div>
        <div className="max-h-56 overflow-auto scrollbar-sleek">
          {labels.length === 0 && !creating && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {translate('auto.components.LocalTaskList.no_labels', 'No labels yet')}
            </div>
          )}
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              checked={selectedIds.includes(label.id)}
              onToggle={() => onToggleLabel(label.id)}
              onUpdate={(name, color) => onUpdateLabel(label.id, name, color)}
              onDelete={() => onDeleteLabel(label.id)}
            />
          ))}
        </div>
        {creating ? (
          <CreateLabelForm
            onSave={(name, color) => {
              onCreateLabel(name, color)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 border-t border-border/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30"
          >
            <Plus className="size-3" />
            {translate('auto.components.LocalTaskList.create_label', 'Create label')}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function LabelRow({
  label,
  checked,
  onToggle,
  onUpdate,
  onDelete
}: {
  label: LocalTaskLabel
  checked: boolean
  onToggle: () => void
  onUpdate: (name: string, color: string) => void
  onDelete: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(label.name)
  const [editColor, setEditColor] = useState(label.color)

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 border-b border-border/30 px-3 py-1.5">
        <ColorDotPicker color={editColor} onChange={setEditColor} />
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editName.trim()) {
              onUpdate(editName.trim(), editColor)
              setEditing(false)
            }
            if (e.key === 'Escape') {
              setEditing(false)
            }
          }}
          className="h-6 flex-1 text-xs"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            if (editName.trim()) {
              onUpdate(editName.trim(), editColor)
              setEditing(false)
            }
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Check className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2 border-b border-border/30 px-3 py-2 hover:bg-muted/20">
      <button type="button" onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="size-3.5 shrink-0 rounded-full border border-border/50"
          style={{ backgroundColor: label.color }}
        />
        <span className="truncate text-xs text-foreground">{label.name}</span>
        {checked && <Check className="size-3 shrink-0 text-foreground" />}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => {
            setEditName(label.name)
            setEditColor(label.color)
            setEditing(true)
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-2.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-2.5" />
        </button>
      </div>
    </div>
  )
}

function CreateLabelForm({
  onSave,
  onCancel
}: {
  onSave: (name: string, color: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0]!)

  return (
    <div className="border-t border-border/40 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <ColorDotPicker color={color} onChange={setColor} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onSave(name.trim(), color)
            }
            if (e.key === 'Escape') {
              onCancel()
            }
          }}
          placeholder={translate('auto.components.LocalTaskList.label_name', 'Label name')}
          className="h-6 flex-1 text-xs"
          autoFocus
        />
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => {
            if (name.trim()) {
              onSave(name.trim(), color)
            }
          }}
          disabled={!name.trim()}
        >
          <Check className="size-3" />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onCancel}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DEFAULT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="size-5 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : undefined
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ColorDotPicker({
  color,
  onChange
}: {
  color: string
  onChange: (color: string) => void
}): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-4 shrink-0 rounded-full border border-border/50"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start">
        <div className="grid grid-cols-4 gap-2">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="size-7 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : undefined
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
