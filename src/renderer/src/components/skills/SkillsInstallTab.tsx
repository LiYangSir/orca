import {
  Archive,
  Check,
  Download,
  FolderInput,
  FolderSearch,
  GitBranch,
  Search
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { translate } from '@/i18n/i18n'
import type { SkillsInstallTab as SkillsInstallTabValue } from './skills-page-tabs'
import { skillsInstallTabs } from './skills-page-tabs'

type SkillsInstallTabProps = {
  loading: boolean
  onScanInstalled: () => void
}

function getInstallTabLabel(tab: SkillsInstallTabValue): string {
  switch (tab) {
    case 'market':
      return translate('auto.components.skills.SkillsInstallTab.e6252b3d68', 'Market')
    case 'local':
      return translate('auto.components.skills.SkillsInstallTab.0c74e7ff34', 'Local')
    case 'git':
      return translate('auto.components.skills.SkillsInstallTab.11fd2a7db8', 'Git')
  }
}

export function SkillsInstallTab({
  loading,
  onScanInstalled
}: SkillsInstallTabProps): React.JSX.Element {
  const [activeInstallTab, setActiveInstallTab] = useState<SkillsInstallTabValue>('market')

  return (
    <Tabs
      value={activeInstallTab}
      onValueChange={(value) => setActiveInstallTab(value as SkillsInstallTabValue)}
      className="h-full gap-0"
    >
      <div className="border-b border-border/50 px-4 py-2">
        <TabsList variant="line" className="h-auto justify-start">
          {skillsInstallTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="h-7 px-3 py-1 text-xs">
              {getInstallTabLabel(tab.id)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="market" className="m-0 h-full overflow-auto p-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={translate(
                'auto.components.skills.SkillsInstallTab.091cb1f05f',
                'Search marketplace...'
              )}
              className="h-8 bg-background/50 pl-8 text-xs"
              disabled
            />
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-sm font-medium">
              {translate(
                'auto.components.skills.SkillsInstallTab.d756071efe',
                'Marketplace installation is not connected yet.'
              )}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {translate(
                'auto.components.skills.SkillsInstallTab.c263ea6384',
                'This keeps the Superset tab structure while leaving the install provider behind a narrow extension point for the future marketplace API.'
              )}
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="local" className="m-0 h-full overflow-auto p-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {translate('auto.components.skills.SkillsInstallTab.703f136a7b', 'Auto Detect')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {translate(
                    'auto.components.skills.SkillsInstallTab.48e934a011',
                    'Scan Codex, Claude, bundled, plugin, and repository skill roots.'
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1.5 text-xs"
                disabled={loading}
                onClick={onScanInstalled}
              >
                <FolderSearch className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
                {translate('auto.components.skills.SkillsInstallTab.87f33d6694', 'Scan Installed')}
              </Button>
            </div>
          </div>

          <ImportPlaceholder
            icon={FolderInput}
            title={translate('auto.components.skills.SkillsInstallTab.d72c59a97e', 'Import Folder')}
            placeholder={translate(
              'auto.components.skills.SkillsInstallTab.c0fa279c87',
              'Path to skill folder...'
            )}
          />
          <ImportPlaceholder
            icon={Archive}
            title={translate(
              'auto.components.skills.SkillsInstallTab.86985ad70d',
              'Import Archive'
            )}
            placeholder={translate(
              'auto.components.skills.SkillsInstallTab.c2617825d0',
              'Path to .zip or .skill file...'
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="git" className="m-0 h-full overflow-auto p-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={translate(
                'auto.components.skills.SkillsInstallTab.92984d9f25',
                'Git repository URL...'
              )}
              className="h-8 flex-1 bg-background/50 text-xs"
              disabled
            />
            <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs" disabled>
              <Download className="size-3.5" />
              {translate('auto.components.skills.SkillsInstallTab.3719319720', 'Install')}
            </Button>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="size-3.5" />
              {translate(
                'auto.components.skills.SkillsInstallTab.2a921651ea',
                'Git installer pending'
              )}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {translate(
                'auto.components.skills.SkillsInstallTab.e9652b793e',
                'The tab is preserved so a future installer can land without reshaping the page.'
              )}
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function ImportPlaceholder({
  icon: Icon,
  title,
  placeholder
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  placeholder: string
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-3.5" />
        {title}
      </p>
      <div className="flex gap-2">
        <Input placeholder={placeholder} className="h-8 flex-1 bg-background/50 text-xs" disabled />
        <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs" disabled>
          <Check className="size-3.5" />
          {translate('auto.components.skills.SkillsInstallTab.cf9d382ca1', 'Import')}
        </Button>
      </div>
    </div>
  )
}
