export interface Plugin {
  initialize(agentId: string): Promise<void>;
}

export interface VerifiableState {
  id: string;
  agentId: string;
  namespace: string;
  key: string;
  value: any;
  timestamp: number;
  signature: string;
}

export interface StateCallback {
  (key: string): Promise<any>;
}

export interface VerifiableStatePluginOptions {
  teePlugin: Plugin;
}

export interface NamespaceRegistry {
  [namespace: string]: StateCallback;
}

export interface SignedState {
  state: VerifiableState;
  verify(publicKey: string): boolean;
}
