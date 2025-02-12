import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    ServiceType,
    composeContext,
    generateObject,
    IOnchainService,
    ModelClass,
} from "@elizaos/core";
import { identityAuthProvider } from "@elizaos/plugin-foc-auth";
import { airdropWalletProvider } from "./wallet";
import { focAirdropNamespace, airdropClaimedPrefix, airdropRulesKey, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";

export interface Airdrop {
    userId: string | null;
    amount: string | null;
    wallet: string | null;
}

export class ClaimAirdropProvider implements Provider {

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


        return this.generate(smartAction, runtime, _message, _state);
    }

    async generate(smartAction: string,
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State): Promise<SmartActionResult> {
        // try to auth
        const userId = identityAuthProvider.getUserIdFromState(_state);
        const userInfo = userId? await identityAuthProvider.getIdentityUser(runtime, userId) : null;
        const isAuth = userId && userId !== "" && userInfo !== null;

        const userState = {
            userId: userId,
            needAuth: !isAuth,
            nickName: isAuth? (await identityAuthProvider.getIdentityUser(runtime, userId)).nickname : "",
            walletAddress: isAuth? (await airdropWalletProvider.getWalletFromState(runtime, userId)).address : "",
            ifClaimed: isAuth? (await this.getClaimed(runtime, userId)) : false,
            contributions: await this.getContributions(runtime, userId),
            scoringCriteria: await this.getRules(runtime),
        }

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

    async getClaimed(runtime: IAgentRuntime, userId: string): Promise<boolean | null> {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            const key = `${airdropClaimedPrefix}${userId}`;
            const res = await stateService.get(key);
            return res && res.value && res.value === "true";
        } catch (error) {
            elizaLogger.log("Get claimed from state failed", error);
            return null
        }
    }

    async setClaimed(runtime: IAgentRuntime, userId: string) {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            const key = `${airdropClaimedPrefix}${userId}`;
            return stateService.put(key, "true");
        } catch (error) {
            elizaLogger.log("Set claimed to state failed", error);
        }
    }

    async getContributions(runtime: IAgentRuntime, userId: string): Promise<string | null> {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            const key = `${airdropRulesKey}${userId}`;
            // something like "dev,pr,pr"
            const res = await stateService.get(key);
            return res.value;
        } catch (error) {
            elizaLogger.log("Get contributions from state failed", error);
            return null;
        }
    }

    async getRules(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            // something like "10 fro dev, 20 for pr"
            const res = await stateService.get(airdropRulesKey);
            return res.value;
        } catch (error) {
            elizaLogger.log("Get rules from state failed", error);
            return null;
        }
    }
}

export const claimAirdropProvider = new ClaimAirdropProvider();
