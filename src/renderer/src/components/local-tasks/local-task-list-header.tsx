import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, Plus, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

export function LocalTaskListHeader({
  searchQuery,
  onSearchQueryChange,
  loading,
  onRefresh,
  onNewTask
}: {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  loading: boolean
  onRefresh: () => void
  onNewTask: () => void
}): React.JSX.Element {
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => onSearchQueryChange(value), 300)
    },
    [onSearchQueryChange]
  )

  return (
    <div className="min-w-0 rounded-md rounded-b-none border border-border/50 bg-muted/50 px-3 pt-2 pb-2.5 shadow-sm">
      {/* Row 1: action buttons */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">
          {translate('auto.components.LocalTaskList.local_tasks', 'Local Tasks')}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onNewTask}
                className="size-8 border-border/50 bg-transparent hover:bg-muted/50 backdrop-blur-md supports-[backdrop-filter]:bg-transparent"
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.LocalTaskList.new_task', 'New task')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
                className="size-8 border-border/50 bg-transparent hover:bg-muted/50 backdrop-blur-md supports-[backdrop-filter]:bg-transparent"
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.LocalTaskList.refresh', 'Refresh')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Row 2: search bar */}
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={translate('auto.components.LocalTaskList.search', 'Search local tasks...')}
            className="h-8 rounded-md border-border/50 bg-background pl-8 pr-8 text-xs"
          />
          {localSearch ? (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
