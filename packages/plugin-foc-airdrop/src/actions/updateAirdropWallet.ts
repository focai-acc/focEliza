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
import { identityAuthProvider } from "@elizaos/plugin-foc-auth";
import NodeCache from "node-cache";
import { bool } from "sharp";
import { PublicKey } from "@solana/web3.js";
import { AirdropWallet, airdropWalletProvider } from "../providers/wallet";

const cache: NodeCache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes


function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch (err) {
        return false;
    }
}

export const airdropWalletAction: Action = {

    name: "AIRDROP_WALLET",
    similes: [
        "AIRDROP_WALLET",
        "WALLET_AIRDROP",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Update airdrop wallet",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        const smartActionResult = await walletProvider.get(runtime, message, state);
        if (!smartActionResult.result) {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }

        if (smartActionResult.states) {
            const wallet: AirdropWallet = {
                userId: smartActionResult.states.find(state => state.key.toLowerCase() === "userid")?.value ?? null,
                address: smartActionResult.states.find(state => state.key.toLowerCase() === "walletaddress")?.value ?? null,
            }

            // THIS IS A DOUBLE CHECK
            if (!wallet.address || !isValidSolanaAddress(wallet.address) || !wallet.userId || wallet.userId.trim() === "") {
                callback({
                    text: `Internal error, get wallet failed`,
                });
                return false;
            }

            await airdropWalletProvider.setWalletToState(runtime, wallet.address, wallet);
            callback({
                text: smartActionResult.msg,
            });
            return true;
        } else {
            callback({
                text: smartActionResult.msg,
            });
            return false
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to set my wallet address",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure! Please provide your wallet address.",
                    action: "AIRDROP_WALLET",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "My address is 4Nd1m2gFPai6fSzz1DFvLZ9n5sRVffCqwNVF6MfSRZ3N",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I will update your wallet address: 4Nd1m2gFPai6fSzz1DFvLZ9n5sRVffCqwNVF6MfSRZ3N",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Update my wallet to E4CFfyAx4L7k5v8pTq2LxNJ9RcGm7ZRQg3fDN1Pt6TTN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Got it! I will update your wallet address to: E4CFfyAx4L7k5v8pTq2LxNJ9RcGm7ZRQg3fDN1Pt6TTN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
