import * as nodeFs from 'node:fs/promises'

export const readFile = async (url: string): Promise<Buffer> => {
  const buffer = await nodeFs.readFile(url)
  return buffer
}
