import { VError } from '@lvce-editor/verror'
import * as fs from 'node:fs/promises'

export const watchFileInternal = async (path: string, callback: (event: any) => Promise<void>): Promise<void> => {
  try {
    const watcher = fs.watch(path)
    for await (const event of watcher) {
      await callback(event)
    }
  } catch (error) {
    console.error(`[file-watcher-process] ${new VError(error, `Failed to watch file`)}`)
  }
}
