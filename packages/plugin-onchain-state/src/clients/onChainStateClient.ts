import {
    elizaLogger,
    type IAgentRuntime,
    type IOnchainStateService,
    ServiceType,
    type Client,
} from "@elizaos/core";
import { EventEmitter } from "events";
import { SqliteStateData } from "../adapters/sqliteState.ts";

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

            elizaLogger.success(
                `✅ on-chain state client successfully started for character ${runtime.character.name}`
            );
        } catch (error) {
            elizaLogger.error(
                "Error initializing on-chain state client:",
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
            const data = await this.stateService.getOldestPendingData();
            elizaLogger.info(
                `Processing pending state for key: ${data.key} version:${data.version}`
            );

            await this.stateService.writeStateDataOnChain(
                data.key,
                data.value,
                data.version
            );

            elizaLogger.info(
                `Successfully processed state for key: ${data.key} version:${data.version}`
            );
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
            // await client.init(runtime);

            elizaLogger.success(
                `✅ on-chain state client successfully started for character ${runtime.character.name}`
            );
            return client;
        } catch (error) {
            elizaLogger.error("Failed to start on-chain state client:", error);
            throw error;
        }
    },

    async stop(runtime: IAgentRuntime) {
        try {
            await runtime.clients.onchainState.stop();
            elizaLogger.success(
                "✅ on-chain state client stopped successfully"
            );
        } catch (error) {
            elizaLogger.error("Error stopping on-chain state client:", error);
            throw error;
        }
    },
};
