import type { Rpc } from '@lvce-editor/rpc'
import * as IpcChildModule from '../IpcChildModule/IpcChildModule.ts'

export const listen = async ({ method, ...params }: { readonly method: number; readonly [key: string]: any }): Promise<Rpc> => {
  const module = IpcChildModule.getModule(method)
  // @ts-ignore
  const rpc = await module.create(params)
  // @ts-ignore
  return rpc
}
