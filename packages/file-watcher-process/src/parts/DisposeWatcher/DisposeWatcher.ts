import * as Assert from '@lvce-editor/assert'
import * as WatcherState from '../WatcherState/WatcherState.ts'

export const disposeWatcher = (id: number): void => {
  Assert.number(id)
  if (!WatcherState.has(id)) {
    return
  }
  const controller = WatcherState.get(id)
  controller.abort()
  WatcherState.remove(id)
}
