import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as WatchFile from '../WatchFile/WatchFile.ts'
import * as WatchFolder from '../WatchFolder/WatchFolder.ts'
import * as WatchFolders from '../WatchFolders/WatchFolders.ts'

export const commandMap = {
  'HandleElectronMessagePort.handleElectronMessagePort': HandleElectronMessagePort.handleElectronMessagePort,
  'FileWatcher.watchFile': WatchFile.watchFile,
  'FileWatcher.watchFolder': WatchFolder.watchFolder,
  'FileWatcher.watchFolders': WatchFolders.watchFolders,
}
