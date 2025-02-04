import { expect, test } from '@jest/globals'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'
import { createTestFolder } from '../src/parts/CreateTestFolder/CreateTestFolder.ts'

test('watch single folder', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const id = 1
  const roots = [pathToFileURL(folder.folderPath).toString()]
  const exclude = []
  const options = {
    id,
    roots,
    exclude,
  }
  await fileWatcherProcess.invoke('FileWatcher.watchFolders', options)
  const path = join(folder.folderPath, 'a.txt')
  await writeFile(path, 'a')
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ id: 1, eventName: 'add', uri: pathToFileURL(path).toString() })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})
