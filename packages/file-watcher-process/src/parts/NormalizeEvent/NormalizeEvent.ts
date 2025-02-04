import type { NormalizedEvent } from '../NormalizedEvent/NormalizedEvent.ts'

export const normalizeEvent = (eventName: string, path: string): NormalizedEvent => {
  return {
    eventName,
    path,
  }
}
