import { expect, test } from '@jest/globals'
import * as WatchResult from '../src/parts/WatchResult/WatchResult.ts'

test('success', () => {
  expect(WatchResult.success).toEqual({ ok: true })
})

test('successWithInotifyWatchCount', () => {
  expect(WatchResult.successWithInotifyWatchCount(123)).toEqual({
    inotifyWatchCount: 123,
    ok: true,
  })
})

test('fromError - error with code', () => {
  const error = Object.assign(new Error('watch limit reached'), { code: 'ENOSPC' })

  expect(WatchResult.fromError(error)).toEqual({
    error: {
      code: 'ENOSPC',
      message: 'watch limit reached',
      name: 'Error',
      stack: expect.any(String),
    },
    ok: false,
  })
})

test('fromError - error without code', () => {
  expect(WatchResult.fromError(new Error('watch failed'))).toEqual({
    error: {
      message: 'watch failed',
      name: 'Error',
      stack: expect.any(String),
    },
    ok: false,
  })
})

test('fromError - unknown value', () => {
  expect(WatchResult.fromError('watch failed')).toEqual({
    error: {
      message: 'watch failed',
      name: 'Error',
    },
    ok: false,
  })
})
