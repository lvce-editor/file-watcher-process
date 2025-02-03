import { VError } from '@lvce-editor/verror'
import * as fs from 'node:fs/promises'

export const watchFile = async (path: string, callback: any): Promise<void> => {
  try {
    const watcher = fs.watch(path, { recursive: true })
    for await (const event of watcher) {
      callback(event)
    }
  } catch (error) {
    console.error(`[file-watcher-process] ${new VError(error, `Failed to watch folder`)}`)
  }
}
