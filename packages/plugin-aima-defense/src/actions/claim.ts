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
import { aimaClaimProvider } from "../providers/claim";
import { identityAuthProvider } from "@elizaos/plugin-foc-auth";
import { aimaDefenseProvider } from "../providers/defense";

export const aimaClaimRewardsAction: Action = {
    name: "CLAIM_REWARDS",
    similes: [
        "CLAIM_REWARDS",
        "REWARDS_CLAIM",
        "CLAIM_REWARD",
        "REWARD_CLAIM"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "This action handles the claiming of rewards. Users can provide their wallet address or simply request to claim rewards, triggering this action to process the claim and return a confirmation message.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        // Call the rewards provider to process the claim.
        const userId = identityAuthProvider.getUserIdFromState(state);
        const smartActionResult = await aimaClaimProvider.get(runtime, message, state);
        if (!smartActionResult.result) {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }
        const address = smartActionResult.states.find(state => state.key.toLowerCase() === "address")?.value ?? null;

        // TODO transfer

        await aimaDefenseProvider.updateClaimed(runtime, userId, new Date());
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
                    text: "I want to claim my rewards. My wallet address is 0xABC123XYZ."
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing your reward claim for wallet address 0xABC123XYZ.",
                    action: "CLAIM_REWARDS"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your rewards have been successfully claimed and will be transferred to your wallet shortly."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Claim rewards."
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Please provide your wallet address.",
                    action: "CLAIM_REWARDS"
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "My wallet is 0xDEF456UVW."
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing claim for wallet 0xDEF456UVW.",
                    action: "CLAIM_REWARDS"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your rewards have been claimed successfully."
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
