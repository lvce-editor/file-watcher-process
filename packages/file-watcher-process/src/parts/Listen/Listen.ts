import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'
import * as RpcId from '../RpcId/RpcId.ts'
import * as RpcRegistry from '../RpcRegistry/RpcRegistry.ts'

export const listen = async (): Promise<void> => {
  const rpc = await IpcChild.listen({
    method: IpcChildType.Auto(),
    commandMap: CommandMap.commandMap,
  })
  RpcRegistry.set(RpcId.SharedProcess, rpc)
}
