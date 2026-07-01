import { Filter, Grid3X3, List, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import type { DiscoveredSkill, SavedSkill, SkillProvider } from '../../../../shared/skills'
import { SkillListItem } from './SkillListItem'
import { providerLabels, sourceLabels } from './skill-display-labels'
import { filterSkills, type SkillsFilterState } from './skills-filter'

type ViewMode = 'grid' | 'list'

type SkillsMySkillsTabProps = {
  skills: DiscoveredSkill[]
  savedSkills: SavedSkill[]
  savedSkillIds: Set<string>
  loading: boolean
  onRefresh: () => void
  onToggleSaved: (skill: DiscoveredSkill) => void
}

export function SkillsMySkillsTab({
  skills,
  savedSkills,
  savedSkillIds,
  loading,
  onRefresh,
  onToggleSaved
}: SkillsMySkillsTabProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState<SkillsFilterState>({
    query: '',
    sourceKind: 'all',
    provider: 'all'
  })

  const baseSkills = useMemo(() => {
    const savedOrder = new Map(savedSkills.map((skill, index) => [skill.id, index]))
    return [...skills].sort((left, right) => {
      const leftSaved = savedSkillIds.has(left.id)
      const rightSaved = savedSkillIds.has(right.id)
      if (leftSaved !== rightSaved) {
        return leftSaved ? -1 : 1
      }
      if (leftSaved && rightSaved) {
        return (savedOrder.get(left.id) ?? 0) - (savedOrder.get(right.id) ?? 0)
      }
      return left.name.localeCompare(right.name)
    })
  }, [savedSkillIds, savedSkills, skills])

  const visibleSkills = useMemo(() => filterSkills(baseSkills, filters), [baseSkills, filters])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="rounded-md bg-background/50 p-0.5"
        >
          <ToggleGroupItem value="grid" size="sm" className="size-7 p-0">
            <Grid3X3 className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" size="sm" className="size-7 p-0">
            <List className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Select
          value={filters.sourceKind}
          onValueChange={(sourceKind) =>
            setFilters((current) => ({
              ...current,
              sourceKind: sourceKind as SkillsFilterState['sourceKind']
            }))
          }
        >
          <SelectTrigger className="h-7 w-[126px] gap-1 text-xs">
            <Filter className="size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {translate('auto.components.skills.SkillsMySkillsTab.0bc1379f4c', 'All Sources')}
            </SelectItem>
            {Object.entries(sourceLabels).map(([sourceKind, label]) => (
              <SelectItem key={sourceKind} value={sourceKind}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.provider}
          onValueChange={(provider) =>
            setFilters((current) => ({
              ...current,
              provider: provider as SkillProvider | 'all'
            }))
          }
        >
          <SelectTrigger className="h-7 w-[128px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {translate('auto.components.skills.SkillsMySkillsTab.6ff0066db6', 'All Agents')}
            </SelectItem>
            {Object.entries(providerLabels).map(([provider, label]) => (
              <SelectItem key={provider} value={provider}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative ml-auto min-w-[200px] flex-1 md:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
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
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
          {translate('auto.components.skills.SkillsMySkillsTab.cb142070b4', 'Refresh')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {visibleSkills.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {baseSkills.length === 0
              ? translate(
                  'auto.components.skills.SkillsMySkillsTab.1763807994',
                  'No skills installed'
                )
              : translate(
                  'auto.components.skills.SkillsMySkillsTab.7b05bec066',
                  'No skills match the current filters'
                )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3'
                : 'flex flex-col gap-2'
            }
          >
            {visibleSkills.map((skill) => (
              <SkillListItem
                key={skill.id}
                skill={skill}
                saved={savedSkillIds.has(skill.id)}
                compact={viewMode === 'list'}
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
