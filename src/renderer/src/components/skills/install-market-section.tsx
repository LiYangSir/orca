import { Download, Flame, Loader2, Search, Star, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'
import type { SkillsShSkill } from '../../../../shared/skills'

type LeaderboardSort = 'hot' | 'trending' | 'all_time'

const SORT_BUTTONS: {
  id: LeaderboardSort
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'all_time', label: 'All Time', icon: Star }
]

export function MarketSection(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LeaderboardSort>('hot')
  const [skills, setSkills] = useState<SkillsShSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)

  const fetchLeaderboard = async (nextSort: LeaderboardSort): Promise<void> => {
    setSort(nextSort)
    setLoading(true)
    try {
      const result = await window.api.skills.marketplaceFetchLeaderboard({ sort: nextSort })
      setSkills(result)
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (q: string): Promise<void> => {
    setQuery(q)
    if (!q.trim()) {
      return
    }
    setLoading(true)
    try {
      const result = await window.api.skills.marketplaceSearch({ query: q })
      setSkills(result)
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (skill: SkillsShSkill): Promise<void> => {
    setInstalling(skill.id)
    try {
      await window.api.skills.installFromMarketplace({ source: skill.source, name: skill.name })
      toast.success(`Installed ${skill.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/50" />
        <Input
          placeholder={translate(
            'auto.components.skills.SkillsInstallTab.searchMarketplace',
            'Search marketplace...'
          )}
          value={query}
          onChange={(e) => void handleSearch(e.target.value)}
          className="h-8 bg-background/50 pl-8 text-xs"
        />
      </div>

      {!query && (
        <div className="flex gap-1.5">
          {SORT_BUTTONS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={sort === id ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => void fetchLeaderboard(id)}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && skills.length > 0 && (
        <div className="space-y-0.5">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{skill.name}</p>
                <p className="truncate text-xs text-muted-foreground">{skill.source}</p>
              </div>
              {skill.installs > 0 && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {skill.installs.toLocaleString()}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1.5 px-3 text-xs"
                disabled={installing === skill.id}
                onClick={() => void handleInstall(skill)}
              >
                {installing === skill.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                {translate('auto.components.skills.SkillsInstallTab.3719319720', 'Install')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {!loading && skills.length === 0 && !query && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {translate(
            'auto.components.skills.SkillsInstallTab.clickToLoad',
            'Click a sort button to load marketplace skills'
          )}
        </div>
      )}
    </div>
  )
}
