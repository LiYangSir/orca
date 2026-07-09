import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'

import { createRichMarkdownExtensions } from '@/components/editor/rich-markdown-extensions'
import { encodeRawMarkdownHtmlForRichEditor } from '@/components/editor/raw-markdown-html'
import { LinearIssueMarkdownToolbar } from '@/components/LinearIssueMarkdownToolbar'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

function createLocalTaskMarkdownExtensions() {
  return [
    ...createRichMarkdownExtensions(),
    Placeholder.configure({
      placeholder: translate(
        'auto.components.LocalTaskMarkdownEditor.placeholder',
        'Add description...'
      )
    })
  ]
}

export function LocalTaskMarkdownEditor({
  value,
  onSave,
  className
}: {
  value: string
  onSave: (value: string) => void
  className?: string
}): React.JSX.Element {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const lastEditorMarkdownRef = useRef(value)
  const editorRef = useRef<Editor | null>(null)

  const extensions = useMemo(() => {
    void language
    return createLocalTaskMarkdownExtensions()
  }, [language])

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: encodeRawMarkdownHtmlForRichEditor(value),
      contentType: 'markdown',
      editorProps: {
        attributes: {
          class: 'rich-markdown-editor',
          'aria-label': translate(
            'auto.components.LocalTaskMarkdownEditor.task_description',
            'Task description'
          )
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && (isMac ? event.metaKey : event.ctrlKey)) {
            event.preventDefault()
            editorRef.current?.commands.blur()
            return true
          }
          return false
        }
      },
      onBlur: ({ editor: nextEditor }) => {
        const nextValue = nextEditor.getMarkdown()
        lastEditorMarkdownRef.current = nextValue
        onSave(nextValue)
      },
      onUpdate: ({ editor: nextEditor }) => {
        lastEditorMarkdownRef.current = nextEditor.getMarkdown()
      }
    },
    [language]
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor || value === lastEditorMarkdownRef.current) {
      return
    }
    const currentMarkdown = editor.getMarkdown()
    if (currentMarkdown === value) {
      lastEditorMarkdownRef.current = value
      return
    }
    editor.commands.setContent(encodeRawMarkdownHtmlForRichEditor(value), {
      contentType: 'markdown',
      emitUpdate: false
    })
    lastEditorMarkdownRef.current = value
  }, [editor, value])

  const submitLabel = isMac ? '⌘ Enter' : 'Ctrl+Enter'

  return (
    <div
      className={cn('linear-issue-markdown-editor linear-issue-markdown-editor-page', className)}
    >
      <LinearIssueMarkdownToolbar editor={editor} disabled={false} />
      <div className="linear-issue-markdown-scroll scrollbar-sleek">
        <EditorContent editor={editor} />
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground/75">
        <span>
          {submitLabel} {translate('auto.components.LocalTaskMarkdownEditor.save', 'save')}
        </span>
        <span className="text-muted-foreground/35">&middot;</span>
        <span>{translate('auto.components.LocalTaskMarkdownEditor.markdown', 'Markdown')}</span>
      </div>
    </div>
  )
}

export function LocalTaskCommentInput({
  onSubmit,
  submitting
}: {
  onSubmit: (content: string) => void
  submitting: boolean
}): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const value = textareaRef.current?.value.trim()
    if (!value || submitting) {
      return
    }
    onSubmit(value)
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }, [onSubmit, submitting])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) {
      return
    }
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [])

  const submitLabel = isMac ? '⌘ Enter' : 'Ctrl+Enter'

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        disabled={submitting}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={2}
        placeholder={translate(
          'auto.components.LocalTaskMarkdownEditor.comment_placeholder',
          'Add a comment...'
        )}
        className="w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/45 focus:border-border focus:ring-1 focus:ring-ring scrollbar-sleek"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/60">
          {submitLabel}{' '}
          {translate('auto.components.LocalTaskMarkdownEditor.to_submit', 'to submit')}
        </span>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
        >
          {translate('auto.components.LocalTaskMarkdownEditor.comment', 'Comment')}
        </button>
      </div>
    </div>
  )
}
