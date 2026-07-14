import { expect, test } from '@jest/globals'
import { countInotifyWatches, getInotifyWatchCount } from '../src/parts/GetInotifyWatchCount/GetInotifyWatchCount.ts'

test('countInotifyWatches - counts watch descriptors', () => {
  // cspell:disable
  const fdInfoContents = [
    'pos:\t0\nflags:\t02000000\ninotify wd:2 ino:1 sdev:2 mask:fc6 ignored_mask:0\ninotify wd:1 ino:2 sdev:2 mask:fc6 ignored_mask:0\n',
    'pos:\t0\nflags:\t02000000\n',
    'inotify wd:3 ino:3 sdev:2 mask:fc6 ignored_mask:0\n',
  ]
  // cspell:enable

  expect(countInotifyWatches(fdInfoContents)).toBe(3)
})

test('countInotifyWatches - returns zero for empty input', () => {
  expect(countInotifyWatches([])).toBe(0)
})

test('getInotifyWatchCount - returns a count on Linux', async () => {
  if (process.platform !== 'linux') {
    return
  }

  await expect(getInotifyWatchCount()).resolves.toEqual(expect.any(Number))
})
