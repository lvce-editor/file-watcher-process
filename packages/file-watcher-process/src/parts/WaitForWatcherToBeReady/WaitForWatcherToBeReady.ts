import type { FSWatcher } from 'chokidar'

export const waitForWatcherToBeReady = async (watcher: FSWatcher, signal?: AbortSignal): Promise<void> => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  const cleanup = (): void => {
    watcher.off('ready', handleReady)
    watcher.off('error', handleError)
    signal?.removeEventListener('abort', handleAbort)
  }
  const handleReady = (): void => {
    cleanup()
    resolve()
  }
  const handleError = (error: unknown): void => {
    cleanup()
    reject(error)
  }
  const handleAbort = (): void => {
    handleError(signal?.reason)
  }
  signal?.throwIfAborted()
  signal?.addEventListener('abort', handleAbort, { once: true })
  watcher.on('ready', handleReady)
  watcher.on('error', handleError)
  await promise
}
