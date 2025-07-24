import { handleUncaughtExceptionMonitor } from '../HandleUncaughtExceptionMonitor/HandleUncaughtExceptionMonitor.ts'
import * as Listen from '../Listen/Listen.ts'

export const main = async (): Promise<void> => {
  process.on('uncaughtExceptionMonitor', handleUncaughtExceptionMonitor)
  await Listen.listen()
}
