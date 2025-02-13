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
import { Airdrop, claimAirdropProvider } from "../providers/claimAirdrop";
import { airdropWalletProvider } from "../providers/wallet";
import { solanaPlugin } from "@elizaos/plugin-solana";
import { SPLTransfer } from "../transfer";

const cache: NodeCache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes

export const userAirdropAction: Action = {

    name: "USER_AIRDROP",
    similes: [
        "USER_AIRDROP",
        "AIRDROP_USER",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Airdrop to users",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        const smartActionResult = await claimAirdropProvider.get(runtime, message, state);
        if (!smartActionResult.result) {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }

        const airdrop: Airdrop = {
            userId: smartActionResult.states.find(state => state.key.toLowerCase() === "userid")?.value ?? null,
            amount: smartActionResult.states.find(state => state.key.toLowerCase() === "amount")?.value ?? null,
            wallet: smartActionResult.states.find(state => state.key.toLowerCase() === "wallet")?.value ?? null,
        }

        const amount = parseInt(airdrop.amount);

        const splTransfer = new SPLTransfer(runtime);
        const signature = await splTransfer.transfer(airdrop.wallet, amount);
        elizaLogger.log(`Transferred ${amount} to ${airdrop.wallet}, signature: ${signature}`);

        await claimAirdropProvider.setClaimed(runtime, airdrop.userId);
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
