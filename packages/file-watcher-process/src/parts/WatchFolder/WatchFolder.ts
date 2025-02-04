import { watch } from 'chokidar'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'

export const watchFolder = async (path: string): Promise<void> => {
  const callBackInternal = async (eventName: any, path: any, stats: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', { eventName, path })
  }
  const callback = (eventName: any, path: any, stats: any): void => {
    void callBackInternal(eventName, path, stats)
  }

  const watcher = watch(path)
  watcher.on('all', callback)

  const { resolve, promise } = Promise.withResolvers<void>()
  watcher.on('ready', resolve)

  await promise
}
