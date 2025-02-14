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
import NodeCache from "node-cache";
import { z } from "zod";
import { getIdentityAuthTemplate } from "../templates";
import deepEqual from 'fast-deep-equal';
import { focAuthNamespace, userInfoPrefix, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";

export interface IdentityUser {
    id: string | null;
    nickname: string | null;
    description: string | null;
    avatarUrl: string | null;
    email: string | null;
    options: string | null;
}

export class IdentityAuthProvider implements Provider {
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

        const userId = this.getUserIdFromState(_state);
        const userInfo = userId? await this.getIdentityUser(runtime, userId) : null;

        const userState = {
            userId: userId,
            needAuth: !userId || userId.trim() === "",
            nickname: (userInfo && userInfo.nickname)? userInfo.nickname: "",
            description: (userInfo && userInfo.description)? userInfo.description: "",
            avatarUrl: (userInfo && userInfo.avatarUrl)? userInfo.avatarUrl: "",
            email :(userInfo && userInfo.email)? userInfo.email: "",
            options: (userInfo && userInfo.options)? userInfo.options: "",
        }

        // 2. define smart action
        const smartAction = `
Your objective is to manage and update the user's information according to the following precise steps:

1. **Authentication Verification:**
    - Check the \`needAuth\` field in the provided \`UserState\` JSON.
    - **If \`needAuth\` is \`true\`:**
      - Immediately output a JSON response indicating that identity verification is required.
      - Do not modify or update any state.
    - **If \`needAuth\` is \`false\`:**
      - Proceed with updating the user information.

2. **Extracting User Updates:**
    - Analyze the recent conversation to determine if the user has provided updated details.
    - The required fields to update are:
      - \`userId\` - copy directly from the \`userId\` in the \`UserState\`.
      - \`nickname\`
      - \`description\`
      - \`avatarUrl\`
      - \`email\`
      - \`options\`
    - For each field:
      - If a new value is explicitly provided in the conversation, use that new value.
      - If no new value is provided, retain the existing value from the \`UserState\`.
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

    async updateIdentityUser(
        runtime: IAgentRuntime,
        userInfo: IdentityUser,
    ): Promise<boolean> {
        try {
            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));

            const key = `${userInfoPrefix}${userInfo.id}`;
            const res = await stateService.get(key);
            if (res && res.value && res.value.trim() !== "") {
                const cachedUser = JSON.parse(res.value);
                if (cachedUser) {
                    if (deepEqual(cachedUser, userInfo)) {
                        return true;
                    }
                }
            }

            const userInfoJson = JSON.stringify(userInfo);
            stateService.put(key, userInfoJson);

            elizaLogger.info(`user ${userInfo.id} has been updated to ${JSON.stringify(userInfo)}`);
            return true
        } catch (error) {
            elizaLogger.log("Update identity to state failed", error);
            return null
        }
    };

    async getIdentityUser(
        runtime: IAgentRuntime,
        userId: string,
    ): Promise<IdentityUser | null>{
        try {
            const key = `${userInfoPrefix}${userId}`;
            const stateService = await runtime
                .getService<IOnchainService>(ServiceType.ONCHAIN_STATE)
                .newNamespace(focAuthNamespace, await FocAuthKey(runtime));
            const res = await stateService.get(key);
            return JSON.parse(res.value);
        } catch (error) {
            elizaLogger.log("Get identity from state failed", error);
            return null
        }
    }

    getUserIdFromState(state: State): string | null {
        const userIdObj = state["tweet_username"];

        if (userIdObj && (userIdObj as string).trim() !== "") {
            return (userIdObj as string).trim();
        } else {
            // TODO try to grab the user from direct client
            // TODO remove this
            return "lisa";
        }

        return null;
    }
}

export const identityAuthProvider = new IdentityAuthProvider();
