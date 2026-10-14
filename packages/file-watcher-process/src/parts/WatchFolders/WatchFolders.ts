import { FSWatcher } from 'chokidar'
import ignore, { type Ignore } from 'ignore'
import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve, sep } from 'node:path'
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

const canonical = (path: string): string => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))

const normalizeName = (name: string): string => (['win32', 'darwin'].includes(process.platform) ? name.toLowerCase() : name)

export const createChildNamesFilter = (root: string, childNames: readonly string[]): ((path: string) => boolean) => {
  const base = canonical(root)
  const names = new Set(childNames.map(normalizeName))
  return (path: string): boolean => {
    const current = canonical(path)
    if (current === base || base.startsWith(current.endsWith(sep) ? current : `${current}${sep}`)) return false
    return dirname(current) !== base || !names.has(normalizeName(basename(current)))
  }
}

const send = (event: unknown): void => {
  void SharedProcess.invoke('FileWatcher.handleChange', event).catch((error) => {
    console.error(`[file-watcher-process] ${error}`)
  })
}

export const watchFolders = async ({
  childNames,
  depth,
  exclude,
  id,
  roots,
  useGitIgnore = false,
}: {
  roots: readonly string[]
  childNames?: readonly string[]
  depth?: number
  id: number
  exclude: readonly string[]
  useGitIgnore?: boolean
}): Promise<WatchResult.WatchResult> => {
  if (
    childNames !== undefined &&
    (depth !== 0 ||
      !Array.isArray(childNames) ||
      childNames.some((name) => typeof name !== 'string' || !name || /[\\/]/.test(name)))
  ) {
    return WatchResult.fromError(new Error('childNames require depth 0 and immediate child names'))
  }
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
      const excluded = useGitIgnore ? await createIgnored(path, exclude, true) : createExcludedNamesFilter(exclude)
      const childFilter = childNames === undefined ? undefined : createChildNamesFilter(path, childNames)
      const ignored = (candidate: string, stats?: { isDirectory(): boolean }): boolean =>
        excluded(candidate, stats) || !!childFilter?.(candidate)
      controller.signal.throwIfAborted()
      const watcher = new FSWatcher({
        ...(depth !== undefined && { depth }),
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
