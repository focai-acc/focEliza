import {
    Prisma,
    PrismaClient,
    StateTransitionLog,
    StateTransition,
} from "@prisma/client";
import crypto from "crypto";

export enum SyncStatusType {
    Init = 0, // initial state
    Syncing = 1, // Synchronous
    SyncFail = 2, // synchronous failure
    Success = 3, // success or no need to sync
}

export enum IsVisibleType {
    Disable = 0, // 不可见
    Enable = 1, // 可见
}

export interface ExtJson {
    txHash?: string;
    error?: string;
}

export class StateTransitionDAO {
    private prisma: PrismaClient;

    constructor(dataSource?: string) {
        if (!dataSource) {
            this.prisma = new PrismaClient({
                datasourceUrl: dataSource,
            });
        } else {
            this.prisma = new PrismaClient();
        }
    }

    // 自动关闭 Prisma 连接
    async disconnect() {
        await this.prisma.$disconnect();
    }

    // 计算当前时间 + 15 分钟
    private calculateSyncTimeout(): Date {
        const now = new Date();
        return new Date(now.getTime() + 15 * 60 * 1000); // 当前时间 + 15 分钟
    }

    private generateID(nameSpace: string, dataKey: string) {
        const combined = nameSpace + dataKey;
        return crypto.createHash("sha256").update(combined).digest("hex");
    }

    async addStateItem(
        nameSpace: string,
        dataKey: string,
        dataValue: string,
        version: number
    ): Promise<StateTransition> {
        return this.prisma.$transaction(async (prisma) => {
            // 根据 nameSpace 和 dataKey 查询是否存在记录
            const existingRecord = await this.getStateTransition(
                nameSpace,
                dataKey
            );

            // 如果记录数据一致，直接返回现有记录
            if (
                existingRecord &&
                existingRecord.dataValue === dataValue &&
                existingRecord.version === version
            ) {
                return existingRecord;
            }

            if (existingRecord) {
                // 更新现有记录
                return prisma.stateTransition.update({
                    where: {
                        id: existingRecord.id,
                    },
                    data: {
                        dataValue: dataValue,
                        updatedAt: new Date(), // 更新 updatedAt
                        version: version, // 更新 dataVersion
                        logId: 0,
                    },
                });
            } else {
                // 如果不存在记录，创建新记录
                return prisma.stateTransition.create({
                    data: {
                        id: this.generateID(nameSpace, dataKey),
                        nameSpace: nameSpace,
                        dataKey: dataKey,
                        dataValue: dataValue,
                        version: version,
                        logId: 0,
                    },
                });
            }
        });
    }

    // 更新或者创建新记录
    async stateTransition(
        data: Omit<StateTransition, "id" | "createdAt" | "updatedAt" | "logId">,
        teeAccountKey: string,
        agentId: string
    ): Promise<StateTransition> {
        return this.prisma.$transaction(async (prisma) => {
            // 根据 nameSpace 和 dataKey 查询是否存在记录
            const existingRecord = await this.getStateTransition(
                data.nameSpace,
                data.dataKey
            );

            // 如果记录数据一致，直接返回现有记录
            if (existingRecord && existingRecord.dataValue === data.dataValue) {
                return existingRecord;
            }

            // 创建新的日志记录
            const newLog = await prisma.stateTransitionLog.create({
                data: {
                    nameSpace: data.nameSpace,
                    dataKey: data.dataKey,
                    dataValue: data.dataValue,
                    version: data.version,
                    teeAccountKey: teeAccountKey,
                    agentId: agentId,
                },
            });

            if (existingRecord) {
                // 更新现有记录
                return prisma.stateTransition.update({
                    where: {
                        id: existingRecord.id,
                        version: data.version,
                    },
                    data: {
                        dataValue: data.dataValue,
                        updatedAt: new Date(), // 更新 updatedAt
                        version: data.version + 1, // 更新 dataVersion
                        logId: newLog.id,
                    },
                });
            } else {
                // 如果不存在记录，创建新记录
                return prisma.stateTransition.create({
                    data: {
                        id: this.generateID(data.nameSpace, data.dataKey),
                        nameSpace: data.nameSpace,
                        dataKey: data.dataKey,
                        dataValue: data.dataValue,
                        version: data.version,
                        logId: newLog.id,
                    },
                });
            }
        });
    }

    // 根据 ID 查询记录
    async getStateTransition(
        nameSpace: string,
        dataKey: string
    ): Promise<StateTransition | null> {
        return this.prisma.stateTransition.findFirst({
            where: {
                nameSpace: nameSpace,
                dataKey: dataKey,
            },
        });
    }

    // 更新同步结果
    async updateStateTransitionLog(
        data: Partial<StateTransitionLog> & { id: number } // Ensure that `id` is required
    ): Promise<StateTransitionLog | null> {
        // Ensure id is provided
        if (!data.id) {
            throw new Error("ID is required to update StateTransitionLog");
        }

        const updateData: Partial<StateTransitionLog> = {};

        // Dynamically add non-null fields to updateData
        if (data.nameSpace !== undefined) updateData.nameSpace = data.nameSpace;
        if (data.dataKey !== undefined) updateData.dataKey = data.dataKey;
        if (data.dataValue !== undefined) updateData.dataValue = data.dataValue;
        if (data.version !== undefined) updateData.version = data.version;
        if (data.teeAccountKey !== undefined)
            updateData.teeAccountKey = data.teeAccountKey;
        if (data.syncStatus !== undefined)
            updateData.syncStatus = data.syncStatus;
        if (data.syncBatchId !== undefined)
            updateData.syncBatchId = data.syncBatchId;
        if (data.syncTimeOut !== undefined)
            updateData.syncTimeOut = data.syncTimeOut;
        if (data.syncResult !== undefined)
            updateData.syncResult = data.syncResult;

        // Always update the `updatedAt` field
        updateData.updatedAt = new Date();

        // Perform the update operation
        return this.prisma.stateTransitionLog.update({
            where: {
                id: data.id, // The ID of the record to be updated
            },
            data: updateData, // Only non-null fields
        });
    }

    // 更新记录
    async deleteAll(): Promise<Prisma.BatchPayload> {
        return this.prisma.stateTransitionLog.deleteMany();
    }

    // 获取所有记录
    async getLockedData(syncBatchId: string): Promise<StateTransitionLog[]> {
        return this.prisma.stateTransitionLog.findMany({
            where: {
                syncBatchId: syncBatchId,
            },
            orderBy: {
                id: "asc",
            },
        });
    }

    async lockRefreshData(syncBatchId: string, limit: number): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            // 获取符合条件的记录 ID 列表 select id from stateTransitionLog where syncStatus=0 or (syncStatus=1 and syncTimeOut<=current_timestamp;

            const recordsToUpdate = await tx.stateTransitionLog.findMany({
                where: {
                    OR: [
                        { syncStatus: 0 },
                        {
                            AND: [
                                { syncStatus: 1 },
                                { syncTimeOut: { lte: new Date() } },
                            ],
                        },
                    ],
                },
                orderBy: { id: "asc" },
                take: limit,
                select: { id: true },
            });

            if (recordsToUpdate.length === 0) {
                return 0; // 如果没有符合条件的记录，直接返回 0
            }

            const ids = recordsToUpdate.map((record) => record.id);

            // 更新符合条件的记录
            const result = await tx.stateTransitionLog.updateMany({
                where: { id: { in: ids } },
                data: {
                    syncStatus: SyncStatusType.Syncing,
                    syncTimeOut: new Date(Date.now() + 15 * 60 * 1000), // 当前时间 + 15 分钟
                    updatedAt: new Date(), // 设置为当前时间
                    syncBatchId: syncBatchId, // 设置 syncBatchId
                },
            });

            return result.count; // 返回更新的记录数
        });
    }
}
