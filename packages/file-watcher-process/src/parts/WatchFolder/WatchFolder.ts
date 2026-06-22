import { FSWatcher } from 'chokidar'
import { fileURLToPath } from 'node:url'
import * as NormalizeEvent from '../NormalizeEvent/NormalizeEvent.ts'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WaitForWatcherToBeReady from '../WaitForWatcherToBeReady/WaitForWatcherToBeReady.ts'

const callBackInternal = async (eventName: string, path: string, stats: any): Promise<void> => {
  const event = NormalizeEvent.normalizeEvent(eventName, path)
  await SharedProcess.invoke('FileWatcher.handleChange', event)
}

const callback = (eventName: string, path: string, stats: any): void => {
  void callBackInternal(eventName, path, stats)
}

const errorCallback = (error: any): void => {
  console.error(`[file-watcher-process] ${error}`)
}

export const watchFolder = async (uri: string): Promise<void> => {
  const path = fileURLToPath(uri)
  const watcher = new FSWatcher()
  watcher.on('all', callback)
  watcher.on('error', errorCallback)
  const readyPromise = WaitForWatcherToBeReady.waitForWatcherToBeReady(watcher)
  watcher.add(path)

  await readyPromise
}
