// First-pass Aone task list rendering. Reads work items from the local `a1`
// CLI via `window.api.aone.listWorkItems`. UI is intentionally minimal — one
// row per work item with identifier, subject, status, assignee — so users can
// at least see the integration working end-to-end. Detail views, comments,
// status edits, and workspace launches are reserved for later iterations once
// the a1 task surface stabilizes.

import { useCallback, useEffect, useState } from 'react'
import { Briefcase, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

type AoneWorkItem = {
  identifier: string
  subject: string
  status: string
  assignedTo?: string | null
  workitemType?: string | null
  categoryIdentifier?: string | null
  spaceIdentifier?: string | null
  gmtModified?: string | null
}

type AoneListResult =
  | { ok: true; data: AoneWorkItem[] }
  | { ok: false; code: string; error: string }

type AoneApiSurface = {
  listWorkItems: (args?: unknown) => Promise<unknown>
}

function getAoneApi(): AoneApiSurface | null {
  const api = (window as unknown as { api?: { aone?: AoneApiSurface } }).api
  return api?.aone ?? null
}

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: AoneWorkItem[] }
  | { kind: 'error'; code: string; message: string }

export function AoneTaskList(): React.JSX.Element {
  const [state, setState] = useState<FetchState>({ kind: 'idle' })

  const load = useCallback(async () => {
    const api = getAoneApi()
    if (!api) {
      setState({
        kind: 'error',
        code: 'unsupported',
        message: translate(
          'auto.components.TaskPage.aone_list_unsupported',
          'Aone task API is not available in this build.'
        )
      })
      return
    }
    setState({ kind: 'loading' })
    try {
      const result = (await api.listWorkItems({ pageSize: 200 })) as AoneListResult
      if (!result.ok) {
        setState({ kind: 'error', code: result.code, message: result.error })
        return
      }
      setState({ kind: 'ready', items: result.data })
    } catch (error) {
      setState({
        kind: 'error',
        code: 'unknown',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col">
      <AoneListHeader onRefresh={load} loading={state.kind === 'loading'} />
      <div className="scrollbar-sleek flex-1 overflow-auto px-4 pb-6">
        <AoneListBody state={state} />
      </div>
    </div>
  )
}

function AoneListHeader({
  onRefresh,
  loading
}: {
  onRefresh: () => void
  loading: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
      <div className="flex items-center gap-2">
        <Briefcase className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {translate('auto.components.TaskPage.aone_list_title', 'Aone work items')}
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
      </Button>
    </div>
  )
}

function AoneListBody({ state }: { state: FetchState }): React.JSX.Element {
  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
      </div>
    )
  }
  if (state.kind === 'error') {
    return <AoneListError code={state.code} message={state.message} />
  }
  if (state.items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {translate('auto.components.TaskPage.aone_list_empty', 'No Aone work items returned.')}
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border/40">
      {state.items.map((item) => (
        <AoneListRow key={item.identifier} item={item} />
      ))}
    </ul>
  )
}

function AoneListError({ code, message }: { code: string; message: string }): React.JSX.Element {
  const hint =
    code === 'binary_missing'
      ? translate(
          'auto.components.TaskPage.aone_list_install',
          'Install the a1 CLI from https://a1.io.alibaba-inc.com/ and reopen this view.'
        )
      : code === 'auth_required'
        ? translate(
            'auto.components.TaskPage.aone_list_auth',
            'Run `a1 auth login --buc` in a terminal, then refresh.'
          )
        : code === 'not_linked'
          ? translate(
              'auto.components.TaskPage.aone_list_link',
              'Run `a1 link` inside an Aone-managed repository to bind a project, then refresh.'
            )
          : null
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-md border border-border/40 bg-muted/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {translate(
          'auto.components.TaskPage.aone_list_error_title',
          'Could not load Aone work items'
        )}
      </p>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">{message}</p>
      {hint ? <p className="mt-2 max-w-sm text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function AoneListRow({ item }: { item: AoneWorkItem }): React.JSX.Element {
  const category = item.categoryIdentifier ?? item.workitemType ?? null
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase',
          'border-border/50 bg-background text-muted-foreground'
        )}
      >
        {category ?? 'Item'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.subject}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          #{item.identifier}
          {item.spaceIdentifier ? ` · ${item.spaceIdentifier}` : ''}
          {item.gmtModified ? ` · ${item.gmtModified}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
          {item.status}
        </span>
        {item.assignedTo ? <span className="text-muted-foreground">{item.assignedTo}</span> : null}
      </div>
    </li>
  )
}
