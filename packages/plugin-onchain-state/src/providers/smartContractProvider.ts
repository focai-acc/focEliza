import {
    type IAgentRuntime,
    type Memory,
    type Provider,
    type State,
    elizaLogger,
} from "@elizaos/core";

export const smartContractProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string> => {
        try {
            if (!runtime.getSetting("ON_CHAIN_STATE_AGENT_REGISTER")) {
                elizaLogger.error(
                    "Onchain state not config."
                );
                return "";
            }
        } catch (error) {
            elizaLogger.error("Error in smart contract provider:", error.message);
            return `Failed to connect smart contract information: ${error instanceof Error ? error.message : "Unknown error"}`;
        }

    }
}
