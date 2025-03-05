import {
    IAgentRuntime,
    Service,
    ServiceType,
    Plugin,
    Memory,
    State,
    generateObject,
    ModelClass,
    IOnchainService,
} from "@elizaos/core";
import { SmartActionResult, composeSmartActionContext, smartActionSchema } from "./lib";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import * as crypto from "crypto";

export class SmartActionService extends Service {
    getInstance(): SmartActionService {
        return this;
    }

    static get serviceType(): ServiceType {
        return ServiceType.SMART_ACTION;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
    }

    async generateObject(
        state: Record<string, any>,
        prompt: string,
        modelClass: ModelClass,
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<SmartActionResult> {
        const userContext = await composeSmartActionContext(state, prompt, runtime, _message, _state);

        const result = await generateObject({
            runtime,
            context: userContext,
            modelClass: modelClass,
            schema: smartActionSchema,
        });

        return result.object as SmartActionResult;
    }

    async execute(
        state: Record<string, any>,
        prompt: string,
        modelClass: ModelClass,
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<SmartActionResult> {

        const userContext = await composeSmartActionContext(state, prompt, runtime, _message, _state);

        const result = await generateObject({
            runtime,
            context: userContext,
            modelClass: modelClass,
            schema: smartActionSchema,
        });

        return result.object as SmartActionResult;
    }

    async getJsonState(runtime: IAgentRuntime, namespace: string, key: string): Promise<any | null> {
        const stateService = await runtime
        .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
        .newNamespace(namespace, await this.getStateTeeKey(runtime));

        const res = await stateService.get(key);
        if (res && res.value && res.value.trim() !== "") {
            return JSON.parse(res.value);
        } else {
            return null;
        }
    }

    async getState(runtime: IAgentRuntime, namespace: string, key: string): Promise<string> {
        const stateService = await runtime
        .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
        .newNamespace(namespace, await this.getStateTeeKey(runtime));

        const res = await stateService.get(key);
        return res.value;
    }

    async setState(runtime: IAgentRuntime, namespace: string, key: string, value: string){
        await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(namespace, await this.getStateTeeKey(runtime))
            .put(key, value);
    }

    async setBooleanState(runtime: IAgentRuntime, namespace: string, key: string, value: boolean){
        await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(namespace, await this.getStateTeeKey(runtime))
            .put(key, value.toString());
    }

    async getBoolState(runtime: IAgentRuntime, namespace: string, key: string): Promise<boolean> {
        const stateService = await runtime
        .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
        .newNamespace(namespace, await this.getStateTeeKey(runtime));

        const res = await stateService.get(key);
        return res && res.value && res.value === "true";
    }

    async getStateTeeKey(runtime: IAgentRuntime): Promise<string> {
        const authKey = runtime.getSetting("FOC_AUTH_KEY");
        if (authKey) {
            // key is set, use the key
            return authKey;
        }

        const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
        const keyProvider = new DeriveKeyProvider(teeMode);
        const keyPath = `/${runtime.agentId}/tee/keypair/state`;
        const seed = await keyProvider.rawDeriveKey(keyPath, runtime.agentId);
        const privateKey = crypto.createPrivateKey({
            key: seed.key,
            format: "pem",
        });
        const privateKeyDer = privateKey.export({
            format: "der",
            type: "pkcs8",
        });

        return privateKeyDer.slice(-32).toString("hex");
    }
}

export const smartActionPlugin: Plugin = {
    name: "SmartActionPlugin",
    description:
        "SmartAction plugin for Eliza to compose smart action.",
    actions: [],
    evaluators: [],
    providers: [],
    services: [new SmartActionService()],
};

export { SmartActionResult } from "./lib";