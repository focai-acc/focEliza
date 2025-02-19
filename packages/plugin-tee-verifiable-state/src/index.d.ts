import { IAgentRuntime } from "@elizaos/core";
import { StateMetadata, StateVerification } from "./types";
type StateHandler = (key: string) => any;
export declare class VerifiableState {
    private static _instance;
    static getInstance(): VerifiableState;
    private handlers;
    private teeConfig;
    private runtime?;
    private keyPairs;
    private ec;
    private verifications;
    private initialized;
    initialize(runtime: IAgentRuntime): Promise<void>;
    registerState(stateName: string, handler: StateHandler): void;
    getState(stateName: string, key: string): Promise<StateMetadata>;
    verifyState(stateName: string, key: string, expectedValue: any): Promise<StateVerification>;
    private generateAttestation;
    private signData;
    logVerification(result: StateVerification): void;
    queryVerifications(filters: {
        stateName?: string;
        key?: string;
        status?: boolean;
    }): StateVerification[];
    shutdown(): void;
}
export {};
