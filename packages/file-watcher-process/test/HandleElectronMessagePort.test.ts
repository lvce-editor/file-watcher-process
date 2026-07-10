import { expect, jest, test } from '@jest/globals'

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

const IpcChild = await import('../src/parts/IpcChild/IpcChild.ts')
const IpcChildType = await import('../src/parts/IpcChildType/IpcChildType.ts')
const RpcRegistry = await import('../src/parts/RpcRegistry/RpcRegistry.ts')
const HandleElectronMessagePort = await import('../src/parts/HandleElectronMessagePort/HandleElectronMessagePort.ts')

test('handleElectronMessagePort - registers rpc', async () => {
  const messagePort = {}
  const rpcId = 999

  try {
    await HandleElectronMessagePort.handleElectronMessagePort(messagePort, rpcId)

    expect(IpcChild.listen).toHaveBeenCalledWith({
      messagePort,
      method: IpcChildType.ElectronMessagePort,
    })
    expect(RpcRegistry.get(rpcId)).toBe(mockRpc)
  } finally {
    RpcRegistry.remove(rpcId)
  }
})
