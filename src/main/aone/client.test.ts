import { describe, expect, it } from 'vitest'
import { isAoneCodeRemoteUrl } from './client'

describe('Aone client remote detection', () => {
  it('detects Alibaba-hosted code remotes by host suffix', () => {
    expect(isAoneCodeRemoteUrl('https://code.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('https://gitlab.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('git@gitlab.alibaba-inc.com:group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('ssh://git@future-code.alibaba-inc.com/group/repo.git')).toBe(true)
  })

  it('does not match non-host occurrences of the Alibaba domain', () => {
    expect(isAoneCodeRemoteUrl('https://github.com/alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('https://not-alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('git@github.com:alibaba-inc.com/repo.git')).toBe(false)
  })
})
