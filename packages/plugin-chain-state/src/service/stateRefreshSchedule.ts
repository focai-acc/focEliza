import { StateManageContractEndPoint } from "../contract/stateManageContract.ts";
import {
    StateTransitionDAO,
    SyncStatusType,
} from "../database/stateTransition.ts";
import { uuidV4, randomBytes } from "ethers";
import { TeeDeriveKeyProvider } from "./teeDeriveKeyProvider.ts";
import { PrivateKeyAccount } from "viem";
import { StateTransitionLog } from "@prisma/client";

export class StateRefreshSchedule {
    private contractEndPoint: StateManageContractEndPoint;
    private stateTransitionDAO: StateTransitionDAO;
    private teeDeriveKeyProvider: TeeDeriveKeyProvider;

    constructor(
        chainNSState: StateManageContractEndPoint,
        stateDBCache: StateTransitionDAO,
        teeDeriveKeyProvider: TeeDeriveKeyProvider
    ) {
        this.contractEndPoint = chainNSState;
        this.stateTransitionDAO = stateDBCache;
        this.teeDeriveKeyProvider = teeDeriveKeyProvider;
    }

    async start(): Promise<void> {
        const handleStateUpdateLoop = () => {
            this.syncStateToChain();
            setTimeout(
                handleStateUpdateLoop,
                // Defaults to 2 minutes
                120 * 1000
            );
        };
        handleStateUpdateLoop();
    }

    private async syncStateToChain(): Promise<void> {
        const uid = uuidV4(randomBytes(32));
        const count = await this.stateTransitionDAO.lockRefreshData(uid, 20);
        if (count == 0) {
            return;
        }

        const lockedData = await this.stateTransitionDAO.getLockedData(uid);
        const groupedData = new Map<string, StateTransitionLog[]>();
        const pkAccountData = new Map<string, PrivateKeyAccount>();

        for (const data of lockedData) {
            const key = `${data.teeAccountKey}-${data.agentId}`;
            if (!groupedData.has(key)) {
                const stateTransitionLogElement =
                    new Array<StateTransitionLog>();
                groupedData.set(key, stateTransitionLogElement);
            }
            groupedData.get(key).push(data);

            if (!pkAccountData.has(key)) {
                const ecdsaKeypair =
                    await this.teeDeriveKeyProvider.getEcdsaKeypair(
                        data.teeAccountKey,
                        data.agentId
                    );
                pkAccountData.set(key, ecdsaKeypair.keypair);
            }
        }

        for (const [key, logs] of groupedData) {
            const privateKeyAccount = pkAccountData.get(key);
            await this.writeChainKV(privateKeyAccount, logs);
        }
    }

    private async writeChainKV(
        account: PrivateKeyAccount,
        logs: StateTransitionLog[]
    ): Promise<void> {
        for (const data of logs) {
            try {
                const writeHash = await this.contractEndPoint.write(
                    account,
                    data.nameSpace,
                    data.dataKey,
                    data.dataValue,
                    BigInt(data.version)
                );
                await this.stateTransitionDAO.updateStateTransitionLog({
                    ...data,
                    syncStatus: SyncStatusType.Success,
                    syncBatchId: null,
                    syncResult: writeHash,
                });
            } catch (error) {
                await this.stateTransitionDAO.updateStateTransitionLog({
                    ...data,
                    syncStatus: SyncStatusType.SyncFail,
                    syncBatchId: null,
                    syncResult: error.toString(),
                });
            }
        }
    }

    private async upFromReadKV(
        account: PrivateKeyAccount,
        logs: StateTransitionLog[]
    ): Promise<void> {
        for (const data of logs) {
            try {
                const { value, version } = await this.contractEndPoint.read(
                    account,
                    data.nameSpace,
                    data.dataKey
                );
                await this.stateTransitionDAO.updateStateTransitionLog({
                    ...data,
                    dataValue: value,
                    version: version,
                    syncStatus: SyncStatusType.Success,
                    syncBatchId: null,
                    syncResult: "success",
                });
            } catch (error) {
                await this.stateTransitionDAO.updateStateTransitionLog({
                    ...data,
                    syncStatus: SyncStatusType.SyncFail,
                    syncBatchId: null,
                    syncResult: error.toString(),
                });
            }
        }
    }
}
