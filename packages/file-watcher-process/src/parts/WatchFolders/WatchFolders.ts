import { FSWatcher } from 'chokidar'
import { fileURLToPath } from 'node:url'
import * as GetInotifyWatchCount from '../GetInotifyWatchCount/GetInotifyWatchCount.ts'
import * as NormalizeEvent2 from '../NormalizeEvent2/NormalizeEvent2.ts'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WaitForWatcherToBeReady from '../WaitForWatcherToBeReady/WaitForWatcherToBeReady.ts'
import * as WatchResult from '../WatchResult/WatchResult.ts'

const errorCallback = (error: any): void => {
  console.error(`[file-watcher-process] ${error}`)
}

export const watchFolders = async ({
  exclude,
  id,
  roots,
}: {
  roots: readonly string[]
  id: number
  exclude: readonly string[]
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
      const watcher = new FSWatcher({
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
  const inotifyWatchCount = await GetInotifyWatchCount.getInotifyWatchCount()
  if (inotifyWatchCount === undefined) {
    return WatchResult.success
  }
  return WatchResult.successWithInotifyWatchCount(inotifyWatchCount)
}
