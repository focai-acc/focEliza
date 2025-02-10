declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEE_PUBLIC_KEY: string;
    }
  }
}

export interface StateCallback<T = unknown> {
  (key: string): T | Promise<T>;
}

export interface VerifiableStatePlugin {
  registerState<T>(namespace: string, callback: StateCallback<T>): void;
  getState<T>(namespace: string, key: string): Promise<T | undefined>;
}
