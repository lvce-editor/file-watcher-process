import * as RpcId from '../RpcId/RpcId.ts'
import * as RpcRegistry from '../RpcRegistry/RpcRegistry.ts'

export const invoke = async (method: string, ...params: readonly any[]): Promise<void> => {
  const rpc = RpcRegistry.get(RpcId.SharedProcess)
  await rpc.invoke(method, ...params)
}
