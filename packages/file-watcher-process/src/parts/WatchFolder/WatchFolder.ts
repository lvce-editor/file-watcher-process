import { watch } from 'chokidar'
import { fileURLToPath } from 'node:url'
import * as NormalizeEvent from '../NormalizeEvent/NormalizeEvent.ts'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'

export const watchFolder = async (uri: string): Promise<void> => {
  const callBackInternal = async (eventName: string, path: string, stats: any): Promise<void> => {
    const event = NormalizeEvent.normalizeEvent(eventName, path)
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  const callback = (eventName: string, path: string, stats: any): void => {
    void callBackInternal(eventName, path, stats)
  }

  const path = fileURLToPath(uri)
  const watcher = watch(path)
  watcher.on('all', callback)

  const { resolve, promise } = Promise.withResolvers<void>()
  watcher.on('ready', resolve)

  await promise
}
