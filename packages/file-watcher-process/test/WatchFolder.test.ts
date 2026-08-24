import { afterEach, expect, jest, test } from '@jest/globals'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

class MockWatcher {
  private readonly listeners = new Map<string, Set<(...args: any[]) => void>>()

  closed = false

  on(eventName: string, listener: (...args: any[]) => void): this {
    const listeners = this.listeners.get(eventName) || new Set()
    listeners.add(listener)
    this.listeners.set(eventName, listeners)
    return this
  }

  off(eventName: string, listener: (...args: any[]) => void): this {
    const listeners = this.listeners.get(eventName)
    listeners?.delete(listener)
    return this
  }

  add(path: string): this {
    return this
  }

  async close(): Promise<void> {
    this.closed = true
  }

  emit(eventName: string, ...args: any[]): void {
    const listeners = this.listeners.get(eventName)
    if ((!listeners || listeners.size === 0) && eventName === 'error') {
      throw args[0]
    }
    if (!listeners) {
      return
    }
    for (const listener of listeners) {
      listener(...args)
    }
  }
}

const state: { options?: any; watcher?: MockWatcher } = {}

const createWatcher = (options?: any): MockWatcher => {
  const watcher = new MockWatcher()
  state.options = options
  state.watcher = watcher
  return watcher
}

const getInotifyWatchCount = jest.fn(async (): Promise<number | undefined> => 123)

jest.unstable_mockModule('chokidar', () => {
  return {
    FSWatcher: jest.fn(createWatcher),
    watch: jest.fn(createWatcher),
  }
})

jest.unstable_mockModule('../src/parts/GetInotifyWatchCount/GetInotifyWatchCount.ts', () => {
  return {
    getInotifyWatchCount,
  }
})

const WatchFolder = await import('../src/parts/WatchFolder/WatchFolder.ts')
const WatchFolders = await import('../src/parts/WatchFolders/WatchFolders.ts')
const DisposeWatcher = await import('../src/parts/DisposeWatcher/DisposeWatcher.ts')

const temporaryDirectories: string[] = []

afterEach(async () => {
  const paths = [...temporaryDirectories]
  temporaryDirectories.length = 0
  await Promise.all(paths.map((path) => rm(path, { force: true, recursive: true })))
})

test('watchFolder - returns an error result when watcher emits ENOSPC before ready', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const promise = WatchFolder.watchFolder(pathToFileURL('/tmp').toString())
    const error = Object.assign(new Error('ENOSPC: System limit for number of file watchers reached'), {
      code: 'ENOSPC',
    })

    state.watcher?.emit('error', error)

    const result = await Promise.race([
      promise,
      new Promise((resolve) => {
        setTimeout(resolve, 10, 'timeout')
      }),
    ])

    expect(result).toEqual({
      error: {
        code: 'ENOSPC',
        message: 'ENOSPC: System limit for number of file watchers reached',
        name: 'Error',
        stack: expect.any(String),
      },
      ok: false,
    })
    expect(state.watcher?.closed).toBe(true)
  } finally {
    consoleError.mockRestore()
  }
})

test('watchFolders - returns success when watcher is ready', async () => {
  const promise = WatchFolders.watchFolders({
    exclude: [],
    id: 1,
    roots: [pathToFileURL('/tmp').toString()],
  })

  state.watcher?.emit('ready')

  await expect(promise).resolves.toEqual({ inotifyWatchCount: 123, ok: true })
})

test('watchFolders - excludes configured folder names', async () => {
  const promise = WatchFolders.watchFolders({
    exclude: ['.git', 'node_modules'],
    id: 1,
    roots: [pathToFileURL('/tmp').toString()],
  })

  expect(state.options.ignored('/tmp/workspace/.git/config')).toBe(true)
  expect(state.options.ignored('/tmp/workspace/node_modules/package/index.js')).toBe(true)
  expect(state.options.ignored('C:\\workspace\\node_modules\\package\\index.js')).toBe(true)
  expect(state.options.ignored('/tmp/workspace/src/index.js')).toBe(false)

  state.watcher?.emit('ready')
  await promise
})

test('createIgnored - excludes paths from the root gitignore', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-watcher-gitignore-'))
  temporaryDirectories.push(root)
  await writeFile(join(root, '.gitignore'), 'dist/\n*.log\n')

  const ignored = await WatchFolders.createIgnored(root, ['node_modules'], true)

  expect(ignored(join(root, 'dist'), { isDirectory: () => true })).toBe(true)
  expect(ignored(join(root, 'debug.log'))).toBe(true)
  expect(ignored(join(root, 'src', 'index.ts'))).toBe(false)
})

test('createIgnored - falls back to explicit exclusions when the root has no gitignore', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-watcher-no-gitignore-'))
  temporaryDirectories.push(root)

  const ignored = await WatchFolders.createIgnored(root, ['node_modules'], true)

  expect(ignored(join(root, 'node_modules', 'package', 'index.js'))).toBe(true)
  expect(ignored(join(root, 'src', 'index.ts'))).toBe(false)
})

test('createIgnored - does not load the root gitignore when disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-watcher-disabled-gitignore-'))
  temporaryDirectories.push(root)
  await writeFile(join(root, '.gitignore'), '*.log\n')

  const ignored = await WatchFolders.createIgnored(root, [], false)

  expect(ignored(join(root, 'debug.log'))).toBe(false)
})

test('watchFolders - closes watcher when disposed', async () => {
  const promise = WatchFolders.watchFolders({
    exclude: [],
    id: 2,
    roots: [pathToFileURL('/tmp').toString()],
  })

  state.watcher?.emit('ready')
  await promise

  DisposeWatcher.disposeWatcher(2)

  expect(state.watcher?.closed).toBe(true)
})

test('watchFolders - returns success without a count when inotify data is unavailable', async () => {
  getInotifyWatchCount.mockResolvedValueOnce(undefined)
  const promise = WatchFolders.watchFolders({
    exclude: [],
    id: 1,
    roots: [pathToFileURL('/tmp').toString()],
  })

  state.watcher?.emit('ready')

  await expect(promise).resolves.toEqual({ ok: true })
})

test('watchFolders - returns an error result when watcher emits ENOSPC before ready', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const promise = WatchFolders.watchFolders({
      exclude: [],
      id: 1,
      roots: [pathToFileURL('/tmp').toString()],
    })
    const error = Object.assign(new Error('ENOSPC: System limit for number of file watchers reached'), {
      code: 'ENOSPC',
    })

    state.watcher?.emit('error', error)

    await expect(promise).resolves.toEqual({
      error: {
        code: 'ENOSPC',
        message: 'ENOSPC: System limit for number of file watchers reached',
        name: 'Error',
        stack: expect.any(String),
      },
      ok: false,
    })
    expect(state.watcher?.closed).toBe(true)
  } finally {
    consoleError.mockRestore()
  }
})
