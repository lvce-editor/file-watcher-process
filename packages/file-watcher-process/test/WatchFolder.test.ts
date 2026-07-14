import { expect, jest, test } from '@jest/globals'
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

const state: { watcher?: MockWatcher } = {}

const createWatcher = (): MockWatcher => {
  const watcher = new MockWatcher()
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
