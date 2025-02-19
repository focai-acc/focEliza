import {
    type IAgentRuntime,
    type IOnchainStateService,
    Service,
    ServiceType,
    elizaLogger
} from "@elizaos/core";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import { DeriveKeyResponse } from "@phala/dstack-sdk";
import { Contract,BaseContract, ethers, type Wallet } from 'ethers';
import { OnChainDataManger } from "./onChainDataManger.ts";
import { PrivateKeyAccount, keccak256 } from "viem";

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

        this.initialized = true;
    }

    async initialWallet(): Promise<{hexPrivateKey:string,keypair:PrivateKeyAccount}>  {
        const teeMode = this.runtime.getSetting("TEE_MODE");
        if (teeMode === TEEMode.OFF) {
            return;
        }
        const deriveKeyProvider = new DeriveKeyProvider(teeMode);
        try {
            const walletSecretSalt = this.runtime.getSetting("WALLET_SECRET_SALT");
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
                keypair: response2.keypair
            };
        } catch (error) {
            elizaLogger.error("Error in init wallet provider:", error.message);
        }
    }

    getEnv(key: string) {
        if(this.initialized) {
            const envInSpace = this.dataManager.getSpaceEnv(process.env.ON_CHAIN_STATE_AGENT_SPACE, key);
            const envInAgent = this.dataManager.getEnv(this.runtime.agentId, key);
            return envInAgent || envInSpace;
        }
        return process.env[key];
    }

    async get(key: string): Promise<{
        value: string;
        version: number;
    }> {
        const [value, version] = await this.agentContract.getLatestStateData(key);
        return {value,version};
    }

    async put(key: string, value: string, version?: number): Promise<void> {
        if(!this.wallet) {
            const result = await this.initialWallet();
            elizaLogger.info("on-chain state wallet address:",result.keypair.address);
            this.wallet = new ethers.Wallet(result.hexPrivateKey,this.dataManager.rpcProvider);
            this.agentContractWrite = this.agentContract.connect(this.wallet) as Contract;
        }
        await this.agentContractWrite.storeStateData(key,ethers.toUtf8Bytes(value),version || 1);
    }

    async fetchAgentInfo(): Promise<{}> {
        return await this.agentContract.info();
    }

    async fetchEnvValue(key: string): Promise<string|"" > {
        return await this.agentContract.getEnv(key);
    }

    async storeStateData(key:string,value:string) {
        try {

        } catch (error) {
            elizaLogger.error("Error in wallet provider:", error.message);
        }
        const tx = await this.agentContract.storeStateData(key,value);
    }

    async fetchDatabaseData(agentId: string, from: number, to: number) {
        // const events = await this.agentContract.queryFilter('DBDataRecorded', from, to);
        // for (let i = 0; i < events.length; i++) {
        //     const event = events[i];
        //     const block = await event.getBlock();
        //     const txHash = event.transactionHash;
        //     const creator = event?.args[0];
        //     const version = event?.args[1];
        //     const table = event.args[2];
        //     const id = event.args[3];
        //     const data = event.args[4];

        //     if(table === "memory") {
        //         const rowData = JSON.parse(data);
        //         const memory: Memory = {
        //             id,
        //             userId: rowData["userId"],
        //             agentId,
        //             createdAt: rowData["createdAt"],
        //             content: JSON.stringify(rowData["content"]),
        //             embedding: JSON.stringify(rowData["embedding"]),
        //             roomId: rowData["roomId"],
        //             unique: rowData["unique"],
        //             similarity: rowData["similarity"]
        //         };
        //         this.runtime.databaseAdapter.createMemory(memory, rowData["type"]);
        //     }
        // }
    }

}

export default OnChainStateService;
