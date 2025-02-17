import { StateTransitionDAO } from "../database/stateTransition.ts";
import { StateTransition } from "@prisma/client";
import { StateManageContractEndPoint } from "../contract/stateManageContract.ts";
import { PrivateKeyAccount } from "viem";
import { IOnchainStateService } from "@elizaos/core";

export class StateService implements IOnchainStateService {
    private stateDBCache: StateTransitionDAO;
    private agentId: string;
    private namespace: string;
    private teeAccountKey: string;
    private keypair: PrivateKeyAccount;
    private stateManageContractEndPoint: StateManageContractEndPoint;

    constructor(
        stateDBCache: StateTransitionDAO,
        agentId: string,
        namespace: string,
        teeAccountKey: string,
        keypair: PrivateKeyAccount,
        stateManageContractEndPoint: StateManageContractEndPoint
    ) {
        this.namespace = namespace;
        this.teeAccountKey = teeAccountKey;
        this.agentId = agentId;
        this.stateDBCache = stateDBCache;
        this.keypair = keypair;
        this.stateManageContractEndPoint = stateManageContractEndPoint;
    }

    async get(
        key: string
    ): Promise<{ value: string; version: number }> {
        const state = await this.stateDBCache.getStateTransition(
            this.namespace,
            key
        );
        if (state) {
            return {
                value: state.dataValue,
                version: state.version,
            };
        } else {
            let read = await this.stateManageContractEndPoint.read(
                this.keypair,
                this.namespace,
                key
            );
            if (read) {
                await this.stateDBCache.addStateItem(
                    this.namespace,
                    key,
                    read.value,
                    read.version
                );
                return {
                    value: read.value,
                    version: read.version,
                };
            }
            return {
                value: "",
                version: -1,
            };
        }
    }

    async put(
        key: string,
        value: string,
        version?: number
    ): Promise<boolean> {
        const data: Omit<
            StateTransition,
            "id" | "createdAt" | "updatedAt" | "logId"
        > = {
            nameSpace: this.namespace,
            dataKey: key,
            dataValue: value,
            version: version,
        };

        //读取成功后写入到数据库
        const stateCachePromise = await this.stateDBCache.stateTransition(
            data,
            this.teeAccountKey,
            this.agentId
        );
        return stateCachePromise != null;
    }
}
