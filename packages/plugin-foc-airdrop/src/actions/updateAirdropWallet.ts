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
    ServiceType,
    type Action,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { PublicKey } from "@solana/web3.js";
import { AirdropWallet } from "../types/types";
import { getUserIdFromState } from "@elizaos/plugin-foc-auth";
import { focAirdropNamespace, airdropWalletPrefix, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";

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
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // try to auth
        const userId = getUserIdFromState(state);
        const isAuth = userId && userId !== "";

        const userState = {
            userId: userId,
            needAuth: !isAuth,
        }

        const smartAction = `
You are responsible for managing user wallets. Please follow these steps precisely:

1. **User Authentication Check:**
   - Directly reference the \`needAuth\` field from the provided UserState JSON;
   - If \`needAuth\` is true, immediately notify the user that identity verification is required before proceeding.
   - If \`needAuth\` is false, continue with updating the user's information.

2. **Wallet Retrieval:**
   - Search the recent conversation for a provided wallet address.
   - Validate that the wallet address is a proper Solana address (for this task, assume a valid address is any non-empty string that meets the expected pattern).
   - If validation fails, halt the process and notify the user that the wallet address is invalid.

3. **State Transition Execution:**
   - Extract the wallet address from the conversation and assign it to the key \`walletAddress\`.
   - Retrieve the \`userId\` from the UserState JSON and assign it to the key \`userId\`.
`.trim();


        const smartActionService = runtime.getService<SmartActionService>(ServiceType.SMART_ACTION);
        const smartActionResult = await smartActionService.generateObject(
            userState,
            smartAction,
            ModelClass.LARGE,
            runtime,
            message,
            state
        );

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

            await smartActionService.setState(runtime, focAirdropNamespace, wallet.address, JSON.stringify(wallet));
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
