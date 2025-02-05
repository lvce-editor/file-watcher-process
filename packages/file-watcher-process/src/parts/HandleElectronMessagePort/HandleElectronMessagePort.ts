import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const handleElectronMessagePort = async (messagePort: any) => {
  await IpcChild.listen({
    method: IpcChildType.ElectronMessagePort,
    messagePort,
  })
}
