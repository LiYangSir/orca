import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type {
  LocalTask,
  LocalTaskActivity,
  LocalTaskComment
} from '../../../../shared/local-task-types'
import { StatusIcon } from './local-task-status-priority'
import { LocalTaskMarkdownEditor } from './local-task-markdown-editor'
import { ActivitySection, CommentsSection } from './local-task-activity-comments'

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function LocalTaskDetailContent({
  task,
  allTasks,
  onUpdate,
  onCreateSubtask,
  onCycleSubtaskStatus,
  onDeleteSubtask,
  onOpenSubtask
}: {
  task: LocalTask
  allTasks: LocalTask[]
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  onCreateSubtask: (parentId: string, title: string) => void
  onCycleSubtaskStatus: (subtask: LocalTask) => void
  onDeleteSubtask: (id: string) => void
  onOpenSubtask: (id: string) => void
}): React.JSX.Element {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const [comments, setComments] = useState<LocalTaskComment[]>([])
  const [activities, setActivities] = useState<LocalTaskActivity[]>([])
  const [submittingComment, setSubmittingComment] = useState(false)

  const subtasks = allTasks.filter((t) => t.parentId === task.id)

  useEffect(() => {
    setTitleDraft(task.title)
  }, [task.id, task.title])

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
      autoResizeTextarea(titleRef.current)
    }
  }, [editingTitle])

  useEffect(() => {
    void loadCommentsAndActivities(task.id)
  }, [task.id])

  const loadCommentsAndActivities = async (taskId: string): Promise<void> => {
    if (!window.api?.localTaskComments || !window.api?.localTaskActivities) {
      return
    }
    const [commentsRes, activitiesRes] = await Promise.all([
      window.api.localTaskComments.list({ taskId }) as Promise<ApiResult<LocalTaskComment[]>>,
      window.api.localTaskActivities.list({ taskId }) as Promise<ApiResult<LocalTaskActivity[]>>
    ])
    if (commentsRes.ok) {
      setComments(commentsRes.data)
    }
    if (activitiesRes.ok) {
      setActivities(activitiesRes.data)
    }
  }

  const saveTitle = (): void => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    }
    setEditingTitle(false)
  }

  const saveDescription = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (trimmed !== (task.description ?? '')) {
        onUpdate(task.id, { description: trimmed || undefined })
      }
    },
    [task.id, task.description, onUpdate]
  )

  const handleSubmitComment = useCallback(
    async (content: string) => {
      if (!window.api?.localTaskComments) {
        return
      }
      setSubmittingComment(true)
      const optimistic: LocalTaskComment = {
        id: `optimistic-${Date.now()}`,
        taskId: task.id,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      setComments((prev) => [...prev, optimistic])
      await window.api.localTaskComments.create({ taskId: task.id, content })
      await loadCommentsAndActivities(task.id)
      setSubmittingComment(false)
    },
    [task.id]
  )

  return (
    <main className="min-w-0">
      {editingTitle ? (
        <textarea
          ref={titleRef}
          value={titleDraft}
          rows={1}
          onChange={(e) => {
            setTitleDraft(e.target.value)
            autoResizeTextarea(e.target)
          }}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              saveTitle()
            }
            if (e.key === 'Escape') {
              setTitleDraft(task.title)
              setEditingTitle(false)
            }
          }}
          className="block w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1 py-0 text-[28px] font-semibold leading-tight text-foreground outline-none focus-visible:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
        />
      ) : (
        <h1
          role="button"
          tabIndex={0}
          onClick={() => setEditingTitle(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingTitle(true)
            }
          }}
          className={cn(
            'cursor-text rounded-md border border-transparent px-1 py-0 text-[28px] font-semibold leading-tight transition hover:border-border/50 hover:bg-accent/40',
            task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </h1>
      )}

      <LocalTaskMarkdownEditor value={task.description ?? ''} onSave={saveDescription} />

      <SubtaskSection
        subtasks={subtasks}
        parentId={task.id}
        onCreateSubtask={onCreateSubtask}
        onCycleStatus={onCycleSubtaskStatus}
        onDelete={onDeleteSubtask}
        onOpen={onOpenSubtask}
      />

      <section className="mt-12 border-t border-border/60 pt-9">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            {translate('auto.components.LocalTaskDetailContent.activity', 'Activity')}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{translate('auto.components.LocalTaskDetailContent.created', 'Created')}</span>
            <span className="text-foreground">{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <ActivitySection activities={activities} />

        <div className={activities.length > 0 ? 'mt-7' : ''}>
          <CommentsSection
            comments={comments}
            submitting={submittingComment}
            onSubmit={handleSubmitComment}
          />
        </div>
      </section>
    </main>
  )
}

function autoResizeTextarea(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function SubtaskSection({
  subtasks,
  parentId,
  onCreateSubtask,
  onCycleStatus,
  onDelete,
  onOpen
}: {
  subtasks: LocalTask[]
  parentId: string
  onCreateSubtask: (parentId: string, title: string) => void
  onCycleStatus: (task: LocalTask) => void
  onDelete: (id: string) => void
  onOpen: (id: string) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) {
      inputRef.current?.focus()
    }
  }, [adding])

  const handleCreate = (): void => {
    const trimmed = newTitle.trim()
    if (trimmed) {
      onCreateSubtask(parentId, trimmed)
      setNewTitle('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {translate('auto.components.LocalTaskDetailContent.subtasks', 'Sub-tasks')}
          {subtasks.length > 0 ? (
            <span className="ml-1.5 text-xs text-muted-foreground/60">{subtasks.length}</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3" />
          {translate('auto.components.LocalTaskDetailContent.add_subtask', 'Add')}
        </button>
      </div>

      {subtasks.length > 0 ? (
        <div className="mt-3 space-y-0.5">
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="group/sub flex min-h-8 items-center gap-2 rounded-md px-2 py-1 transition hover:bg-accent"
            >
              <button type="button" onClick={() => onCycleStatus(sub)} className="shrink-0">
                <StatusIcon status={sub.status} className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpen(sub.id)}
                className={cn(
                  'min-w-0 flex-1 truncate text-left text-sm',
                  sub.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                )}
              >
                {sub.title}
              </button>
              <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition group-hover/sub:opacity-100" />
              <button
                type="button"
                onClick={() => onDelete(sub.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover/sub:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {adding ? (
        <div className="mt-2">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate()
              }
              if (e.key === 'Escape') {
                setAdding(false)
                setNewTitle('')
              }
            }}
            placeholder={translate(
              'auto.components.LocalTaskDetailContent.subtask_title',
              'Sub-task title...'
            )}
            className="w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/45 focus:border-border focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-[10px] text-muted-foreground/50">
            {translate(
              'auto.components.LocalTaskDetailContent.subtask_hint',
              'Enter to add, Esc to close'
            )}
          </p>
        </div>
      ) : null}
    </section>
  )
}
