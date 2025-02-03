import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatchFolderInternal from '../WatchFolderInternal/WatchFolderInternal.ts'

export const watchFolder = async (path: string): Promise<void> => {
  const callback = async (event: any): Promise<void> => {
    console.log({ event })
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  await WatchFolderInternal.watchFolderInternal(path, callback)
}
