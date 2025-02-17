import {
    elizaLogger,
    IAgentRuntime, IOnchainService,
    Service,
    ServiceType,
} from "@elizaos/core";
import { StateManageContractEndPoint } from "../contract/stateManageContract.ts";
import { StateTransitionDAO } from "../database/stateTransition.ts";
import { StateService } from "./stateService.ts";
import { StateRefreshSchedule } from "./stateRefreshSchedule.ts";
import { TeeDeriveKeyProvider } from "./teeDeriveKeyProvider.ts";

export class ChainStateService extends Service implements IOnchainService{
    private initialized: boolean = false;
    private deriveKeyProvider: TeeDeriveKeyProvider;

    private onChainState: StateManageContractEndPoint;
    private stateDBCache: StateTransitionDAO;
    private agentId: string;

    constructor() {
    }

    public getInstance() : ChainStateService {
        return this;
    }
    static get serviceType(): ServiceType {
        return ServiceType.ONCHAIN_STATE;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        if (this.initialized) {
            return;
        }
        const teeMode = runtime.getSetting("TEE_MODE");
        this.deriveKeyProvider = new TeeDeriveKeyProvider(teeMode);

        if (runtime.getSetting("CHAIN_STATE_RPC") === null) {
            throw new Error("state rpc is not set.");
        }
        if (runtime.getSetting("CHAIN_ID") === null) {
            throw new Error("state rpc is not set.");
        }
        if (runtime.getSetting("CHAIN_STATE_CONTRACT") === null) {
            throw new Error("CHAIN_STATE_CONTRACT is not set.");
        }
        if (runtime.getSetting("CHAIN_STATE_DB_TYPE") === null) {
            throw new Error("CHAIN_STATE_DB_TYPE is not set.");
        }
        if (runtime.getSetting("CHAIN_STATE_DB_URL") === null) {
            throw new Error("CHAIN_STATE_DB_URL is not set.");
        }

        const rpc = runtime.getSetting("CHAIN_STATE_RPC");
        const chainIdStr = runtime.getSetting("CHAIN_STATE_CHAIN_ID");
        const chainId = Number.parseInt(chainIdStr, 10);

        const contract = runtime.getSetting("CHAIN_STATE_CONTRACT");
        this.onChainState = new StateManageContractEndPoint(
            rpc,
            chainId,
            contract
        );

        this.stateDBCache = new StateTransitionDAO();
        this.agentId = runtime.agentId;

        // start schedule
        const stateRefreshSchedule = new StateRefreshSchedule(
            this.onChainState,
            this.stateDBCache,
            this.deriveKeyProvider
        );
        await stateRefreshSchedule.start();
    }

    async newNamespace(
        namespace: string,
        teeAccountKey: string
    ): Promise<StateService> {
        let ecdsaKeypair = await this.deriveKeyProvider.getEcdsaKeypair(
            teeAccountKey,
            this.agentId
        );
        await this.onChainState.createNameSpace(
            ecdsaKeypair.keypair,
            namespace
        );
        return new StateService(
            this.stateDBCache,
            this.agentId,
            namespace,
            teeAccountKey,
            ecdsaKeypair.keypair,
            this.onChainState
        );
    }
}
export default ChainStateService;
