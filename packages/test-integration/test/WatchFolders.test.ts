import { expect, test } from '@jest/globals'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
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
  const result = await fileWatcherProcess.invoke('FileWatcher.watchFolders', options)
  if (process.platform === 'linux') {
    expect(result).toEqual({ inotifyWatchCount: expect.any(Number), ok: true })
  } else {
    expect(result).toEqual({ ok: true })
  }
  const path = join(folder.folderPath, 'a.txt')
  await writeFile(path, 'a')
  const event = await fileWatcherProcess.nextEvent()
  expect(event).toEqual({ id: 1, eventName: 'add', uri: pathToFileURL(path).toString() })
  fileWatcherProcess[Symbol.dispose]()
  await folder[Symbol.asyncDispose]()
})

test('scoped disk watcher includes dependency and config changes, creation, deletion and rename', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  const folder = await createTestFolder()
  const root = folder.folderPath
  const dependencyDirectory = join(root, 'node_modules', 'example')
  const dependency = join(dependencyDirectory, 'index.d.ts')
  const config = join(root, 'tsconfig.json')
  await mkdir(dependencyDirectory, { recursive: true })
  await writeFile(dependency, 'export const value: number')
  await writeFile(config, '{}')
  try {
    const result = await fileWatcherProcess.invoke('FileWatcher.watchFolders', {
      exclude: ['.git'],
      id: 2,
      roots: [pathToFileURL(root).toString()],
    })
    expect(result).toMatchObject({ ok: true })
    const change = async (eventName: string, path: string, action: () => Promise<void>): Promise<void> => {
      const event = fileWatcherProcess.nextEvent()
      await action()
      expect(await event).toEqual({ eventName, id: 2, uri: pathToFileURL(path).toString() })
    }
    await change('change', dependency, () => writeFile(dependency, 'export const value: string'))
    await change('change', config, () => writeFile(config, '{"compilerOptions":{"strict":true}}'))
    const source = join(root, 'missing.ts')
    await change('add', source, () => writeFile(source, 'export const created = true'))
    await change('unlink', source, () => rm(source))
    // Renames arrive as add/unlink pairs; both must reach consumers.
    const destination = join(dependencyDirectory, 'renamed.d.ts')
    const renameEvents: unknown[] = []
    const { promise: renamed, resolve } = Promise.withResolvers<void>()
    const onMessage = (message: any): void => {
      if (message.method !== 'FileWatcher.handleChange') return
      renameEvents.push(message.params[0])
      if (renameEvents.length === 2) resolve()
    }
    fileWatcherProcess.childProcess.on('message', onMessage)
    await rename(dependency, destination)
    await renamed
    fileWatcherProcess.childProcess.off('message', onMessage)
    const [first, second] = renameEvents
    expect([first, second]).toEqual(
      expect.arrayContaining([
        { eventName: 'unlink', id: 2, uri: pathToFileURL(dependency).toString() },
        { eventName: 'add', id: 2, uri: pathToFileURL(destination).toString() },
      ]),
    )
    await fileWatcherProcess.invoke('FileWatcher.dispose', 2)
  } finally {
    fileWatcherProcess[Symbol.dispose]()
    await folder[Symbol.asyncDispose]()
  }
})
