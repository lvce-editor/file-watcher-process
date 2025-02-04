import { pathToFileURL } from 'node:url'
import { NormalizedEvent2 } from '../NormalizedEvent2/NormalizedEvent2.ts'

export const normalizeEvent2 = (id: number, eventName: string, path: string): NormalizedEvent2 => {
  const uri = pathToFileURL(path).toString()
  return {
    eventName,
    uri,
    id,
  }
}
