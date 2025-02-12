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
import { SmartActionResult } from "@elizaos/plugin-smart-action";
import { claimAirdropProvider } from "./claimAirdrop";

export class QueryAirdropProvider implements Provider {

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

        return claimAirdropProvider.generate(smartAction, runtime, _message, _state);
    }
}

export const queryAirdropProvider = new QueryAirdropProvider();
