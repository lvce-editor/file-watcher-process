export const NodeWorker = 1
export const NodeForkedProcess = 2
export const ElectronUtilityProcess = 3
export const ElectronMessagePort = 4

export const Auto = (): number => {
  const { argv } = process
  if (argv.includes('--ipc-type=node-worker')) {
    return NodeWorker
  }

  if (argv.includes('--ipc-type=node-forked-process')) {
    return NodeForkedProcess
  }

  if (argv.includes('--ipc-type=electron-utility-process')) {
    return ElectronUtilityProcess
  }

  throw new Error('[file-watcher-process] unknown ipc type')
}
