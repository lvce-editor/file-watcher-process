import type { FSWatcher } from 'chokidar'

export const waitForWatcherToBeReady = async (watcher: FSWatcher): Promise<void> => {
  const { resolve, promise } = Promise.withResolvers<void>()
  watcher.on('ready', resolve)
  await promise
}
