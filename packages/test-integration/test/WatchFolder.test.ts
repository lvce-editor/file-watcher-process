import { expect, test } from '@jest/globals'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'
import { createTestFolder } from '../src/parts/CreateTestFolder/CreateTestFolder.ts'
import { writeFile } from 'fs/promises'
import { join } from 'path'

test('file watcher - watch folder', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  // TODO maybe use uris instead of file paths
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', folder.folderPath)
  const uri = join(folder.folderPath, 'a.txt')
  await writeFile(uri, 'a')
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'addDir', path: folder.folderPath })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})
