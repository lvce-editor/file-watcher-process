import { type ChildProcess, fork } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FILE_WATCHER_PROCESS_PATH = join(__dirname, '../../../../file-watcher-process/src/fileWatcherProcessMain.ts')

export interface FileWatcherProcess {
  readonly invoke: (method: string, ...params: unknown[]) => Promise<unknown>
  readonly childProcess: ChildProcess
  readonly nextEvent: () => Promise<any>
  readonly [Symbol.dispose]: () => void
}

export const createFileWatcherProcess = (options: { execArgv?: string[] } = {}): FileWatcherProcess => {
  const childProcess = fork(FILE_WATCHER_PROCESS_PATH, ['--ipc-type=node-forked-process'], {
    execArgv: options.execArgv || ['--experimental-strip-types'],
    stdio: 'pipe',
  })
  return {
    childProcess,
    async nextEvent() {
      const { resolve, promise } = Promise.withResolvers()
      const cleanup = (event: any): void => {
        childProcess.off('message', handleMessage)
        resolve(event)
      }
      const handleMessage = (event: any): void => {
        cleanup(event)
      }
      childProcess.on('message', handleMessage)
      return promise
    },
    async invoke(method: string, ...params: any[]): Promise<void> {
      const { promise, resolve } = Promise.withResolvers<any>()
      const messageId = Math.random()
      const listener = (message: any): void => {
        if (message.id === messageId) {
          childProcess.off('message', listener)
          resolve(message)
        }
      }
      childProcess.on('message', listener)
      childProcess.send({
        jsonrpc: '2.0',
        id: messageId,
        method,
        params,
      })
      const response = await promise
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.result
    },
    [Symbol.dispose](): void {
      childProcess.kill()
    },
  }
}
