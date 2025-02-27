import {
    type IAgentRuntime,
    type IOnchainStateService,
    Service,
    ServiceType,
    elizaLogger,
} from "@elizaos/core";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import { DeriveKeyResponse } from "@phala/dstack-sdk";
import {
    Contract,
    BaseContract,
    ethers,
    type Wallet,
    ContractTransactionReceipt,
} from "ethers";
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

        // Initialize state
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

    async syncStateData(): Promise<void> {
        // maybe the local state data is inconsistent with on-chain, sync is needed.
        const data: StateData | null =
            this.stateManager.getOldestUnConfirmedData();
        if (data != null) {
            const valueOnchain = await this.agentContract.getStateData(
                data.key,
                data.version
            );
            if (data.value != valueOnchain) {
                this.stateManager.addStateData({
                    key: data.key,
                    value: valueOnchain,
                    version: data.version,
                    hash: data.hash,
                    status: "confirmed",
                });
            }
        }
    }

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

    async putLocal(key: string, value: string, version = 1): Promise<boolean> {
        const data = this.stateManager.getStateData(key);
        if (
            data != null &&
            (data.version > version ||
                (data.value === value && data.version == version))
        ) {
            // pass smaller version or equal version with equal value
            elizaLogger.error(
                "On-chain State Service put local data is illegal"
            );
            return false;
        }

        const stateData: Partial<StateData> = {
            key,
            value,
            status: "pending",
            version: version,
            hash: null,
        };

        let success = this.stateManager.addStateData(stateData);

        if (success) {
            elizaLogger.success(
                "On-chain State Service put local data successfully."
            );
            return true;
        } else {
            elizaLogger.error("On-chain State Service put local data failed");
            return false;
        }
    }

    async putOnchain(
        key: string,
        value: string,
        version?: number
    ): Promise<boolean> {
        return await this.writeStateDataOnChain(key, value, true, version);
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
        direct = false,
        version = 1
    ): Promise<boolean> {
        try {
            // Initialize wallet if not already done
            if (!this.wallet) {
                const result = await this.initialWallet();
                elizaLogger.info(
                    "On-chain State Service init wallet address:",
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
            const receipt: ContractTransactionReceipt = await tx.wait(1);
            if (receipt.status === 0) {
                throw new Error(
                    "On-chain State Service transaction of write on-chain data is failed"
                );
            }

            /* receipt *
             {
                "_type": "TransactionReceipt",
                "blockHash": "0x5ea98915b9d2eba6055a2c66a3e990c166dd75264ef936b0b1760d8d9bc82494",
                "blockNumber": 24333576,
                "contractAddress": null,
                "cumulativeGasUsed": "324678",
                "from": "0xB20F6adf676D488b22962f0C84CD011BE6DD63cB",
                "gasPrice": "1000255",
                "blobGasUsed": null,
                "blobGasPrice": null,
                "gasUsed": "45238",
                "hash": "0x4c1e55f40bf19b547d198817a0762a4e201035e99d4ca1dc836c57444663cfdb",
                "index": 3,
                "logs": [
                    {
                        "_type": "log",
                        "address": "0xFC782548442807073FFB83cf2dbB155BeE455C45",
                        "blockHash": "0x5ea98915b9d2eba6055a2c66a3e990c166dd75264ef936b0b1760d8d9bc82494",
                        "blockNumber": 24333576,
                        "data": "0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000876616c7565303032000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000876616c7565303033000000000000000000000000000000000000000000000000",
                        "index": 5,
                        "topics": [
                            "0x2221bdfd06a5d79ff14790c27e39a244bc5ab8beb0f1430b3fd0f2eb9539e5bd",
                            "0x000000000000000000000000b20f6adf676d488b22962f0c84cd011be6dd63cb",
                            "0xc549bea98ab1156180a25e7ed271043516a191abc3c54408d296fc6e6a849131"
                        ],
                        "transactionHash": "0x4c1e55f40bf19b547d198817a0762a4e201035e99d4ca1dc836c57444663cfdb",
                        "transactionIndex": 3
                    }
                ],
                "logsBloom": "0x00000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000020000000000100000000000000000000020000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000800000000000020000000000000800000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000008000000000000000000000000000000000000000000000000000",
                "status": 1,
                "to": "0xFC782548442807073FFB83cf2dbB155BeE455C45"
            }
             */
            const event = receipt.logs?.find(
                (e) =>
                    e.topics[0] ===
                    ethers.id(
                        "StateDataChanged(address,string,bytes,bytes,uint64)"
                    )
            );
            if (event) {
                if (direct) {
                    this.stateManager.addStateData({
                        key,
                        value,
                        version,
                        hash: receipt.hash,
                        status: "confirmed",
                    });
                } else {
                    // Update status to confirmed in database
                    this.stateManager.updateStateStatus({
                        key,
                        version: version,
                        hash: receipt.hash,
                        status: "confirmed",
                    });
                }

                elizaLogger.success(
                    "On-chain State Service write data on-chain"
                );
                return true;
            } else {
                // unparsed event from lastest block.
                throw new Error(
                    "On-chain State Service unparsed event from lastest block"
                );
            }
        } catch (error) {
            // Update status to failed in database if error occurs
            this.stateManager.updateStateStatus({
                key,
                version: version,
                status: "failed",
            });

            elizaLogger.error(
                "On-chain State Service storing state data failed:",
                error.message
            );
            throw error;
        }
    }

    storeStateData(key: string, value: string, version = 1) {
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

    async getOldestUnConfirmedData(): Promise<StateData | null> {
        return this.stateManager.getOldestUnConfirmedData();
    }
}

export default OnChainStateService;
