import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatchInternal from '../WatchInternal/WatchInternal.ts'

export const watchFolder = async (path: string): Promise<void> => {
  const callback = async (event: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  // TODO maybe there can be a way to wait for the watcher to be created
  // but not wait until all watch events have been fired
  void WatchInternal.watchInternal(path, { recursive: true }, callback)
}
