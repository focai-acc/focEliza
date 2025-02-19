import { Service, ServiceType, IAgentRuntime } from "@elizaos/core";
import { StateMetadata, StateVerification, TeeConfig } from "../types";
import { Plugin } from "@elizaos/core";
export declare class VerifiableStateService extends Service {
    private stateManager?;
    static get serviceType(): ServiceType;
    initialize(runtime: IAgentRuntime): Promise<void>;
    shutdown(): Promise<void>;
    getRegisteredStates(): Promise<string[]>;
    generateStateProof(stateName: string, key: string): Promise<StateMetadata>;
    queryVerifications(query: {
        stateName?: string;
        key?: string;
        status?: boolean;
    }): Promise<StateVerification[]>;
    getTeeConfig(): TeeConfig;
}
export declare const verifiableStatePlugin: Plugin;
