import Database from 'better-sqlite3';
import { VerifiableState } from '../types';

export interface StateRecord {
    id: string;
    agentId: string;
    namespace: string;
    key: string;
    value: string;
    timestamp: number;
    signature: string;
}

export class StateDAO {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.initialize();
    }

    private initialize() {
        // Create agents table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                public_key TEXT NOT NULL,
                private_key TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        `);

        // Create states table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS states (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                namespace TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                signature TEXT NOT NULL,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
        `);
    }

    async addAgent(agentId: string, agentName: string, publicKey: string, privateKey: string): Promise<boolean> {
        try {
            const stmt = this.db.prepare(
                'INSERT INTO agents (id, name, public_key, private_key, created_at) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run(agentId, agentName, publicKey, privateKey, Date.now());
            return true;
        } catch (error) {
            console.error('Error adding agent:', error);
            return false;
        }
    }

    async addState(state: StateRecord): Promise<boolean> {
        const stmt = this.db.prepare(
            'INSERT INTO states (id, agent_id, namespace, key, value, timestamp, signature) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        const result = stmt.run(
            state.id,
            state.agentId,
            state.namespace,
            state.key,
            state.value,
            state.timestamp,
            state.signature
        );
        return result.changes > 0;
    }

    async getState(agentId: string, namespace: string, key: string): Promise<StateRecord | undefined> {
        const stmt = this.db.prepare(
            'SELECT * FROM states WHERE agent_id = ? AND namespace = ? AND key = ? ORDER BY timestamp DESC LIMIT 1'
        );
        return stmt.get(agentId, namespace, key) as StateRecord | undefined;
    }

    async getAgentPublicKey(agentId: string): Promise<string | undefined> {
        const stmt = this.db.prepare('SELECT public_key FROM agents WHERE id = ?');
        const result = stmt.get(agentId);
        return result ? (result as { public_key: string }).public_key : undefined;
    }

    async getAgentPrivateKey(agentId: string): Promise<string | undefined> {
        try {
            const stmt = this.db.prepare('SELECT private_key FROM agents WHERE id = ?');
            const result = stmt.get(agentId) as { private_key: string } | undefined;
            return result?.private_key;
        } catch (error) {
            console.error('Error getting agent private key:', error);
            return undefined;
        }
    }
}
