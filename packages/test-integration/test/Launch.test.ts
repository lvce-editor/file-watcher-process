import { test } from '@jest/globals'
import { createFileWatcherProcess } from '../src/parts/CreateFileWatcherProcess/CreateFileWatcherProcess.ts'

test('file watcher - launch', async () => {
  const fileWatcherProcess = createFileWatcherProcess()
  fileWatcherProcess[Symbol.dispose]()
})
