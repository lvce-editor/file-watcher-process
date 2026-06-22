import type { FSWatcher } from 'chokidar'

export const waitForWatcherToBeReady = async (watcher: FSWatcher): Promise<void> => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  const cleanup = (): void => {
    watcher.off('ready', handleReady)
    watcher.off('error', handleError)
  }
  const handleReady = (): void => {
    cleanup()
    resolve()
  }
  const handleError = (error: unknown): void => {
    cleanup()
    reject(error)
  }
  watcher.on('ready', handleReady)
  watcher.on('error', handleError)
  await promise
}
