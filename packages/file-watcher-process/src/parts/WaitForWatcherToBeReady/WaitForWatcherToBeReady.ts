import type { FSWatcher } from 'chokidar'

export const waitForWatcherToBeReady = async (watcher: FSWatcher): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  watcher.on('ready', resolve)
  await promise
}
