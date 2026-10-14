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
const events: unknown[] = []
const diskRoot = pathToFileURL(tmpdir()).toString()

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

jest.unstable_mockModule('../src/parts/SharedProcess/SharedProcess.ts', () => ({
  invoke: async (_method: string, event: unknown): Promise<void> => {
    events.push(event)
  },
}))

const WatchFolder = await import('../src/parts/WatchFolder/WatchFolder.ts')
const WatchFolders = await import('../src/parts/WatchFolders/WatchFolders.ts')
const DisposeWatcher = await import('../src/parts/DisposeWatcher/DisposeWatcher.ts')

const temporaryDirectories: string[] = []

afterEach(async () => {
  DisposeWatcher.disposeWatcher(1)
  DisposeWatcher.disposeWatcher(2)
  events.length = 0
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

test('watchFolders - forwards changes observed during setup without a readiness gap', async () => {
  const promise = WatchFolders.watchFolders({ exclude: ['.git'], id: 1, roots: [diskRoot] })
  const dependency = join(tmpdir(), 'node_modules', 'example', 'index.d.ts')
  state.watcher?.emit('all', 'change', dependency)
  state.watcher?.emit('ready')
  await promise
  expect(events).toEqual([{ eventName: 'change', id: 1, uri: pathToFileURL(dependency).toString() }])
  expect(state.options.ignorePermissionErrors).toBe(false)
})

test('watchFolders - reports a runtime failure and stops the failed watcher', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const promise = WatchFolders.watchFolders({ exclude: [], id: 1, roots: [diskRoot] })
    state.watcher?.emit('ready')
    await promise
    const error = Object.assign(new Error('watch limit reached'), { code: 'ENOSPC' })
    state.watcher?.emit('error', error)
    state.watcher?.emit('all', 'change', '/tmp/stale.ts')
    expect(events).toEqual([
      {
        error: { code: 'ENOSPC', message: 'watch limit reached', name: 'Error', stack: expect.any(String) },
        eventName: 'error',
        id: 1,
        ok: false,
        uri: '',
      },
    ])
    expect(state.watcher?.closed).toBe(true)
  } finally {
    consoleError.mockRestore()
  }
})

test('watchFolders - disposal while waiting for ready closes and resolves setup', async () => {
  const promise = WatchFolders.watchFolders({ exclude: [], id: 1, roots: [diskRoot] })
  DisposeWatcher.disposeWatcher(1)
  await expect(promise).resolves.toMatchObject({ error: { message: expect.stringContaining('aborted') }, ok: false })
  expect(state.watcher?.closed).toBe(true)
  state.watcher?.emit('all', 'change', '/tmp/stale.ts')
  expect(events).toEqual([])
})

test('watchFolders - invalid later roots close earlier pending watchers', async () => {
  const promise = WatchFolders.watchFolders({ exclude: [], id: 1, roots: [diskRoot, 'memfs:///unsupported'] })
  await expect(promise).resolves.toMatchObject({ ok: false })
  expect(state.watcher?.closed).toBe(true)
})

test('watchFolders - duplicate registrations preserve the existing watcher', async () => {
  const promise = WatchFolders.watchFolders({ exclude: [], id: 1, roots: [diskRoot] })
  const first = state.watcher
  await expect(WatchFolders.watchFolders({ exclude: [], id: 1, roots: [diskRoot] })).resolves.toMatchObject({ ok: false })
  expect(state.watcher).toBe(first)
  expect(first?.closed).toBe(false)
  first?.emit('ready')
  await promise
})

test('watchFolders - passes an optional depth limit to the backend', async () => {
  const promise = WatchFolders.watchFolders({ depth: 0, exclude: [], id: 1, roots: [diskRoot] })
  expect(state.options.depth).toBe(0)
  state.watcher?.emit('ready')
  await promise
})
