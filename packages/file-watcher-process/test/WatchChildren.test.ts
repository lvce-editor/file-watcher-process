import { expect, jest, test } from '@jest/globals'

const files = new Set<string>()
const stats: string[] = []
const state = { callback: undefined as any, error: undefined as any }
const close = jest.fn()
jest.unstable_mockModule('node:fs', () => ({
  watch: (_root: string, _options: unknown, callback: unknown): any => {
    state.callback = callback
    return {
      close,
      on: (_name: string, listener: unknown): void => {
        state.error = listener
      },
    }
  },
}))
jest.unstable_mockModule('node:fs/promises', () => ({
  stat: async (path: string): Promise<any> => {
    stats.push(path)
    if (path.endsWith('DumpStack.log.tmp')) throw Object.assign(new Error('system file'), { code: 'EINVAL' })
    if (!files.has(path)) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    return {}
  },
}))
const { join } = await import('node:path')
const { watchChildren } = await import('../src/parts/WatchChildren/WatchChildren.ts')

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

test('targeted watches never stat unrelated system files and retain create/change/delete delivery', async () => {
  const changes: unknown[] = []
  const errors: unknown[] = []
  const controller = new AbortController()
  const watcher = watchChildren(
    '/root',
    ['tsconfig.json'],
    () => false,
    controller.signal,
    (event, path) => {
      changes.push([event, path])
    },
    (error) => {
      errors.push(error)
    },
  )
  await watcher.readyPromise
  state.callback('rename', 'DumpStack.log.tmp')
  await flush()
  expect(stats).toEqual([join('/root', 'tsconfig.json')])
  const config = join('/root', 'tsconfig.json')
  files.add(config)
  state.callback('rename', 'tsconfig.json')
  await flush()
  state.callback('change', 'tsconfig.json')
  await flush()
  files.delete(config)
  state.callback('rename', 'tsconfig.json')
  await flush()
  expect(changes).toEqual([
    ['add', config],
    ['change', config],
    ['unlink', config],
  ])
  expect(errors).toEqual([])
  await watcher.close()
  state.callback('change', 'tsconfig.json')
  await flush()
  expect(changes).toHaveLength(3)
})

test('ambiguous events and backend errors revoke watch trust', async () => {
  const error = jest.fn()
  const watcher = watchChildren('/root', [], () => false, new AbortController().signal, jest.fn(), error)
  await watcher.readyPromise
  state.callback('rename', null)
  await flush()
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Targeted watcher did not supply a child name' }))
  state.error(new Error('backend failed'))
  expect(error).toHaveBeenLastCalledWith(new Error('backend failed'))
  await watcher.close()
})

test('ignored targets and aborted sessions perform no target reads', async () => {
  const start = stats.length
  const controller = new AbortController()
  controller.abort()
  const onChange = jest.fn()
  const watcher = watchChildren('/root', ['private'], () => true, controller.signal, onChange, jest.fn())
  await watcher.readyPromise
  state.callback('change', 'private')
  await flush()
  expect(stats).toHaveLength(start)
  expect(onChange).not.toHaveBeenCalled()
  await watcher.close()
})

test('required child stat failures reject readiness and disposal still closes the watcher', async () => {
  const watcher = watchChildren('/root', ['DumpStack.log.tmp'], () => false, new AbortController().signal, jest.fn(), jest.fn())
  await expect(watcher.readyPromise).rejects.toThrow('system file')
  await watcher.close()
  expect(close).toHaveBeenCalled()
})
