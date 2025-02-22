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
import { aimaDefenseProvider } from "../providers/defense";
import { identityAuthProvider } from "@elizaos/plugin-foc-auth";

export const aimaDefenseAction: Action = {
    name: "AIMA_DEFENSE",
    similes: [
        "AIMA_DEFENSE",
        "AIMA_DEFENSE_COUNTER",
        "AIMA_DEFENSE_PROTECT",
        "AIMA_DEFENSE_RESPONSE",
        "MA_DEFENSE",
        "MA_DEFENSE_COUNTER",
        "MA_DEFENSE_PROTECT",
        "MA_DEFENSE_RESPONSE",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "This action handles insults and attacks directed at Cai Xukun—such as claims that his singing is awful, dancing is terrible, rapping is poor, or that he is '鸡哥', 'chicken', or that his 2.5 years of training are insufficient. It provides a defensive response, and in extreme cases, responds in full uppercase with a legal threat.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        const userId = identityAuthProvider.getUserIdFromState(state);
        const smartActionResult = await aimaDefenseProvider.get(runtime, message, state);
        if (!smartActionResult.result) {
            callback({
                text: smartActionResult.msg,
            });
            return false;
        }
        const reward = smartActionResult.states.find(state => state.key.toLowerCase() === "reward")?.value ?? null;
        await aimaDefenseProvider.updateInteractions(runtime, userId, new Date(), reward? true : false);
        callback({
            text: smartActionResult.msg,
        });
        return true;
    },
    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                "text": "Your martial arts techniques are nothing but outdated tricks, and your 'Hunyuan Xingyi Taiji' is a sham!"
                }
            },
            {
                "user": "aima",
                "content": {
                "text": "How dare you insult the ancient art? I have dedicated decades to mastering these techniques. Your words reveal your ignorance and disrespect for tradition!",
                "action": "MBA_DEFENSE"
                }
            }
            ],
            [
            {
                "user": "{{user1}}",
                "content": {
                "text": "Your so-called moral integrity in martial arts is nothing but a facade. Your teachings are meaningless and irrelevant!"
                }
            },
            {
                "user": "aima",
                "content": {
                "text": "Mocking the sacred principles of martial virtue is unforgivable. My teachings are the very foundation of honor and discipline. I will not tolerate such disrespect!",
                "action": "MBA_DEFENSE"
                }
            }
            ],
            [
            {
                "user": "{{user1}}",
                "content": {
                "text": "Your training methods are laughable and seem designed to deceive the weak-minded!"
                }
            },
            {
                "user": "aima",
                "content": {
                "text": "You dare question the legitimacy of my methods? Each technique I teach is rooted in centuries of wisdom and honed by relentless discipline. Your baseless insults only expose your own lack of understanding!",
                "action": "MBA_DEFENSE"
                }
            }
            ],
            [
            {
                "user": "{{user1}}",
                "content": {
                "text": "You're nothing but a fraud—a charlatan who preaches outdated techniques while failing miserably in real combat!"
                }
            },
            {
                "user": "aima",
                "content": {
                "text": "ENOUGH! Your insolence has pushed me to my limits! I will defend the honor of my art with all the strength in my being, and your disrespect will not go unchallenged!",
                "action": "MBA_DEFENSE"
                }
            }
        ]
    ] as ActionExample[][],
} as Action;