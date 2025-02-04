import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatchInternal from '../WatchInternal/WatchInternal.ts'

export const watchFolder = async (path: string): Promise<void> => {
  const callback = async (event: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  await WatchInternal.watchInternal(path, { recursive: true }, callback)
}
