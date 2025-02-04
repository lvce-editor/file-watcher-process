import { expect, test } from '@jest/globals'
import { rename, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'
import { createTestFolder } from '../src/parts/CreateTestFolder/CreateTestFolder.ts'

test('file watcher - watch folder', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', pathToFileURL(folder.folderPath).toString())
  const path = join(folder.folderPath, 'a.txt')
  await writeFile(path, 'a')
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'add', uri: pathToFileURL(path).toString() })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})

test('watch folder - file removed', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const path = join(folder.folderPath, 'a.txt')
  await writeFile(path, 'a')
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', pathToFileURL(folder.folderPath).toString())
  await rm(path)
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'unlink', uri: pathToFileURL(path).toString() })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})

test('watch folder - file renamed', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const path = join(folder.folderPath, 'a.txt')
  await writeFile(path, 'a')
  await fileWatcherProcess.invoke('FileWatcher.watchFolder', pathToFileURL(folder.folderPath).toString())
  await rename(path, join(folder.folderPath, 'b.txt'))
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ eventName: 'add', uri: pathToFileURL(join(folder.folderPath, 'b.txt')).toString() })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})
