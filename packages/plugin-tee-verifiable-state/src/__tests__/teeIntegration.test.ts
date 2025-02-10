import { VerifiableState } from '../plugin';
import { TEELogger } from '@focai/plugin-tee-log';

jest.mock('@focai/plugin-tee-log');

describe('TEE Integration', () => {
  const mockPublicKey = '-----BEGIN PUBLIC KEY-----\n...'; 

  beforeAll(() => {
    process.env.TEE_PUBLIC_KEY = mockPublicKey;
  });

  test('应生成有效签名', async () => {
    const plugin = new VerifiableState();
    await plugin.initialize();

    plugin.registerState('test', (key) => `value_${key}`);
    const result = await plugin.getState('test', 'key1');

    expect(result).toBe('value_key1');
    expect(TEELogger.write).not.toHaveBeenCalled();
  });

  test('应拒绝无效签名', async () => {
    const plugin = new VerifiableState();
    await plugin.initialize();

    // 模拟签名验证失败
    jest.spyOn(plugin as any, 'verifySignature').mockReturnValue(false);

    plugin.registerState('test', () => 'valid_data');
    const result = await plugin.getState('test', 'any');

    expect(result).toBeUndefined();
    expect(TEELogger.write).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid data signature' })
    );
  });
});
