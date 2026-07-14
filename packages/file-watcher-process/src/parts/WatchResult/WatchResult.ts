export interface SerializedError {
  readonly code?: string
  readonly message: string
  readonly name: string
  readonly stack?: string
}

export interface WatchSuccessResult {
  readonly inotifyWatchCount?: number
  readonly ok: true
}

export interface WatchErrorResult {
  readonly error: SerializedError
  readonly ok: false
}

export type WatchResult = WatchSuccessResult | WatchErrorResult

export const success: WatchSuccessResult = {
  ok: true,
}

export const successWithInotifyWatchCount = (inotifyWatchCount: number): WatchSuccessResult => {
  return {
    inotifyWatchCount,
    ok: true,
  }
}

const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return undefined
}

export const fromError = (error: unknown): WatchErrorResult => {
  if (error instanceof Error) {
    const code = getErrorCode(error)
    return {
      error: {
        ...(code && { code }),
        message: error.message,
        name: error.name,
        ...(error.stack && { stack: error.stack }),
      },
      ok: false,
    }
  }
  return {
    error: {
      message: String(error),
      name: 'Error',
    },
    ok: false,
  }
}
