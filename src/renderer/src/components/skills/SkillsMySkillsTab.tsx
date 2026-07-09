import { Filter, Grid3X3, List, RefreshCw, Search, Tag } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { CentralSkill, ToolInfo } from '../../../../shared/skills'
import { SkillCard } from './SkillCard'
import { SkillDetailPanel } from './SkillDetailPanel'
import { SOURCE_TYPES } from './skills-view-constants'

type SkillsMySkillsTabProps = {
  skills: CentralSkill[]
  tools?: ToolInfo[]
  loading: boolean
  onDelete?: (skillId: string) => void
  onSyncToTool?: (skillId: string, toolKey: string) => void
  onUnsyncFromTool?: (skillId: string, toolKey: string) => void
  onCheckUpdate?: (skillId: string) => void
  onCheckAllUpdates?: () => void
}

export function SkillsMySkillsTab({
  skills,
  tools,
  loading,
  onDelete,
  onSyncToTool,
  onUnsyncFromTool,
  onCheckUpdate,
  onCheckAllUpdates
}: SkillsMySkillsTabProps): React.JSX.Element {
  const viewMode = useAppStore((s) => s.skillsViewMode)
  const setViewMode = useAppStore((s) => s.setSkillsViewMode)
  const selectedSkillId = useAppStore((s) => s.skillsViewSelectedSkillId)
  const setSelectedSkillId = useAppStore((s) => s.setSkillsViewSelectedSkillId)
  const search = useAppStore((s) => s.skillsViewSearch)
  const setSearch = useAppStore((s) => s.setSkillsViewSearch)
  const filterSourceKind = useAppStore((s) => s.skillsViewFilterSourceKind)
  const setFilterSourceKind = useAppStore((s) => s.setSkillsViewFilterSourceKind)
  const filterTags = useAppStore((s) => s.skillsViewFilterTags)
  const setFilterTags = useAppStore((s) => s.setSkillsViewFilterTags)

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const skill of skills) {
      if (skill.tags) {
        for (const tag of skill.tags) {
          tagSet.add(tag)
        }
      }
    }
    return Array.from(tagSet).sort()
  }, [skills])

  const filtered = useMemo(() => {
    let result = [...skills]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      )
    }

    if (filterSourceKind) {
      result = result.filter((s) => s.sourceType === filterSourceKind)
    }

    if (filterTags.length > 0) {
      result = result.filter((s) => filterTags.some((tag) => s.tags?.includes(tag)))
    }

    result.sort((a, b) => {
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return result
  }, [skills, search, filterSourceKind, filterTags])

  const selectedSkill = selectedSkillId
    ? (skills.find((s) => s.id === selectedSkillId) ?? null)
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-md bg-background/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-accent text-foreground'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            <Grid3X3 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-accent text-foreground'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            <List className="size-3.5" />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 text-xs ${filterSourceKind ? 'bg-accent/50' : ''}`}
            >
              <Filter className="size-3" />
              {filterSourceKind
                ? (SOURCE_TYPES.find((s) => s.id === filterSourceKind)?.label ?? 'Source')
                : translate('auto.components.skills.SkillsMySkillsTab.source', 'Source')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              checked={!filterSourceKind}
              onCheckedChange={() => setFilterSourceKind(null)}
            >
              {translate('auto.components.skills.SkillsMySkillsTab.0bc1379f4c', 'All Sources')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {SOURCE_TYPES.map((src) => (
              <DropdownMenuCheckboxItem
                key={src.id}
                checked={filterSourceKind === src.id}
                onCheckedChange={() =>
                  setFilterSourceKind(filterSourceKind === src.id ? null : src.id)
                }
              >
                {src.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 gap-1 text-xs ${filterTags.length > 0 ? 'bg-accent/50' : ''}`}
              >
                <Tag className="size-3" />
                {translate('auto.components.skills.SkillsMySkillsTab.tags', 'Tags')}
                {filterTags.length > 0 && (
                  <Badge
                    variant="default"
                    className="ml-0.5 flex size-3.5 items-center justify-center rounded-full p-0 text-[9px]"
                  >
                    {filterTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs">
                {translate('auto.components.skills.SkillsMySkillsTab.filterByTag', 'Filter by Tag')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={filterTags.includes(tag)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilterTags([...filterTags, tag])
                    } else {
                      setFilterTags(filterTags.filter((t) => t !== tag))
                    }
                  }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(
              'auto.components.skills.SkillsMySkillsTab.8281b43aa6',
              'Search skills...'
            )}
            className="h-7 bg-background/50 pl-8 text-xs"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onCheckAllUpdates}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          {translate('auto.components.skills.SkillsMySkillsTab.checkUpdates', 'Check Updates')}
        </Button>
      </div>

      <div className="scrollbar-sleek flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {skills.length === 0
              ? translate(
                  'auto.components.skills.SkillsMySkillsTab.1763807994',
                  'No skills installed'
                )
              : translate(
                  'auto.components.skills.SkillsMySkillsTab.7b05bec066',
                  'No skills match the current filters'
                )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {filtered.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                tools={tools}
                viewMode="grid"
                isSelected={selectedSkillId === skill.id}
                onClick={() => setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[minmax(140px,1.2fr)_2fr_auto_auto_auto] items-center gap-x-3 border-b border-border/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{translate('auto.components.skills.SkillsMySkillsTab.colName', 'Name')}</span>
              <span>
                {translate('auto.components.skills.SkillsMySkillsTab.colDesc', 'Description')}
              </span>
              <span>
                {translate('auto.components.skills.SkillsMySkillsTab.colAgents', 'Agents')}
              </span>
              <span className="w-14 text-center">
                {translate('auto.components.skills.SkillsMySkillsTab.colSource', 'Source')}
              </span>
              <span className="w-1.5" />
            </div>
            {filtered.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                tools={tools}
                viewMode="list"
                isSelected={selectedSkillId === skill.id}
                onClick={() => setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)}
              />
            ))}
          </div>
        )}
      </div>

      <SkillDetailPanel
        skill={selectedSkill}
        tools={tools}
        onClose={() => setSelectedSkillId(null)}
        onDelete={(id) => {
          setSelectedSkillId(null)
          onDelete?.(id)
        }}
        onSyncToTool={onSyncToTool}
        onUnsyncFromTool={onUnsyncFromTool}
        onCheckUpdate={onCheckUpdate}
      />
    </div>
  )
}
