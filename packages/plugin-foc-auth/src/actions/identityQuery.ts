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
import { identityQueryProvider } from "../providers/identityQuery";

export const identityQueryAction: Action = {

    name: "IDENTITY_QUERY",
    similes: [
        "ID_QUERY",
        "IDENTITY_QUERY",
        "QUERY_IDENTITY",
        "QUERY_ID"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
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
        const smartActionResult = await identityQueryProvider.get(runtime, message, state);
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
