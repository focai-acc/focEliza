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
import NodeCache from "node-cache";
import { z } from "zod";
import { getIdentityAuthTemplate } from "../templates";
import deepEqual from 'fast-deep-equal';
import { focAuthNamespace, userInfoPrefix, FocAuthKey } from "../constants";
import { SmartActionService, SmartActionResult } from "@elizaos/plugin-smart-action";
import { identityAuthProvider } from "./identityAuth";

export interface IdentityUser {
    id: string | null;
    nickname: string | null;
    description: string | null;
    avatarUrl: string | null;
    email: string | null;
    options: string | null;
}

export class IdentityQueryProvider implements Provider {
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
        const userInfo = userId? await identityAuthProvider.getIdentityUser(runtime, userId) : null;

        const userState = {
            userId: userId,
            needAuth: !userId || userId.trim() === "" || userInfo === null,
            oldNickname: userInfo? userInfo.nickname: "",
            oldDescription: userInfo? userInfo.description: "",
            oldAvatarUrl: userInfo? userInfo.avatarUrl: "",
            oldEmail :userInfo? userInfo.email: "",
            oldOptions: userInfo? userInfo.options: "",
        }

        // 2. define smart action
        const smartAction = `
You are tasked with managing an information for users. Follow these rules precisely to process each user's information:

1. **User Authentication Check:**
    - Directly use the provided UserState JSON's needAuth field; its value (true or false) is the source of truth and must not be inferred or modified based on conversation content.
    - If needAuth is true, the user should be immediately notified that identity verification is required before any further processing.
    - If needAuth is false, you should proceed to update user information.

2. **User Information Summary:**
   - When 'needAuth' is false, review the provided 'old' value in UserState which contains the following fields: id, nickname, description, avatarUrl, email, and options.
   - Identify all fields whose values are not empty (or null) and just ignore them.
   - Generate a single-sentence summary that clearly lists each non-empty field along with its value.
   - **IMPORTANT:** This generated summary must be included in the msg field of your final output.

By making these changes, when user identity is verified, the msg field will contain the detailed summary of the user's non-empty information, and states will only indicate the authentication status.
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

export const identityQueryProvider = new IdentityQueryProvider();
