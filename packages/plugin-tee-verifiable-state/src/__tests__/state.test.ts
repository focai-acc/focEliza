import { VerifiableState } from '../plugin';

describe('VerifiableState', () => {
  let plugin: VerifiableState;

  beforeEach(async () => {
    plugin = new VerifiableState();
    await plugin.initialize();
  });

  test('should register and retrieve state', async () => {
    plugin.registerState('auth', (key) => {
      if (key === 'admin') return { role: 'admin' };
      return { role: 'user' };
    });

    const adminState = await plugin.getState('auth', 'admin');
    expect(adminState).toEqual({ role: 'admin' });

    const userState = await plugin.getState('auth', 'user');
    expect(userState).toEqual({ role: 'user' });
  });

  test('should return undefined for unregistered namespace', async () => {
    const result = await plugin.getState('unknown', 'key');
    expect(result).toBeUndefined();
  });

  test('should handle async callbacks', async () => {
    plugin.registerState('async', async (key) => {
      return new Promise(resolve => {
        setTimeout(() => resolve(`async_${key}`), 10);
      });
    });

    const result = await plugin.getState('async', 'test');
    expect(result).toBe('async_test');
  });
});
