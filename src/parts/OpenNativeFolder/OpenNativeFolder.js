import { VError } from '../VError/VError.js'

export const openFolder = async (path) => {
  try {
    const { default: open } = await import('open')
    await open(path)
  } catch (error) {
    throw new VError(error, `Failed to open ${path}`)
  }
}
