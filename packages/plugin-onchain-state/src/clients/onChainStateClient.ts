import {
    elizaLogger,
    type IAgentRuntime,
    type IOnchainStateService,
    ServiceType,
    type Client,
} from "@elizaos/core";

export class OnChainStateClient {
    private runtime!: IAgentRuntime;
    private stateService!: IOnchainStateService;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly DEFAULT_INTERVAL = 5 * 1000;
    private inActive = false;

    constructor() {}

    async init(runtime: IAgentRuntime): Promise<void> {
        try {
            this.runtime = runtime;
            this.stateService = runtime.getService<IOnchainStateService>(
                ServiceType.ONCHAIN_STATE
            );

            // start
            this.startPeriodicTask();
        } catch (error) {
            elizaLogger.error(
                "On-chain State Client initializing on-chain state client error:",
                error
            );
            throw error;
        }
    }

    private async startPeriodicTask() {
        // sync data
        await this.stateService.syncStateData();

        // Set up periodic calls
        this.intervalId = setInterval(() => {
            if (!this.inActive) {
                this.processPendingStates();
            }
        }, this.DEFAULT_INTERVAL);
    }

    private async processPendingStates() {
        this.inActive = true;
        try {
            const data = await this.stateService.getOldestUnConfirmedData();
            if (data) {
                elizaLogger.info(
                    "On-chain State Client process off-chain state data:",
                    data.key,
                    data.value,
                    data.version
                );
                await this.stateService.writeStateDataOnChain(
                    data.key,
                    data.value,
                    false,
                    data.version
                );
            }
        } catch (error) {
        } finally {
            this.inActive = false;
        }
    }

    async stop(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.inActive = false;
        }
    }
}

export const OnChainStateClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        try {
            const client = new OnChainStateClient();
            await client.init(runtime);

            elizaLogger.success(
                `On-chain State Client successfully started for character ${runtime.character.name}`
            );
            return client;
        } catch (error) {
            elizaLogger.error("Failed to start On-chain State Client:", error);
            throw error;
        }
    },

    async stop(runtime: IAgentRuntime) {
        try {
            await runtime.clients.onchainState.stop();
            elizaLogger.success("On-chain State Client stopped successfully");
        } catch (error) {
            elizaLogger.error("Error stopping On-chain State Client:", error);
            throw error;
        }
    },
};
