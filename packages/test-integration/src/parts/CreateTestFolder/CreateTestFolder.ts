import { join } from 'path'
import * as Root from '../Root/Root.ts'
import { randomUUID } from 'crypto'
import { mkdir, rm } from 'fs/promises'

export const createTestFolder = async () => {
  const uuid = randomUUID()
  const folderPath = join(Root.root, '.tmp', 'test-integration', uuid)
  await rm(folderPath, { recursive: true, force: true })
  await mkdir(folderPath, { recursive: true })
  return {
    folderPath,
    async [Symbol.asyncDispose]() {
      await rm(folderPath, { recursive: true, force: true })
    },
  }
}
