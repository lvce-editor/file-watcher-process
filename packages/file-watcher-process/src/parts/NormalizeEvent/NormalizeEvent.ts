import { pathToFileURL } from 'node:url'
import type { NormalizedEvent } from '../NormalizedEvent/NormalizedEvent.ts'

export const normalizeEvent = (eventName: string, path: string): NormalizedEvent => {
  const uri = pathToFileURL(path).toString()
  return {
    eventName,
    uri,
  }
}
