import { Plugin } from "@elizaos/core";

import { ChainStateService } from "./service/chainStateService.ts";

export const onchainStatePlugin: Plugin = {
    name: "OnchainStatePlugin",
    description:
        "OnchainStatePlugin plugin for Eliza to manage KV state on blockchain.",
    actions: [],
    evaluators: [],
    providers: [],
    services: [new ChainStateService()],
};
