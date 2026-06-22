import { expect, jest, test } from '@jest/globals'
import { pathToFileURL } from 'node:url'

class MockWatcher {
  private readonly listeners = new Map<string, Set<(...args: any[]) => void>>()

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

const getPromiseResult = async (promise: Promise<void>): Promise<unknown> => {
  try {
    await promise
    return 'resolved'
  } catch (error) {
    return error
  }
}

jest.unstable_mockModule('chokidar', () => {
  return {
    FSWatcher: jest.fn(createWatcher),
    watch: jest.fn(createWatcher),
  }
})

const WatchFolder = await import('../src/parts/WatchFolder/WatchFolder.ts')

test('watchFolder - rejects when watcher emits ENOSPC before ready', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const promise = WatchFolder.watchFolder(pathToFileURL('/tmp').toString())
    const error = Object.assign(new Error('ENOSPC: System limit for number of file watchers reached'), {
      code: 'ENOSPC',
    })

    state.watcher?.emit('error', error)

    const result = await Promise.race([
      getPromiseResult(promise),
      new Promise((resolve) => {
        setTimeout(resolve, 10, 'timeout')
      }),
    ])

    expect(result).toBe(error)
  } finally {
    consoleError.mockRestore()
  }
})
