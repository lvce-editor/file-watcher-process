import { watch } from 'chokidar'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'

export const watchFolder = async (path: string): Promise<void> => {
  const callback = async (eventName: any, path: any, stats: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', { eventName, path })
  }

  const watcher = watch(path)
  watcher.on('all', callback)
  // TODO maybe there can be a way to wait for the watcher to be created
  // but not wait until all watch events have been fired
  // void WatchInternal.watchInternal(path, { recursive: true }, callback)
}
