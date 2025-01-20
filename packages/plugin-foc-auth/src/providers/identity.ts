import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { z } from "zod";
import { getIdentityAuthTemplate } from "../templates";

export interface IdentityObj {
    nickName: string | null;
    walletAddress: string | null;
    twitterHandle: string | null;
}

export class IdentityProvider implements Provider {
    private cache: NodeCache;

    constructor() {
        this.cache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes
    }

    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<IdentityObj | null> {

        // Initialize or update state
        if (!_state) {
            _state = (await runtime.composeState(_message)) as State;
        } else {
            _state = await runtime.updateRecentMessageState(_state);
        }

        // Compose context for bind wallet
        const idAuthContext = composeContext({
            state: _state,
            template: getIdentityAuthTemplate
        });

        // // Define the schema for extracting the inference fields
        const schema = z.object({
            nickName: z.string().nullable(),
            walletAddress: z.string().nullable(),
            twitterHandle: z.string().nullable(),
        });

        const results = await generateObject({
            runtime,
            context: idAuthContext,
            modelClass: ModelClass.SMALL,
            schema,
        });

        const identityObj = results.object as IdentityObj;

        if (!identityObj.nickName) {
            return null;
        }

        let cacheKey = identityObj.nickName.toLocaleLowerCase();
        let cachedValue = this.cache.get<IdentityObj>(cacheKey);

        return cachedValue;
    }

    async getIdFromContext(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<IdentityObj | null> {

        // Initialize or update state
        if (!_state) {
            _state = (await runtime.composeState(_message)) as State;
        } else {
            _state = await runtime.updateRecentMessageState(_state);
        }

        // Compose context for bind wallet
        const idAuthContext = composeContext({
            state: _state,
            template: getIdentityAuthTemplate
        });

        // // Define the schema for extracting the inference fields
        const schema = z.object({
            nickName: z.string().nullable(),
            walletAddress: z.string().nullable(),
            twitterHandle: z.string().nullable(),
        });

        const results = await generateObject({
            runtime,
            context: idAuthContext,
            modelClass: ModelClass.SMALL,
            schema,
        });

        const identityObj = results.object as IdentityObj;

        return identityObj;
    }

    updateIdentity(
        identity: IdentityObj,
    ) {
        this.cache.set(identity.nickName.toLocaleLowerCase(), identity);
    };

    getIdentity(
        nickName: string,
    ): IdentityObj{
        return this.cache.get<IdentityObj>(nickName);
    }
}

export const identityProvider = new IdentityProvider();
