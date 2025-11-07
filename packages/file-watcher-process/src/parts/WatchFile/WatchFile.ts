import * as Assert from '@lvce-editor/assert'
import * as SharedProcess from '../SharedProcess/SharedProcess.ts'
import * as WatchInternal from '../WatchInternal/WatchInternal.ts'
import { fileURLToPath } from 'node:url'

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
  await WatchInternal.watchInternal(path, {}, callback)
}
