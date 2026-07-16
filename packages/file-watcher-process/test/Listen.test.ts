import { expect, jest, test } from '@jest/globals'
import { RpcId } from '@lvce-editor/rpc-registry'

const mockRpc = {
  dispose: jest.fn(),
  invoke: jest.fn(),
  invokeAndTransfer: jest.fn(),
  send: jest.fn(),
}

jest.unstable_mockModule('../src/parts/IpcChild/IpcChild.ts', () => {
  return {
    listen: jest.fn(() => mockRpc),
  }
})

jest.unstable_mockModule('../src/parts/IpcChildType/IpcChildType.ts', () => {
  return {
    Auto: jest.fn(() => 3),
  }
})

const Listen = await import('../src/parts/Listen/Listen.ts')
const RpcRegistry = await import('../src/parts/RpcRegistry/RpcRegistry.ts')

test('listen - registers the launch parent as the shared process rpc', async () => {
  try {
    await Listen.listen()

    expect(RpcRegistry.get(RpcId.SharedProcess)).toBe(mockRpc)
  } finally {
    RpcRegistry.remove(RpcId.SharedProcess)
  }
})
