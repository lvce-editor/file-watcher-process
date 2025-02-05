import { watch } from 'chokidar'
import { fileURLToPath } from 'node:url'
import * as NormalizeEvent2 from '../NormalizeEvent2/NormalizeEvent2.ts'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WaitForWatcherToBeReady from '../WaitForWatcherToBeReady/WaitForWatcherToBeReady.ts'

export const watchFolders = async ({
  roots,
  id,
  exclude,
}: {
  roots: readonly string[]
  id: number
  exclude: readonly string[]
}): Promise<void> => {
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

  const watchers = roots.map((root) => {
    const path = fileURLToPath(root)
    const watcher = watch(path, {
      ignoreInitial: true,
      ignorePermissionErrors: true,
    })
    return watcher
  })
  await Promise.all(watchers.map(WaitForWatcherToBeReady.waitForWatcherToBeReady))
  for (const watcher of watchers) {
    watcher.on('all', callback)
  }
}
