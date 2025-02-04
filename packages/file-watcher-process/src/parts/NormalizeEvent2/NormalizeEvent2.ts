import { pathToFileURL } from 'node:url'
import type { NormalizedEvent } from '../NormalizedEvent/NormalizedEvent.ts'

export const normalizeEvent2 = (id: number, eventName: string, path: string): NormalizedEvent => {
  const uri = pathToFileURL(path).toString()
  return {
    eventName,
    uri,
    id,
  }
}
