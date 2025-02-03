import { test } from '@jest/globals'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'
import { createTestFolder } from '../src/parts/CreateTestFolder/CreateTestFolder.ts'
import { writeFile } from 'fs/promises'
import { join } from 'path'

test('file watcher - watch file', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  // TODO maybe use uris instead of file paths
  await fileWatcherProcess.invoke('FileWatcher.watchFile', folder)
  await writeFile(join(folder.folderPath, 'a.txt'), 'a')
  // TODO wait for event from file watcher process
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})
