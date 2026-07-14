import * as fs from 'node:fs/promises'
import { join } from 'node:path'

// cspell:disable-next-line
const fdInfoPath = '/proc/self/fdinfo'

export const countInotifyWatches = (fdInfoContents: readonly string[]): number => {
  let count = 0
  for (const content of fdInfoContents) {
    for (const line of content.split('\n')) {
      if (line.startsWith('inotify ')) {
        count++
      }
    }
  }
  return count
}

const readFdInfo = async (fileName: string): Promise<string> => {
  try {
    return await fs.readFile(join(fdInfoPath, fileName), 'utf8')
  } catch {
    return ''
  }
}

export const getInotifyWatchCount = async (): Promise<number | undefined> => {
  if (process.platform !== 'linux') {
    return undefined
  }
  try {
    const fileNames = await fs.readdir(fdInfoPath)
    const fdInfoContents = await Promise.all(fileNames.map(readFdInfo))
    return countInotifyWatches(fdInfoContents)
  } catch {
    return undefined
  }
}
