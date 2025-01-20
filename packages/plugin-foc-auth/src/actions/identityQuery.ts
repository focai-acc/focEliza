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
import { getIdentityAuthTemplate } from "../templates";
import { identityProvider, IdentityObj } from "../providers/identity";
import NodeCache from "node-cache";

export const identityQueryAction: Action = {

    name: "IDENTITY_QUERY",
    similes: [
        "ID_QUERY",
        "IDENTITY_QUERY",
        "QUERY_IDENTITY",
        "QUERY_ID"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "The user query their identity",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {

        const userWalletObj = await identityProvider.getIdFromContext(runtime, message, state);

        if (!userWalletObj.nickName) {
            callback({
                text: "You must tell me your nickname",
            });
            return false;
        }

        const cacheId = await identityProvider.get(runtime, message, state);

        // If the topics are aready cached, return them
        if (cacheId) {
            callback({
                text: `Your nick neme is ${cacheId.nickName}, wallet is ${cacheId.walletAddress}, and twitter handle is ${cacheId.twitterHandle}`,
            });
            return true;
        }

        callback({
            text: `I've never auth your identity information!`,
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to query my identity info, nick name is aipe",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will query your identity",
                    action: "IDENTITY_QUERY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to query myself, nick name is aipe",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will query your identity",
                    action: "IDENTITY_QUERY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],[
            {
                user: "{{user1}}",
                content: {
                    text: "I want to query my id",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok, querying",
                    action: "IDENTITY_QUERY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Please input your nick name",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "aipe, 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok, let me do it",
                    action: "IDENTITY_QUERY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],

    ] as ActionExample[][],
} as Action;
