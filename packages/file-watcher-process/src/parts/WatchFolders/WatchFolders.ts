import { FSWatcher } from 'chokidar'
import ignore, { type Ignore } from 'ignore'
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as GetInotifyWatchCount from '../GetInotifyWatchCount/GetInotifyWatchCount.ts'
import * as NormalizeEvent2 from '../NormalizeEvent2/NormalizeEvent2.ts'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WaitForWatcherToBeReady from '../WaitForWatcherToBeReady/WaitForWatcherToBeReady.ts'
import * as WatcherState from '../WatcherState/WatcherState.ts'
import * as WatchResult from '../WatchResult/WatchResult.ts'

const createIgnore = ignore as unknown as () => Ignore

const errorCallback = (error: any): void => {
  console.error(`[file-watcher-process] ${error}`)
}

const loadGitIgnore = async (root: string, enabled: boolean): Promise<Ignore | undefined> => {
  if (!enabled) {
    return undefined
  }
  try {
    const content = await readFile(`${root}/.gitignore`, 'utf8')
    return createIgnore().add(content)
  } catch {
    return undefined
  }
}

const createExcludedNamesFilter = (exclude: readonly string[]): ((path: string) => boolean) => {
  const excludedNames = new Set(exclude)
  return (path: string): boolean => path.split(/[\\/]/).some((part) => excludedNames.has(part))
}

export const createIgnored = async (
  root: string,
  exclude: readonly string[],
  useGitIgnore: boolean,
): Promise<((path: string, stats?: { isDirectory(): boolean }) => boolean)> => {
  const isExcludedName = createExcludedNamesFilter(exclude)
  const gitIgnore = await loadGitIgnore(root, useGitIgnore)
  return (path: string, stats?: { isDirectory(): boolean }): boolean => {
    if (isExcludedName(path)) {
      return true
    }
    if (!gitIgnore) {
      return false
    }
    const relativePath = relative(root, path).replaceAll('\\', '/')
    if (!relativePath || relativePath.startsWith('../')) {
      return false
    }
    const candidate = stats?.isDirectory() ? `${relativePath}/` : relativePath
    return gitIgnore.ignores(candidate)
  }
}

export const watchFolders = async ({
  exclude,
  id,
  roots,
  useGitIgnore = false,
}: {
  roots: readonly string[]
  id: number
  exclude: readonly string[]
  useGitIgnore?: boolean
}): Promise<WatchResult.WatchResult> => {
  const callBackInternal = async (eventName: string, path: string, stats: any): Promise<void> => {
    const event = NormalizeEvent2.normalizeEvent2(id, eventName, path)

    // TODO maybe just use send instead of invoke or
    // send the message to a websocket or message channel directly
    // instead of routing events through shared process
    // which might lock up the shared process in case there are many events
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  const callback = (eventName: string, path: string, stats: any): void => {
    void callBackInternal(eventName, path, stats)
  }

  const watcherEntries: { readonly readyPromise: Promise<void>; readonly watcher: FSWatcher }[] = []
  try {
    for (const root of roots) {
      const path = fileURLToPath(root)
      const ignored = useGitIgnore ? await createIgnored(path, exclude, true) : createExcludedNamesFilter(exclude)
      const watcher = new FSWatcher({
        ignored,
        ignoreInitial: true,
        ignorePermissionErrors: true,
      })
      watcher.on('error', errorCallback)
      const readyPromise = WaitForWatcherToBeReady.waitForWatcherToBeReady(watcher)
      watcherEntries.push({ readyPromise, watcher })
      watcher.add(path)
    }
    await Promise.all(watcherEntries.map(({ readyPromise }) => readyPromise))
  } catch (error) {
    await Promise.allSettled(watcherEntries.map(({ watcher }) => watcher.close()))
    return WatchResult.fromError(error)
  }
  for (const { watcher } of watcherEntries) {
    watcher.on('all', callback)
  }
  const controller = new AbortController()
  controller.signal.addEventListener(
    'abort',
    () => {
      void Promise.allSettled(watcherEntries.map(({ watcher }) => watcher.close()))
    },
    { once: true },
  )
  WatcherState.add(id, controller)
  const inotifyWatchCount = await GetInotifyWatchCount.getInotifyWatchCount()
  if (inotifyWatchCount === undefined) {
    return WatchResult.success
  }
  return WatchResult.successWithInotifyWatchCount(inotifyWatchCount)
}
