import { expect, test } from '@jest/globals'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'
import { createTestFolder } from '../src/parts/CreateTestFolder/CreateTestFolder.ts'
import { rename, rm, writeFile } from 'fs/promises'
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

test('watch folder - file removed', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const uri = join(folder.folderPath, 'a.txt')
  await writeFile(uri, 'a')
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', folder.folderPath)
  await rm(uri)
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'addDir', path: folder.folderPath })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})

test('watch folder - file renamed', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const uri = join(folder.folderPath, 'a.txt')
  await writeFile(uri, 'a')
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', folder.folderPath)
  await rename(uri, join(folder.folderPath, 'b.txt'))
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'addDir', path: folder.folderPath })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})
