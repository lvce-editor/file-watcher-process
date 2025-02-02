import * as GetPtyHostPath from '../GetPtyHostPath/GetPtyHostPath.js'
import * as IsElectron from '../IsElectron/IsElectron.js'
import { VError } from '../VError/VError.js'

const getModule = () => {
  if (IsElectron.isElectron()) {
    return import('../RebuildForElectron/RebuildForElectron.js')
  }
  return import('../RebuildForNode/RebuildForNode.js')
}

export const rebuildNodePty = async () => {
  try {
    const ptyHostPath = GetPtyHostPath.getPtyHostPath()
    const module = await getModule()
    await module.rebuild(ptyHostPath)
  } catch (error) {
    throw new VError(error, `Failed to rebuild node-pty`)
  }
}
