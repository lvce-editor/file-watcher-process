import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'
import * as RpcRegistry from '../RpcRegistry/RpcRegistry.ts'

export const handleElectronMessagePort = async (messagePort: any, rpcId: number): Promise<void> => {
  const rpc = await IpcChild.listen({
    messagePort,
    method: IpcChildType.ElectronMessagePort,
  })
  RpcRegistry.set(rpcId, rpc)
}
