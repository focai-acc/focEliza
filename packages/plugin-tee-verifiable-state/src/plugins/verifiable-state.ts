import { Plugin, VerifiableState } from '../types';
import { StateManager } from '../services/stateManager';
import { StateDAO } from '../adapters/sqliteTables';
import path from 'path';

export class VerifiableStatePlugin implements Plugin {
    private stateManager: StateManager;
    private stateDAO: StateDAO;
    private agentId: string = '';

    constructor() {
        const dbPath = path.join(process.cwd(), 'data', 'verifiable-state.db');
        this.stateDAO = new StateDAO(dbPath);
        this.stateManager = new StateManager(this.stateDAO);
    }

    async initialize(agentId: string): Promise<void> {
        this.agentId = agentId;
        await this.stateManager.registerAgent(agentId, `Agent ${agentId}`);
    }

    async setState(namespace: string, key: string, value: any): Promise<boolean> {
        return this.stateManager.setState(this.agentId, namespace, key, value);
    }

    async getState(namespace: string, key: string): Promise<VerifiableState | undefined> {
        return this.stateManager.getState(this.agentId, namespace, key);
    }

    async verifyState(state: VerifiableState): Promise<boolean> {
        return this.stateManager.verifyState(state);
    }
}
