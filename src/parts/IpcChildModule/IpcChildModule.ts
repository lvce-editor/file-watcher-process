import type { RpcClient } from '@lvce-editor/rpc'
import {
  ElectronMessagePortRpcClient,
  ElectronUtilityProcessRpcClient,
  NodeForkedProcessRpcClient,
  NodeWorkerRpcClient,
} from '@lvce-editor/rpc'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const getModule = (method: number): RpcClient<any> => {
  switch (method) {
    case IpcChildType.NodeForkedProcess:
      return NodeForkedProcessRpcClient
    case IpcChildType.NodeWorker:
      return NodeWorkerRpcClient
    case IpcChildType.ElectronUtilityProcess:
      return ElectronUtilityProcessRpcClient
    case IpcChildType.ElectronMessagePort:
      return ElectronMessagePortRpcClient
    default:
      throw new Error('unexpected ipc type')
  }
}
