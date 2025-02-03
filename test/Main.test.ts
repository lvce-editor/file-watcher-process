import { expect, jest, test } from '@jest/globals'

jest.unstable_mockModule('../src/parts/Listen/Listen.ts', () => {
  return {
    listen: jest.fn(),
  }
})

const Listen = await import('../src/parts/Listen/Listen.ts')
const Main = await import('../src/parts/Main/Main.ts')

test('main', async () => {
  await Main.main()
  expect(Listen.listen).toHaveBeenCalled()
})
