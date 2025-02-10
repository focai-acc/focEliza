import { TEEProcessor } from '@focai/tee-sdk';

type SignedData = {
  data: any;
  signature: string;
};

export class StateEnclave {
  private processor: TEEProcessor;

  constructor() {
    this.processor = new TEEProcessor({
      moduleHash: '9a3f8b2e7c1d45f6a8b9c0d3e2f1a5b',
      memProtected: true
    });
  }

  async processInEnclave<T>(callback: (key: string) => T | Promise<T>, key: string): Promise<SignedData> {
    return this.processor.executeSecure(async (isolate) => {
      const result = await isolate.runAsync(async () => {
        return await callback(key);
      });

      return {
        data: result,
        signature: isolate.signData(JSON.stringify(result), 'state_signing_key')
      };
    });
  }
}
