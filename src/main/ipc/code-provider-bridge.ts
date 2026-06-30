// Provider routing helper used by IPC handlers that need to dispatch a single
// semantic call to either gh (GitHub) or a1 (Aone Code). Auto-detection looks
// at the repo's origin URL — Aone Code repos go through a1, anything else
// keeps the existing gh path. This keeps IPC handlers free of provider
// branching while preserving the standard GitHub flow for non-Aone repos.

import { getRemoteUrl } from '../git/repo'
import { isAoneCodeRemoteUrl } from '../aone/client'

export type CodeProvider = 'github' | 'code'

export function detectCodeProvider(repoPath: string | null | undefined): CodeProvider {
  if (!repoPath) {
    return 'github'
  }
  try {
    const remoteUrl = getRemoteUrl(repoPath)
    return isAoneCodeRemoteUrl(remoteUrl) ? 'code' : 'github'
  } catch {
    return 'github'
  }
}

export async function routeByCodeProvider<T>(
  repoPath: string | null | undefined,
  githubImpl: () => Promise<T>,
  aoneImpl: () => Promise<T>
): Promise<T> {
  const provider = detectCodeProvider(repoPath)
  return provider === 'code' ? aoneImpl() : githubImpl()
}
