import { elizaLogger, type Client, type IAgentRuntime, type IOnchainStateService, ServiceType} from "@elizaos/core";
import {EventEmitter} from "events";

export class OnChainStateClient extends EventEmitter {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly DEFAULT_INTERVAL = 60 * 1000;
    private inActive = false;
    private runtime!: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
    }

    async init(): Promise<void> {
        // Start the periodic task
        this.startPeriodicTask();
        elizaLogger.info("OnChainStateClient initialized and started periodic task");
    }

    async startPeriodicTask(): Promise<void> {
        elizaLogger.info(
            `OnChainStateClient: Starting periodic task`
        );

        // Initial call immediately
        this.syncDatabaseData();

        // Set up periodic calls
        this.intervalId = setInterval(() => {
            this.syncDatabaseData();
        }, this.DEFAULT_INTERVAL);
    }

    private async syncDatabaseData(): Promise<void> {
        if (!this.runtime) {
            elizaLogger.error("OnChainStateClient: Runtime not initialized");
            return;
        }
        if (this.inActive) {
            elizaLogger.warn(
                "OnChainStateClient: Periodic task already running, skipping"
            );
            return;
        }
        this.inActive = true;
        try {

            elizaLogger.info(
                "OnChainStateClient: Successfully sync database data"
            );
        } catch (error) {
            elizaLogger.error("info: Error sync database data", error);
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
            const client = new OnChainStateClient(runtime);
            // await client.init();

            // test set conchain state
            const service = runtime.getService<IOnchainStateService>(
                ServiceType.ONCHAIN_STATE
            );
            // service.put("StateKey1","StateData1",1);

            elizaLogger.success(
                `✅ on-chain state client successfully started for character ${runtime.character.name}`
            );
            return client;
        } catch (error) {
            elizaLogger.error("Failed to start EchoChambers client:", error);
            throw error;
        }
    },

    async stop(runtime: IAgentRuntime) {
        try {
            await runtime.clients.onchainState.stop();
            elizaLogger.success("✅ on-chain state client stopped successfully");
        } catch (error) {
            elizaLogger.error("Error stopping on-chain state client:", error);
            throw error;
        }
    },
}
