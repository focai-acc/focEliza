import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
} from "vitest";
import {
    PrismaClient,
    StateTransition,
} from "@prisma/client";
import {
    StateTransitionDAO,
    SyncStatusType,
} from "../database/stateTransition.ts"; // Assuming the path is correct

let prisma: PrismaClient;
let dao: StateTransitionDAO;

beforeAll(async () => {
    // Initialize Prisma client with a real SQLite database
    prisma = new PrismaClient();
    dao = new StateTransitionDAO("file:./test.db"); // Ensure correct path to SQLite DB
});

beforeEach(async () => {
    // Setup - clear all data before each test
    await prisma.stateTransition.deleteMany({});
    await prisma.stateTransitionLog.deleteMany({});
});

afterAll(async () => {
    // Cleanup - disconnect Prisma client after tests
    await prisma.$disconnect();
});

describe("StateTransitionDAO", () => {
    it("should create a new state transition when no existing record is found", async () => {
        const newData: Omit<
            StateTransition,
            "id" | "createdAt" | "updatedAt" | "logId"
        > = {
            nameSpace: "testNamespace",
            dataKey: "testKey",
            dataValue: "testValue",
            version: 1,
        };
        const teeAccountKey = "teeAccount";
        const agentId = "agentId";

        // Create a new state transition record
        const result = await dao.stateTransition(
            newData,
            teeAccountKey,
            agentId
        );

        const stateTransition = await prisma.stateTransition.findUnique({
            where: { id: result.id },
        });

        expect(stateTransition).not.toBeNull();
        expect(stateTransition?.dataValue).toBe(newData.dataValue);

        const stateTransitionlog = await prisma.stateTransitionLog.findUnique({
            where: { id: result.logId },
        });
        expect(stateTransitionlog).not.toBeNull();


        await dao.updateStateTransitionLog({
            ...stateTransitionlog, // `id` is required as part of the object
            syncBatchId: "syncBatchId",
            syncStatus: SyncStatusType.Success,
            syncResult: "success",
            syncTimeOut: new Date(),
        });

        const log2 = await prisma.stateTransitionLog.findUnique({
            where: { id: result.logId },
        });
        expect(log2).not.toBeNull();
        expect(log2.syncResult).toEqual("success");
        expect(log2.syncBatchId).toEqual("syncBatchId");
        expect(log2.syncStatus).toEqual(SyncStatusType.Success);
    });

    it("should fetch locked data by syncBatchId", async () => {
        const syncBatchId = "batch-id";
        await prisma.stateTransitionLog.create({
            data: {
                nameSpace: "testNamespace",
                dataKey: "testKey",
                dataValue: "testValue",
                version: 1,
                teeAccountKey: "teeAccount",
                agentId: "agentId",
                syncStatus: SyncStatusType.Init,
                syncBatchId: syncBatchId,
            },
        });

        const lockedData = await dao.getLockedData(syncBatchId);

        expect(lockedData).toHaveLength(1); // Should return 1 record
        expect(lockedData[0].syncBatchId).toBe(syncBatchId);
    });

    it("should lock and refresh data", async () => {
        const syncBatchId = "batch-id";
        const limit = 3;

        // Insert dummy data to be locked and refreshed
        await prisma.stateTransitionLog.create({
            data: {
                nameSpace: "testNamespace",
                dataKey: "testKey",
                dataValue: "testValue",
                version: 1,
                teeAccountKey: "teeAccount",
                agentId: "agentId",
                syncStatus: SyncStatusType.Init,
            },
        });

        // Lock and refresh data
        const result = await dao.lockRefreshData(syncBatchId, limit);

        const lockedData = await prisma.stateTransitionLog.findMany({
            where: { syncBatchId },
        });

        expect(result).toBeGreaterThan(0); // Ensure records were locked
        expect(lockedData).toHaveLength(1); // Should match the locked data
    });
});
