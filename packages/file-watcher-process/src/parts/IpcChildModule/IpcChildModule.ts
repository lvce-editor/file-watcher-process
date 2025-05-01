import type { Rpc } from '@lvce-editor/rpc'
import {
  ElectronMessagePortRpcClient,
  ElectronUtilityProcessRpcClient,
  NodeForkedProcessRpcClient,
  NodeWorkerRpcClient,
} from '@lvce-editor/rpc'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

interface RpcFactory {
  (optiona: any): Promise<Rpc>
}

export const getModule = (method: number): RpcFactory => {
  switch (method) {
    case IpcChildType.NodeForkedProcess:
      return NodeForkedProcessRpcClient.create
    case IpcChildType.NodeWorker:
      return NodeWorkerRpcClient.create
    case IpcChildType.ElectronUtilityProcess:
      return ElectronUtilityProcessRpcClient.create
    case IpcChildType.ElectronMessagePort:
      return ElectronMessagePortRpcClient.create
    default:
      throw new Error('unexpected ipc type')
  }
}
