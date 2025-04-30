import type { Rpc } from '@lvce-editor/rpc'
import * as IpcChildModule from '../IpcChildModule/IpcChildModule.ts'

export const listen = async ({ method, ...params }: { readonly method: number; readonly [key: string]: any }): Promise<Rpc> => {
  const fn = IpcChildModule.getModule(method)
  // @ts-ignore
  const rpc = await fn(params)
  // @ts-ignore
  return rpc
}
