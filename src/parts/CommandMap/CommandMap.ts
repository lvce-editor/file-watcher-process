import * as WatchFile from '../WatchFile/WatchFile.ts'
import * as WatchFolder from '../WatchFolder/WatchFolder.ts'

export const commandMap = {
  'FileWatcher.watchFile': WatchFile.watchFile,
  'FileWatcher.watchFolder': WatchFolder.watchFolder,
}
