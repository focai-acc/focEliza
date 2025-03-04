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
import { SPLTransfer } from "../transfer";
import { getUserIdFromState } from "@elizaos/plugin-foc-auth";
import { focAirdropNamespace, airdropWalletPrefix, airdropClaimedPrefix, airdropRulesKey, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";
import { Airdrop } from "../types/types";

const smartAction = `
You are tasked with managing an airdrop distribution for users. Follow the rules below to process each user's airdrop:

1. **User Authentication Check:**
    - Directly use the provided UserState JSON's needAuth field; its value (true or false) is the source of truth and must not be inferred or modified based on conversation content.
    - If needAuth is true, the user should be immediately notified that identity verification is required before any further processing.
    - If needAuth is false, you should proceed to update user information.

2. Check Wallet:
    - 'walletAddress' is the wallet address used to receive the tokens.
    - If the wallet is not set, guide the user to set up the wallet before proceeding.

3. Check Airdrop Eligibility:
    - If 'ifClaimed' is true, the user has already claimed the airdrop.
    - If the user has already received an airdrop, reject the request and inform them that they are not eligible for another airdrop.
    - If 'contributions' is empty, reject the request and inform the user that they are not eligible for an airdrop.

4. Airdrop Distribution:**
    - If the user is eligible and has completed both identity and wallet verification, proceed to grant the airdrop.
    - Calculate the user's **score** based on 'contributions' and 'scoringCriteria'.
    - Use the computed score as the **airdrop amount**.
    - Provide the user with a success message, including the granted airdrop amount.

5. Airdrop Data in KV Storage:**
    - Store the following information in \`states\`:
        - userId: The user's unique identifier, which value is copied from the UserState.
        - amount: The calculated airdrop amount.
        - wallet: The user's wallet address.
    - Ensure data is stored correctly for future reference.
`.trim();

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

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const smartActionService = runtime.getService<SmartActionService>(ServiceType.SMART_ACTION);

        // try to auth
        const userId = getUserIdFromState(state);
        const isAuth = userId && userId !== "";

        const userState = {
            userId: userId,
            needAuth: !isAuth,
            walletAddress: (await smartActionService.getJsonState(runtime, focAirdropNamespace, `${airdropWalletPrefix}${userId}`))?.address,
            ifClaimed: await smartActionService.getBoolState(runtime, focAirdropNamespace, `${airdropWalletPrefix}${userId}`),
            contributions: await smartActionService.getState(runtime, focAirdropNamespace, `${airdropRulesKey}${userId}`),
            scoringCriteria: await smartActionService.getState(runtime, focAirdropNamespace, airdropRulesKey),
        }

        const smartActionResult = await smartActionService.execute(
            userState,
            smartAction,
            ModelClass.LARGE,
            runtime,
            message,
            state
        );

        if (!smartActionResult.result) {

            // execute failed, tell the user the message
            callback({
                text: smartActionResult.msg,
            });

            return false;
        } else {

            // step1: do the airdrop
            await sendToken(runtime, smartActionResult);

            // step2: update the state
            await smartActionService.setBooleanState(runtime, focAirdropNamespace, `${airdropClaimedPrefix}${userId}`, true),

            // step3: tell the user
            callback({
                text: smartActionResult.msg,
            });
            return true;
        }
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

async function sendToken(runtime: IAgentRuntime, smartActionResult: SmartActionResult) {
    const airdrop: Airdrop = {
        userId: smartActionResult.states.find(state => state.key.toLowerCase() === "userid")?.value ?? null,
        amount: smartActionResult.states.find(state => state.key.toLowerCase() === "amount")?.value ?? null,
        wallet: smartActionResult.states.find(state => state.key.toLowerCase() === "wallet")?.value ?? null,
    }

    const amount = parseInt(airdrop.amount);

    const splTransfer = new SPLTransfer(runtime);
    const signature = await splTransfer.transfer(airdrop.wallet, amount);
    elizaLogger.log(`Transferred ${amount} to ${airdrop.wallet}, signature: ${signature}`);
}

