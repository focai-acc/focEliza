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
    IOnchainService,
} from "@elizaos/core";
import { identityAuthProvider } from "@elizaos/plugin-foc-auth";
import { focAirdropNamespace, airdropWalletPrefix, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";

export interface AirdropWallet {
    userId: string | null,
    address: string | null,
}

export class AirdropWalletProvider implements Provider {
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

        // try to auth
        const userId = identityAuthProvider.getUserIdFromState(_state);
        const userInfo = userId? identityAuthProvider.getIdentityUser(runtime, userId) : null;
        const isAuth = userId && userId !== "" && userInfo !== null;

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

    async getWalletFromState(runtime: IAgentRuntime, userId: string): Promise<AirdropWallet | null> {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            const key = `${airdropWalletPrefix}${userId}`;
            const res = await stateService.get(key);
            if (res && res.value && res.value.trim() !== "") {
                return JSON.parse(res.value);
            }
            return null;
        } catch (error) {
            elizaLogger.log("Get wallet from state failed", error);
            return null
        }
    }

    async setWalletToState(runtime: IAgentRuntime, userId: string, wallet: AirdropWallet): Promise<void> {
        try {
            const stateService = await runtime
            .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
            .newNamespace(focAirdropNamespace, await FocAuthKey(runtime));

            const key = `${airdropWalletPrefix}${userId}`;
            await stateService.put(key, JSON.stringify(wallet));
        } catch (error) {
            elizaLogger.log("Set wallet to state failed", error);
        }
    }
}

export const airdropWalletProvider = new AirdropWalletProvider();
