import {
    type IAgentRuntime,
    type IOnchainStateService,
    Service,
    ServiceType,
    elizaLogger,
} from "@elizaos/core";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import { DeriveKeyResponse } from "@phala/dstack-sdk";
import { Contract, BaseContract, ethers, type Wallet } from "ethers";
import { OnChainDataManger } from "./onChainDataManger.ts";
import { PrivateKeyAccount, keccak256 } from "viem";
import { SqliteStateData } from "../adapters/sqliteState.ts";
import { StateData } from "../types.ts";

export class OnChainStateService
    extends Service
    implements IOnchainStateService
{
    private initialized = false;
    private dataManager;
    private runtime!: IAgentRuntime;
    private agentContract: Contract;
    private agentContractWrite: Contract;
    private account: DeriveKeyResponse;
    private wallet: Wallet;
    private stateManager: SqliteStateData;

    getInstance(): OnChainStateService {
        return this;
    }

    static get serviceType(): ServiceType {
        return ServiceType.ONCHAIN_STATE;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.runtime = runtime;
        this.dataManager = OnChainDataManger;
        this.agentContract = this.dataManager.getAgentContract(runtime.agentId);
        this.agentContract.on("StateDataChanged", (args) => {
            console.log("listener StateDataChanged args", args);
            // parse data
            // this.stateManager.updateStateStatus();
        });

        // Initialize state DAO
        this.stateManager = new SqliteStateData(
            this.runtime.databaseAdapter.db
        );
        await this.stateManager.initialize(runtime.agentId);

        this.initialized = true;
    }

    async initialWallet(): Promise<{
        hexPrivateKey: string;
        keypair: PrivateKeyAccount;
    }> {
        const teeMode = this.runtime.getSetting("TEE_MODE");
        if (teeMode === TEEMode.OFF) {
            return;
        }
        const deriveKeyProvider = new DeriveKeyProvider(teeMode);
        try {
            const walletSecretSalt =
                this.runtime.getSetting("WALLET_SECRET_SALT");
            if (!walletSecretSalt) {
                throw new Error(
                    "WALLET_SECRET_SALT required when TEE_MODE is enabled"
                );
            }

            const response1 = await deriveKeyProvider.rawDeriveKey(
                "/",
                walletSecretSalt
            );
            const hex = keccak256(response1.asUint8Array());

            const response2 = await deriveKeyProvider.deriveEcdsaKeypair(
                "/",
                walletSecretSalt,
                this.runtime.agentId
            );

            return {
                hexPrivateKey: hex,
                keypair: response2.keypair,
            };
        } catch (error) {
            elizaLogger.error("Error in init wallet provider:", error.message);
        }
    }

    async syncStateData(): Promise<void> {}

    getEnv(key: string) {
        if (this.initialized) {
            const envInSpace = this.dataManager.getSpaceEnv(
                process.env.ON_CHAIN_STATE_AGENT_SPACE,
                key
            );
            const envInAgent = this.dataManager.getEnv(
                this.runtime.agentId,
                key
            );
            return envInAgent || envInSpace;
        }
        return process.env[key];
    }

    async get(key: string): Promise<{
        value: string;
        version: number;
    }> {
        const [value, version] =
            await this.agentContract.getLatestStateData(key);
        return { value, version };
    }

    async putSync(key: string, value: string, version?: number) {
        this.storeStateData(key, value, version);
    }

    async put(key: string, value: string, version?: number): Promise<void> {
        return await this.writeStateDataOnChain(key, value, version);
    }

    async fetchAgentInfo(): Promise<{}> {
        return await this.agentContract.info();
    }

    async fetchEnvValue(key: string): Promise<string | ""> {
        return await this.agentContract.getEnv(key);
    }

    async writeStateDataOnChain(
        key: string,
        value: string,
        version?: number
    ): Promise<any> {
        try {
            // Initialize wallet if not already done
            if (!this.wallet) {
                const result = await this.initialWallet();
                elizaLogger.info(
                    "on-chain state wallet address:",
                    result.keypair.address
                );
                this.wallet = new ethers.Wallet(
                    result.hexPrivateKey,
                    this.dataManager.rpcProvider
                );
                this.agentContractWrite = this.agentContract.connect(
                    this.wallet
                ) as Contract;
            }
            const tx = await this.agentContractWrite.storeStateData(
                key,
                ethers.toUtf8Bytes(value),
                version
            );
            await tx.wait(1); // Wait for transaction
        } catch (error) {
            elizaLogger.error("Error in storing state data:", error.message);

            // Update status to failed in database if error occurs
            await this.stateManager.updateStateStatus(
                key,
                "failed",
                version || 1
            );

            throw error;
        }
    }

    storeStateData(key: string, value: string, version: number) {
        const data = this.stateManager.getStateData(key);
        if (
            data != null &&
            (data.version > version ||
                (data.value === value && data.version == version))
        ) {
            return;
        }

        const stateData: Partial<StateData> = {
            key,
            value,
            status: "pending",
            version: version,
        };
        return this.stateManager.addStateData(stateData);
    }

    async getOldestPendingData(): Promise<StateData | null> {
        return this.stateManager.getOldestPendingData();
    }
}

export default OnChainStateService;
