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
import { identityAuthProvider, IdentityUser } from "../providers/identityAuth";

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
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
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
        const smartActionResult = await identityAuthProvider.get(runtime, message, state);
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
            await identityAuthProvider.updateIdentityUser(runtime, userInfo);
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
