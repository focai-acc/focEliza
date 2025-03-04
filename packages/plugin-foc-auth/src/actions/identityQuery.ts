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

import { IdentityUser, getUserIdFromState } from "../types/types";
import { SmartActionService } from "@elizaos/plugin-smart-action";
import { focAuthNamespace, userInfoPrefix, FocAuthKey } from "../constants";

export const identityQueryAction: Action = {

    name: "IDENTITY_QUERY",
    similes: [
        "ID_QUERY",
        "IDENTITY_QUERY",
        "QUERY_IDENTITY",
        "QUERY_ID"
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "The user query their identity",
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
        const userInfo = userId? await smartActionService.getJsonState(runtime, focAuthNamespace, `${userInfoPrefix}${userId}`) : null;

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
                    text: "I want to query my identity info, nick name is aipe"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will query your identity",
                    action: "IDENTITY_QUERY"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick name is aipe, email is aipe@example.com, description is Software Developer, avatar URL is http://example.com/avatar.jpg, and others are {\"twitterHandle\":\"@aipe\",\"location\":\"us\"}"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to query myself, nick name is aipe"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will query your identity",
                    action: "IDENTITY_QUERY"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick name is aipe, email is aipe@example.com, description is Software Developer, avatar URL is http://example.com/avatar.jpg, and others are {\"twitterHandle\":\"@aipe\",\"location\":\"us\"}"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to query my id"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok, querying",
                    action: "IDENTITY_QUERY"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your nick name is aipe, email is aipe@example.com, description is Software Developer, avatar URL is http://example.com/avatar.jpg, and others are {\"twitterHandle\":\"@aipe\",\"location\":\"China\"}"
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
