import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatchFileInternal from '../WatchFileInternal/WatchFileInternal.ts'

export const watchFile = async (path: string): Promise<void> => {
  const callback = async (event: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  await WatchFileInternal.watchFileInternal(path, callback)
}
