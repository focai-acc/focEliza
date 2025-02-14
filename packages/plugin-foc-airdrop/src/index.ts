import { Plugin } from "@elizaos/core";
import { userAirdropAction } from "./actions/claimAirdrop.ts";
import { queryAirdropAction } from "./actions/queryAirdrop.ts";
import { airdropWalletAction } from "./actions/updateAirdropWallet.ts";

export const focAirdropPlugin: Plugin = {
    name: "foc airdrop plugin",
    description: "foc airdrop plugin for Eliza",
    actions: [userAirdropAction, queryAirdropAction, airdropWalletAction],
    evaluators: [],
    providers: [],
};
