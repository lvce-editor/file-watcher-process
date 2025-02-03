import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const listen = async (): Promise<void> => {
  await IpcChild.listen({
    method: IpcChildType.Auto(),
    commandMap: CommandMap.commandMap,
  })
}
