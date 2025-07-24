export const handleUncaughtExceptionMonitor = (error: any): void => {
  console.error(`[file-watcher-process] Uncaught Exception: ${error}`)
}
