import { Plugin } from "@elizaos/core";
import { aimaDefenseAction } from "./actions/defense";
import { aimaClaimRewardsAction } from "./actions/claim";

export const aimaDefensePlugin: Plugin = {
    name: "aima defense plugin",
    description: "aima defense plugin for Eliza",
    actions: [aimaDefenseAction, aimaClaimRewardsAction],
    evaluators: [],
    providers: [],
};
