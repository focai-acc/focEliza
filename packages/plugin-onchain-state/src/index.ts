import { IAgentRuntime, type Plugin, Service, ServiceType } from "@elizaos/core";
import OnChainStateService from "./services/onChainStateService.ts";
import {executeProposalAction} from "./actions/executeProposalAction.ts";
import {OnChainStateClientInterface} from "./clients/onChainStateClient.ts";
import {smartContractProvider} from "./providers/smartContractProvider.ts";

export { OnChainDataManger } from "./services/onChainDataManger.ts";

export const onChainStatePlugin: Plugin = {
    name: "OnChainStatePlugin",
    description: "",
    actions: [executeProposalAction],
    evaluators: [],
    providers: [smartContractProvider],
    services: [new OnChainStateService()],
    clients: [OnChainStateClientInterface]
};

export default onChainStatePlugin;
