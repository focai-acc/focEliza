import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import { z } from "zod";
import NodeCache from "node-cache";
import { bool } from "sharp";
import { QueryAirdropProvider, queryAirdropProvider } from "../providers/queryAirdrop";

const cache: NodeCache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes

export const queryAirdropAction: Action = {

    name: "QUERY_AIRDROP",
    similes: [
        "QUERY_AIRDROP",
        "AIRDROP_QUERY",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Query airdrop",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        const smartActionResult = await queryAirdropProvider.get(runtime, message, state);

        callback({
            text: smartActionResult.msg,
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to claim airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Alright, let me check if you're eligible. If you are, I'll initiate it for you",
                    action: "USER_AIRDROP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "send 100 usd to your account, tx hash is xxxxxxx",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "query my airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Alright, let me check if you're eligible. If you are, I'll initiate it for you",
                    action: "USER_AIRDROP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "send 100 usd to your account, tx hash is xxxxxxx",
                },
            },
        ]

    ] as ActionExample[][],
} as Action;
