import { test } from '@jest/globals'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'

test('file watcher - watch file', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  // TODO create a test folder, trigger a file change and verify the result is send to the process
  fileWatcherProcess[Symbol.dispose]()
})
