import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import {
    VerifiableLog,
    VerifiableAgent,
    VerifiableDAO,
    VerifiableLogQuery,
    PageQuery,
} from "../types/logTypes.ts";

export class SQLite3VerifiableDAO extends VerifiableDAO<Database> {
    constructor(db: Database) {
        super();
        this.db = db;
        // load(db);
        // check if the tables exist, if not create them
        const tables = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('verifiable-logs', 'verifiable-agents');"
            )
            .all();
        if (tables.length !== 2) {
            this.initializeSchema();
        }
    }

    async initializeSchema(): Promise<void> {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS "verifiable_logs"
            (
                "id"         TEXT PRIMARY KEY,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "agent_id"   TEXT NOT NULL,
                "room_id"    TEXT NOT NULL,
                "user_id"    TEXT,
                "type"       TEXT,
                "content"    TEXT NOT NULL,
                "signature"  TEXT NOT NULL
            );
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS "verifiable_agents"
            (
                "id"         TEXT PRIMARY KEY,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "agent_id"   TEXT NOT NULL,
                "tee_key"    TEXT NOT NULL,
                "public_key" TEXT NOT NULL,
                UNIQUE ("agent_id")
            );
        `);
    }

    async addLog(log: VerifiableLog): Promise<boolean> {
        const sql = `
            INSERT INTO "verifiable_logs" ("id", "created_at", "agent_id", "room_id", "user_id", "type", "content",
                                           "signature")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
        try {
            this.db
                .prepare(sql)
                .run(
                    log.id || uuidv4(),
                    log.created_at || new Date().getTime(),
                    log.agent_id,
                    log.room_id,
                    log.user_id,
                    log.type,
                    log.content,
                    log.signature
                );
            return true;
        } catch (error) {
            console.error("SQLite3 Error adding log:", error);
            return false;
        }
    }

    async pageQueryLogs(
        query: VerifiableLogQuery,
        page: number,
        pageSize: number
    ): Promise<PageQuery<VerifiableLog[]>> {
        const conditions: string[] = [];
        const params: any[] = [];

        // 动态构建查询条件
        if (query.idEq) {
            conditions.push(`id = ?`);
            params.push(query.idEq);
        }
        if (query.agentIdEq) {
            conditions.push(`agent_id = ?`);
            params.push(query.agentIdEq);
        }
        if (query.roomIdEq) {
            conditions.push(`room_id = ?`);
            params.push(query.roomIdEq);
        }
        if (query.userIdEq) {
            conditions.push(`user_id = ?`);
            params.push(query.userIdEq);
        }
        if (query.typeEq) {
            conditions.push(`type = ?`);
            params.push(query.typeEq);
        }
        if (query.contLike) {
            conditions.push(`content LIKE ?`);
            params.push(`%${query.contLike}%`);
        }
        if (query.signatureEq) {
            conditions.push(`signature = ?`);
            params.push(query.signatureEq);
        }

        // WHERE 子句
        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // 分页参数
        if (page < 1) {
            page = 1;
        }
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // 数据库连接

        try {
            // 查询总条数
            const totalQuery = `SELECT COUNT(*) AS total
                                FROM verifiable_logs ${whereClause}`;
            const stmt = this.db.prepare(totalQuery);
            const totalResult = stmt.get(params);
            const total = totalResult.total;

            // 查询分页数据
            const dataQuery = `
                SELECT *
                FROM verifiable_logs ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
            const dataResult = this.db
                .prepare(dataQuery)
                .all(...params, limit, offset);

            return {
                page: page,
                pageSize: pageSize,
                total: total,
                data: dataResult,
            } as PageQuery<VerifiableLog[]>;
        } catch (error) {
            console.error("Error querying verifiable_logs:", error);
            throw error;
        }
    }

    async addAgent(agent: VerifiableAgent): Promise<boolean> {
        const sql = `
            INSERT INTO "verifiable_agents" ("id", "created_at", "agent_id", "tee_key", "public_key")
            VALUES (?, ?, ?, ?, ?);
        `;
        try {
            this.db
                .prepare(sql)
                .run(
                    agent.id || uuidv4(),
                    agent.created_at || new Date().getTime(),
                    agent.agent_id,
                    agent.tee_key,
                    agent.public_key
                );
            return true;
        } catch (error) {
            console.error("SQLite3 Error adding agent:", error);
            return false;
        }
    }

    async getAgent(agentId: string): Promise<VerifiableAgent> {
        const sql = `SELECT *
                     FROM "verifiable_agents"
                     WHERE agent_id = ?`;
        try {
            const agent = this.db.prepare(sql).get(agentId);
            if (agent) {
                return agent as VerifiableAgent;
            } else {
                return null;
            }
        } catch (error) {
            console.error("SQLite3 Error getting agent:", error);
            throw error;
        }
    }

    async listAgent(): Promise<VerifiableAgent[]> {
        const sql = `SELECT *
                     FROM "verifiable_agents"`;
        try {
            const agents = this.db.prepare(sql).all();
            return agents as VerifiableAgent[];
        } catch (error) {
            console.error("SQLite3 Error listing agent:", error);
            throw error;
        }
    }
}
