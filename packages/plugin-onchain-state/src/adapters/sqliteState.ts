import { Database } from "better-sqlite3";
import { StateData } from "../types.ts";
import { elizaLogger } from "@elizaos/core";

export class SqliteStateData {
    private db: Database;
    private agentId: string;
    private readonly DATA_TABLE_NAME = "onchain_state_data";

    constructor(db: Database) {
        this.db = db;
    }

    async initialize(agentId: string): Promise<void> {
        this.agentId = agentId;
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.DATA_TABLE_NAME} (
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                version INTEGER NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
                hash TEXT,
                agent_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (key, version, agent_id)
            );
        `);
    }

    getStateData(key: string, version?: number): StateData | null {
        const stmt = this.db.prepare<{}, StateData>(
            `SELECT * FROM ${this.DATA_TABLE_NAME}
            WHERE key = ? AND agent_id = ?
            ${version !== undefined ? "AND version = ?" : ""}
            ORDER BY version DESC LIMIT 1`
        );
        try {
            const params: any[] = [key, this.agentId];
            if (version) {
                params.push(version);
            }
            const row = stmt.get(params);
            if (!row) return null;
            return row;
        } catch (error) {
            elizaLogger.error("Error getting state data from database", error);
            return null;
        }
    }

    addStateData(data: Partial<StateData>): boolean {
        const stmt = this.db.prepare(
            `INSERT INTO ${this.DATA_TABLE_NAME}
            (key, value, version, status, agent_id)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key, version, agent_id)
            DO UPDATE SET
            value = excluded.value,
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP`
        );
        try {
            stmt.run(
                data.key,
                data.value,
                data.version,
                data.status,
                this.agentId
            );
            return true;
        } catch (error) {
            elizaLogger.error("Error adding state data to database", error);
            return false;
        }
    }

    async updateStateStatus(
        key: string,
        status: StateData["status"],
        version: number,
        hash?: string
    ): Promise<boolean> {
        const stmt = this.db.prepare(
            `UPDATE ${this.DATA_TABLE_NAME}
            SET status = ?,
            hash = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE key = ? AND agent_id = ? AND version = ?`
        );
        try {
            const params = [status, hash || null, key, version, this.agentId];
            const result = stmt.run(...params);
            return result.changes > 0;
        } catch (error) {
            elizaLogger.error("Error updating state status in database", error);
            return false;
        }
    }

    getOldestPendingData(): StateData | null {
        const stmt = this.db.prepare<{}, StateData>(
            `SELECT * FROM ${this.DATA_TABLE_NAME}
            WHERE status = 'pending' AND agent_id = ?
            ORDER BY created_at ASC LIMIT 1`
        );
        try {
            const row = stmt.get(this.agentId);
            if (!row) return null;
            return row;
        } catch (error) {
            elizaLogger.error(
                "Error getting oldest pending state from database",
                error
            );
            return null;
        }
    }

    getAllPendingData(): StateData[] {
        const stmt = this.db.prepare<{}, StateData>(
            `SELECT * FROM ${this.DATA_TABLE_NAME}
            WHERE status = 'pending' AND agent_id = ?
            ORDER BY created_at ASC`
        );
        try {
            return stmt.all(this.agentId);
        } catch (error) {
            elizaLogger.error(
                "Error getting all pending state data from database",
                error
            );
            return [];
        }
    }
}
