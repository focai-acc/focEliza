import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    ServiceType,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";
import { identityAuthProvider, FocAuthKey } from "@elizaos/plugin-foc-auth";
import { aimaDefenseProvider } from "./defense";

export interface Interaction {
    timestamp: number;
    claimed: boolean;
}

export class AimaClaimProvider implements Provider {
    constructor() {
    }

    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<SmartActionResult | null> {

        // Initialize or update state
        if (!_state) {
            _state = (await runtime.composeState(_message)) as State;
        } else {
            _state = await runtime.updateRecentMessageState(_state);
        }

        const userId = identityAuthProvider.getUserIdFromState(_state);
        const now = new Date();
        const claimed = await aimaDefenseProvider.getClaimed(runtime, userId, now);
        const currentInteractions = await aimaDefenseProvider.getInteractions(runtime, userId, now);

        const userState = {
            userId: userId,
            claimed: claimed,
            interactions: currentInteractions,
            interactionLimit: 10,
        }

        // 2. define smart action
        const smartAction = `
Your objective is to evaluate the user's interactions and determine their eligibility for a reward based on their engagement.

1. **Interaction Limit Check:**
    - Retrieve the \`interactions\` array from \`UserState\` and compare its length with \`interactionLimit\`.
    - **If the number of interactions has reached the limit:**
        - Immediately return response notifying the user that they have reached today's interaction limit.
        - Do not proceed with further processing.

2. **Reward Claim Check:**
    - Inspect the \`claimed\` in \`UserState\`.
    - **If the claimed flag is true(\`claimed: true\`):**
        - Immediately return response informing the user that they have already claimed their reward.
        - Do not proceed with further processing.
    - Inspect the \`interactions\` array in \`UserState\`.
        - **If no interaction has reward(\`reward: true\`):**
            - Immediately return a response informing the user that they need to increase their engagement.
            - Do not proceed with further processing.
        - **If there is interaction has reward(\`reward: true\`):**
            - continue for futher processing.

3. **Retrieve the wallet address from the most recent conversation:**
    - **If no wallet address is provided:**
        - Prompt the user to supply their wallet address.
    - **If a wallet address is provided:**
        - Mark state changes with the wallet address in the format: \`"address": "0x123"\`.
        - Inform the user to keep an eye on their wallet as a transfer is about to be made.
    Respond in character's voice, mocking the user by saying that their words are insignificant and do not affect him.
        `.trim();

        const smartActionService = runtime.getService<SmartActionService>(ServiceType.SMART_ACTION);
        const result = await smartActionService.generateObject(
            userState,
            smartAction,
            ModelClass.LARGE,
            runtime,
            _message,
            _state
        );

        const identityObj = result as SmartActionResult;

        return identityObj;
    }
}

export const aimaClaimProvider = new AimaClaimProvider();
