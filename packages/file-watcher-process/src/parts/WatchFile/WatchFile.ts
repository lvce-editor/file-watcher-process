import * as Assert from '@lvce-editor/assert'
import { fileURLToPath } from 'node:url'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatcherState from '../WatcherState/WatcherState.ts'
import * as WatchInternal from '../WatchInternal/WatchInternal.ts'

export const watchFile = async (path: string): Promise<void> => {
  const callback = async (event: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', event)
  }
  await WatchInternal.watchInternal(path, {}, callback)
}

export const watchFile2 = async (id: number, uri: string): Promise<void> => {
  Assert.number(id)
  Assert.string(uri)
  const callback = async (event: any): Promise<void> => {
    await SharedProcess.invoke('FileWatcher.handleChange', {
      id,
      ...event,
    })
  }
  const path = fileURLToPath(uri)
  const controller = new AbortController()
  WatcherState.add(id, controller)
  await WatchInternal.watchInternal(path, {}, callback)
}
