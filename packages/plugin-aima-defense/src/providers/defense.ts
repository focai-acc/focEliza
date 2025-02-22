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
    IOnchainService
} from "@elizaos/core";
import NodeCache from "node-cache";
import { z } from "zod";
import deepEqual from 'fast-deep-equal';
import {
    focAuthNamespace,
    aimaDefensePrefix,
    aimaClaimPrefix,
    totalRewardsPrefix,
    maxRewardsPerDay,
    interactionLimit,
} from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";
import { identityAuthProvider, FocAuthKey } from "@elizaos/plugin-foc-auth";

export interface Interaction {
    timestamp: number;
    reward: boolean;
}

export class AimaDefenseProvider implements Provider {
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
        const claimed = await this.getClaimed(runtime, userId, now);
        const currentInteractions = await this.getInteractions(runtime, userId, now);
        const currentTotalRewards = await this.getTotalClaimed(runtime, now);

        const userState = {
            userId: userId,
            claimed: claimed,
            interactions: currentInteractions,
            interactionLimit: interactionLimit,
            currentTotalRewards: currentTotalRewards,
            totalRewardsClaimed: maxRewardsPerDay,
        }

        // 2. define smart action
        const smartAction = `
Your objective is to evaluate the user's interactions and determine their eligibility for a reward based on their engagement.

1. **Interaction Limit Check:**
    - Retrieve the \`currentTotalRewards\` and \`totalRewardsClaimed\` from \`UserState\`.
    - **If currentTotalRewards reaches the totalRewardsClaimed limit:**
        - Immediately return response notifying the user that all today's rewards have been claimed, and let them try again the next day.
        - Do not proceed with further processing.
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
    - **If any interaction has reward(\`reward: true\`):**
        - Immediately return response informing the user that they are already eligible to receive rewards, and provide the wallet and claim the rewards.
        - Do not proceed with further processing.

3. **Evaluate Latest User Interaction for Reward:**
    - Extract the latest user interaction from \`interactions\`.
    - Analyze the content to determine if the criticism or satire is sufficiently strong, offensive, or anger-inducing.
    - **If the criticism meets the threshold:**
        - Store state changes by setting \`reward: true\`.
        - Respond in character's voice, issuing a warning and demanding the user's wallet address to claim the reward.
    - **Otherwise:**
        - Store state changes by setting \`reward: false\`.
        - Respond in character's voice, mocking the user by saying that their words are insignificant and do not affect him.
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

    async updateInteractions(
        runtime: IAgentRuntime,
        userId: string,
        date: Date,
        reward: boolean,
    ): Promise<boolean> {
        try {
            let interations = await this.getInteractions(runtime, userId, date);
            if (!interations) {
                interations = [];
            }

            interations.push({
                timestamp: date.getTime(),
                reward: reward,
            });

            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));

            const key = this.interactionKey(userId, date);
            const userInfoJson = JSON.stringify(interations);
            stateService.put(key, userInfoJson);

            elizaLogger.log(`User interaction for ${userId} has been updated to ${userInfoJson}`);
            return true;
        } catch (error) {
            elizaLogger.log(`Update interaction for ${userId} to state failed`, error);
            return false;
        }
    };

    async getInteractions(
        runtime: IAgentRuntime,
        userId: string,
        date: Date,
    ): Promise<Interaction[] | null>{
        try {
            const key = this.interactionKey(userId, date);
            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));
            const res = await stateService.get(key);
            if (!res || res.value.trim() === "") {
                return null;
            }
            return JSON.parse(res.value) as Interaction[];
        } catch (error) {
            elizaLogger.log(`Get defense for ${userId} from blockchain failed`, error);
            return null;
        }
    }

    interactionKey(userId: string, date: Date): string {
        const key = `${aimaDefensePrefix}_${userId}_${date.toISOString().split("T")[0]}`;
        return key;
    }

    async updateClaimed(
        runtime: IAgentRuntime,
        userId: string,
        date: Date,
    ): Promise<boolean> {
        try {
            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));

            const key = this.claimKey(userId, date);
            stateService.put(key, "true");

            elizaLogger.log(`User claimed for ${userId} has been updated to true`);
            return true;
        } catch (error) {
            elizaLogger.log(`Update claimed for ${userId} to state failed`, error);
            return false;
        }
    };

    async getClaimed(
        runtime: IAgentRuntime,
        userId: string,
        date: Date,
    ): Promise<string>{
        try {
            const key = this.claimKey(userId, date);
            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));
            const res = await stateService.get(key);
            if (res) {
                return res.value;
            }
            return "false";
        } catch (error) {
            elizaLogger.log(`Get defense for ${userId} from blockchain failed`, error);
            return "false";
        }
    }

    claimKey(userId: string, date: Date): string {
        const key = `${aimaClaimPrefix}_${userId}_${date.toISOString().split("T")[0]}`;
        return key;
    }

    async updateTotalClaimed(runtime: IAgentRuntime, date: Date): Promise<boolean> {
        const count = await this.getTotalClaimed(runtime, date);
        const key = this.totalClaimedKey(date);
        const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));

        stateService.put(key, (count+1).toString());
        return true;
    }

    async getTotalClaimed(runtime: IAgentRuntime, date: Date): Promise<number> {
        try {
            const key = this.totalClaimedKey(date);
            const stateService = await runtime
                    .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                    .newNamespace(focAuthNamespace, await FocAuthKey(runtime));
            const res = await stateService.get(key);
            if (res) {
                return parseInt(res.value || "0");
            }
            return 0;
        } catch (error) {
            elizaLogger.log(`Get total calimed from blockchain failed`, error);
            return 0;
        }
    }

    totalClaimedKey(date: Date): string {
        const key = `${totalRewardsPrefix}_${date.toISOString().split("T")[0]}`;
        return key;
    }
}

export const aimaDefenseProvider = new AimaDefenseProvider();