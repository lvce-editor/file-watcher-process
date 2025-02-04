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
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  const callback = (eventName: string, path: string, stats: any): void => {
    void callBackInternal(eventName, path, stats)
  }

  const watchers = roots.map((root) => {
    const path = fileURLToPath(root)
    const watcher = watch(path)
    return watcher
  })

  for (const watcher of watchers) {
    watcher.on('all', callback)
  }

  await Promise.all(watchers.map(WaitForWatcherToBeReady.waitForWatcherToBeReady))
}
