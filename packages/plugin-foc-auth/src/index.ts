import { Plugin } from "@elizaos/core";
import { identityAuthAction } from "./actions/identityAuth.ts";
import { identityQueryAction } from "./actions/identityQuery.ts";
export { FocAuthKey } from "./constants";
export { getUserIdFromState } from "./types/types.ts";

export const focAuthPlugin: Plugin = {
    name: "foc auth plugin",
    description: "foc auth plugin for Eliza",
    actions: [identityAuthAction, identityQueryAction],
    evaluators: [],
    providers: [],
};
