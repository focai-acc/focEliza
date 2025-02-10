import { StateEnclave } from './tee/secureEnclave';
import { TEELogger } from '@focai/plugin-tee-log';

export class VerifiableState implements VerifiableStatePlugin {
  private states = new Map<string, StateCallback>();
  private initialized = false;
  private enclave = new StateEnclave();

  constructor() {}

  async initialize() {
    this.initialized = true;
  }

  registerState<T>(namespace: string, callback: StateCallback<T>): void {
    this.validateNamespace(namespace);
    this.states.set(namespace, callback);
  }

  async getState<T>(namespace: string, key: string): Promise<T | undefined> {
    if (!this.initialized) {
      throw new Error('Plugin not initialized');
    }

    const callback = this.states.get(namespace);
    if (!callback) return undefined;

    try {
      const { data, signature } = await this.enclave.processInEnclave(callback, key);
      if (!this.verifySignature(data, signature)) {
        throw new Error('Invalid data signature');
      }
      return data;
    } catch (error) {
      this.logSecureError(error as Error);
      console.error(`[State] Error getting ${namespace}.${key}:`, error);
      return undefined;
    }
  }

  private validateNamespace(namespace: string): void {
    if (!/^[a-z0-9_-]{3,20}$/i.test(namespace)) {
      throw new Error(`Invalid namespace format: ${namespace}`);
    }
  }

  private verifySignature(data: any, signature: string): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(JSON.stringify(data));
    return verifier.verify(
      process.env.TEE_PUBLIC_KEY!, 
      Buffer.from(signature, 'base64')
    );
  }

  private logSecureError(error: Error): void {
    TEELogger.write({
      timestamp: Date.now(),
      module: 'verifiable-state',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
  }
}
