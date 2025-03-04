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

import { getUserIdFromState } from "@elizaos/plugin-foc-auth";
import { focAirdropNamespace, airdropWalletPrefix, airdropClaimedPrefix, airdropRulesKey, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";

const cache: NodeCache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes

const smartAction = `
You are tasked with managing an airdrop distribution for users. Follow the rules below to process each user's airdrop:

1. **User Authentication Check:**
    - Directly use the provided UserState JSON's needAuth field; its value (true or false) is the source of truth and must not be inferred or modified based on conversation content.
    - If needAuth is true, the user should be immediately notified that identity verification is required before any further processing.
    - If needAuth is false, you should proceed to update user information.

**Check Wallet:**
    - 'walletAddress' is the wallet address used to receive the tokens.
    - If the wallet is not set, guide the user to set up the wallet before proceeding.

**Check Airdrop Eligibility:**
    - If 'ifClaimed' is true, the user has already claimed the airdrop.
    - If the user has already received an airdrop, reject the request and inform them that they are not eligible for another airdrop.
    - If 'contributions' is empty, reject the request and inform the user that they are not eligible for an airdrop.

**Airdrop Distribution:**
    - If the user is eligible and has completed both identity and wallet verification, proceed to grant the airdrop.
    - Calculate the user's **score** based on 'contributions' and 'scoringCriteria'.
    - Use the computed score as the **airdrop amount**.
    - Provide the user with a success message, excluding the granted airdrop amount.
`.trim();

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
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const smartActionService = runtime.getService<SmartActionService>(ServiceType.SMART_ACTION);

        const userId = getUserIdFromState(state);
        const isAuth = userId && userId !== "";

        const userState = {
            userId: userId,
            needAuth: !isAuth,
            walletAddress: (await smartActionService.getJsonState(runtime, focAirdropNamespace, `${airdropWalletPrefix}${userId}`))?.address,
            ifClaimed: await smartActionService.getBoolState(runtime, focAirdropNamespace, `${airdropClaimedPrefix}${userId}`),
            contributions: await smartActionService.getState(runtime, focAirdropNamespace, `${airdropRulesKey}${userId}`),
            scoringCriteria: await smartActionService.getState(runtime, focAirdropNamespace, airdropRulesKey),
        }

        const smartActionResult = await smartActionService.generateObject(
            userState,
            smartAction,
            ModelClass.LARGE,
            runtime,
            message,
            state
        );

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
