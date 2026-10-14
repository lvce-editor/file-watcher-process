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
): Promise<(path: string, stats?: { isDirectory(): boolean }) => boolean> => {
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

const send = (event: unknown): void => {
  void SharedProcess.invoke('FileWatcher.handleChange', event).catch((error) => {
    console.error(`[file-watcher-process] ${error}`)
  })
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
  if (WatcherState.has(id)) {
    return WatchResult.fromError(new Error(`watcher ${id} is already registered`))
  }
  const controller = new AbortController()
  const watcherEntries: { readonly readyPromise: Promise<void>; readonly watcher: FSWatcher }[] = []
  let ready = false
  let closing: Promise<unknown> | undefined
  const callback = (eventName: string, path: string): void => {
    if (!controller.signal.aborted) {
      send(NormalizeEvent2.normalizeEvent2(id, eventName, path))
    }
  }
  const errorCallback = (error: unknown): void => {
    console.error(`[file-watcher-process] ${error}`)
    if (controller.signal.aborted) return
    if (ready) {
      send({ ...WatchResult.fromError(error), eventName: 'error', id, uri: '' })
    }
    controller.abort(error)
  }
  controller.signal.addEventListener(
    'abort',
    () => {
      WatcherState.remove(id)
      closing = Promise.allSettled(watcherEntries.map(({ watcher }) => watcher.close()))
    },
    { once: true },
  )
  // Register before asynchronous setup so disposal also cancels a pending watch.
  WatcherState.add(id, controller)
  try {
    for (const root of roots) {
      controller.signal.throwIfAborted()
      const path = fileURLToPath(root)
      const ignored = useGitIgnore ? await createIgnored(path, exclude, true) : createExcludedNamesFilter(exclude)
      controller.signal.throwIfAborted()
      const watcher = new FSWatcher({
        ignored,
        ignoreInitial: true,
        ignorePermissionErrors: false,
      })
      watcher.on('error', errorCallback)
      watcher.on('all', callback)
      const readyPromise = WaitForWatcherToBeReady.waitForWatcherToBeReady(watcher, controller.signal)
      // Later roots can fail before Promise.all is reached.
      void readyPromise.catch(() => {})
      watcherEntries.push({ readyPromise, watcher })
      watcher.add(path)
    }
    await Promise.all(watcherEntries.map(({ readyPromise }) => readyPromise))
    controller.signal.throwIfAborted()
    ready = true
    const inotifyWatchCount = await GetInotifyWatchCount.getInotifyWatchCount()
    controller.signal.throwIfAborted()
    return inotifyWatchCount === undefined ? WatchResult.success : WatchResult.successWithInotifyWatchCount(inotifyWatchCount)
  } catch (error) {
    controller.abort(error)
    await closing
    return WatchResult.fromError(error)
  }
}
