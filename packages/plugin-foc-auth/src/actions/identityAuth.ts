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
import { identityProvider, IdentityObj } from "../providers/identity";
import NodeCache from "node-cache";

let cache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes

export const identityAuthAction: Action = {

    name: "IDENTITY_AUTH",
    similes: [
        "ID_AUTH",
        "ID_VERIFICATION",
        "IDENTITY_AUTHENTICATION",
        "IDENTITY_VERIFICATION",
        "AUTH_IDENTITY",
        "AUTH_ID"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "The user completes their identity authentication with the AI agent.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {

        const userWalletObj = await identityProvider.getIdFromContext(runtime, message, state);

        if (!userWalletObj.nickName || !userWalletObj.walletAddress) {
            callback({
                text: "You must tell me your nickname and wallet address, while the Twitter handle is optional.",
            });
            return false;
        }

        let cacheId = identityProvider.getIdentity(userWalletObj.nickName);

        let newCacheId:IdentityObj = {
            nickName: userWalletObj.nickName,
            walletAddress: userWalletObj.walletAddress,
            twitterHandle: userWalletObj.twitterHandle,
        }

        identityProvider.updateIdentity(newCacheId);

        if(cacheId) {
            elizaLogger.info("User re-auths his identity");
            callback({
                text: `I've updated your identity information! nick neme is ${newCacheId.nickName}, wallet is ${newCacheId.walletAddress}, and twitter handle is ${newCacheId.twitterHandle}`,
            });
        } else {
            elizaLogger.info("User auths his identity");
            callback({
                text: `I've auth your identity information! nick neme is ${newCacheId.nickName}, wallet is ${newCacheId.walletAddress}, and twitter handle is ${newCacheId.twitterHandle}`,
            });
        }
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to authenticate my identity, nick name is aipe and address is 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will authenticate your identity",
                    action: "IDENTITY_AUTH",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've auth your identity information! nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to verify my identity, nick name is aipe and address is 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will authenticate your identity",
                    action: "IDENTITY_AUTH",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've auth your identity information! nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],[
            {
                user: "{{user1}}",
                content: {
                    text: "I want to authenticate my id",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will record your wallet",
                    action: "IDENTITY_AUTH",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Please input your nick name and wallet address.",
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
                    action: "IDENTITY_AUTH",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've auth your identity information! nick neme is aipe and this's your wallet: 0x5Eb5B339d43c45Fc629d92BF7ab415d6d7660011",
                },
            },
        ],

    ] as ActionExample[][],
} as Action;
