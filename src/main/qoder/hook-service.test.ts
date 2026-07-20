import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/userData' } }))

import { qoderHookService } from './hook-service'

describe('QoderHookService', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('installs supported hooks without replacing user hooks', () => {
    const home = mkdtempSync(join(tmpdir(), 'orca-qoder-hooks-'))
    vi.stubEnv('HOME', home)
    vi.stubEnv('USERPROFILE', home)
    try {
      const qoderDir = join(home, '.qoder')
      mkdirSync(qoderDir, { recursive: true })
      writeFileSync(
        join(qoderDir, 'settings.json'),
        JSON.stringify({
          hooks: { Stop: [{ hooks: [{ type: 'command', command: 'user-hook' }] }] }
        })
      )

      expect(qoderHookService.install().state).toBe('installed')
      const settings = JSON.parse(readFileSync(join(qoderDir, 'settings.json'), 'utf8'))
      expect(settings.hooks.Stop[0].hooks[0].command).toBe('user-hook')
      expect(settings.hooks.UserPromptSubmit).toHaveLength(1)
      expect(settings.hooks.StopFailure).toBeUndefined()
      expect(settings.hooks.TeammateIdle).toBeUndefined()

      const scriptName = process.platform === 'win32' ? 'qoder-hook.cmd' : 'qoder-hook.sh'
      const script = readFileSync(join(home, '.orca', 'agent-hooks', scriptName), 'utf8')
      expect(script).toContain('/hook/qoder')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})
