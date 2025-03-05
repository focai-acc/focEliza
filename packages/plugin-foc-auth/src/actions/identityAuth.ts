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

export const identityAuthAction: Action = {

    name: "IDENTITY_AUTH",
    similes: [
        "ID_AUTH",
        "ID_VERIFICATION",
        "IDENTITY_AUTHENTICATION",
        "IDENTITY_VERIFICATION",
        "AUTH_IDENTITY",
        "AUTH_ID"
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "The user completes their identity authentication with the AI agent.",
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

        const smartActionResult = await smartActionService.generateObject(
            userState,
            smartAction,
            ModelClass.LARGE,
            runtime,
            message,
            state
        );

        if (!smartActionResult.result) {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }

        if (smartActionResult.states) {
            let userInfo: IdentityUser = {
                id: smartActionResult.states.find(state => state.key.toLowerCase() === "id")?.value ?? null,
                nickname:smartActionResult.states.find(state => state.key.toLowerCase() === "nickname")?.value ?? null,
                description:smartActionResult.states.find(state => state.key.toLowerCase() === "description")?.value ?? null,
                avatarUrl:smartActionResult.states.find(state => state.key.toLowerCase() === "avatarurl")?.value ?? null,
                email:smartActionResult.states.find(state => state.key.toLowerCase() === "email")?.value ?? null,
                options:smartActionResult.states.find(state => state.key.toLowerCase() === "options")?.value ?? null,
            };
            await smartActionService.setState(runtime, focAuthNamespace, `${userInfoPrefix}${userId}`, JSON.stringify(userInfo));
            callback({
                text: smartActionResult.msg,
            });
            return true;
        } else {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to auth my identity info, nick name is aipe"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will auth your identity",
                    action: "IDENTITY_AUTH"
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
                    text: "I want to auth myself, nick name is aipe"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok i will auth your identity",
                    action: "IDENTITY_AUTH"
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
                    text: "I want to auth my id"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok, authing",
                    action: "IDENTITY_QUERY"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Please input your nick name"
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "aipe"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ok, let me do it",
                    action: "IDENTITY_AUTH"
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
