import { useCallback } from 'react'
import { useAppStore } from '../../store'

export function useIdealabStatusBarToggle(): {
  checked: boolean
  setChecked: (enabled: boolean) => void
} {
  const settings = useAppStore((s) => s.settings)
  const statusBarItems = useAppStore((s) => s.statusBarItems)
  const toggleStatusBarItem = useAppStore((s) => s.toggleStatusBarItem)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const refreshRateLimits = useAppStore((s) => s.refreshRateLimits)
  const recordFeatureInteraction = useAppStore((s) => s.recordFeatureInteraction)

  const setChecked = useCallback(
    (enabled: boolean) => {
      recordFeatureInteraction('usage-tracking')
      const hasStatusBarItem = statusBarItems.includes('idealab')
      if (enabled !== hasStatusBarItem) {
        toggleStatusBarItem('idealab')
      }
      void updateSettings({ idealabUsageEnabled: enabled }).then(() => {
        void refreshRateLimits()
      })
    },
    [
      recordFeatureInteraction,
      refreshRateLimits,
      statusBarItems,
      toggleStatusBarItem,
      updateSettings
    ]
  )

  return {
    checked: settings?.idealabUsageEnabled === true && statusBarItems.includes('idealab'),
    setChecked
  }
}
