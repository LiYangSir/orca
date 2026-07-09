import type { LocalTaskLabel } from '../../../../shared/local-task-types'

export function LabelChip({
  label,
  maxWidth
}: {
  label: LocalTaskLabel
  maxWidth?: string
}): React.JSX.Element {
  return (
    <span
      className="inline-flex shrink-0 items-center truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-snug"
      style={{
        backgroundColor: `${label.color}1A`,
        border: `1px solid ${label.color}30`,
        color: label.color,
        maxWidth: maxWidth ?? '80px'
      }}
    >
      {label.name}
    </span>
  )
}
