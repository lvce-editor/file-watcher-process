import { watch } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

const normalize = (name: string): string => (['win32', 'darwin'].includes(process.platform) ? name.toLowerCase() : name)

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

// Ancestor metadata watches must never stat unrelated children (Windows drive
// roots can contain system files such as DumpStack.log.tmp that reject lstat).
export const watchChildren = (
  root: string,
  names: readonly string[],
  ignored: (path: string) => boolean,
  signal: AbortSignal,
  onChange: (eventName: string, path: string) => void,
  onError: (error: unknown) => void,
): { readonly close: () => Promise<void>; readonly readyPromise: Promise<void> } => {
  const selected = new Map(names.map((name) => [normalize(name), name]))
  const known = new Map<string, boolean>()
  let closed = false
  let queue: Promise<void>
  const processChange = async (filename: string | Buffer | null): Promise<void> => {
    if (closed || signal.aborted) return
    if (filename === null) throw new Error('Targeted watcher did not supply a child name')
    const name = selected.get(normalize(String(filename)))
    if (!name) return
    const path = join(root, name)
    if (ignored(path)) return
    const present = await exists(path)
    if (closed || signal.aborted) return
    const previous = known.get(name)
    known.set(name, present)
    if (present) onChange(previous ? 'change' : 'add', path)
    else if (previous) onChange('unlink', path)
  }
  const watcher = watch(root, { persistent: true }, (_eventName, filename) => {
    const previous = queue
    queue = (async (): Promise<void> => {
      try {
        await previous
        await processChange(filename)
      } catch (error) {
        onError(error)
      }
    })()
  })
  watcher.on('error', onError)
  queue = (async (): Promise<void> => {
    for (const name of names) {
      const path = join(root, name)
      if (!ignored(path)) known.set(name, await exists(path))
    }
  })()
  return {
    async close(): Promise<void> {
      closed = true
      watcher.close()
      try {
        await queue
      } catch {
        // Setup failures are returned through readyPromise.
      }
    },
    readyPromise: queue,
  }
}
