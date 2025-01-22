import { StateDAO } from '../adapters/sqliteTables';
import path from 'path';
import fs from 'fs';

describe('StateDAO', () => {
    let stateDAO: StateDAO;
    let dbPath: string;

    beforeEach(() => {
        // Setup test database
        dbPath = path.join(__dirname, 'test-dao.db');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        stateDAO = new StateDAO(dbPath);
    });

    afterEach(() => {
        // Cleanup test database
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    describe('Agent Management', () => {
        it('should add agent successfully', async () => {
            const result = await stateDAO.addAgent(
                'test-agent',
                'Test Agent',
                'test-public-key',
                'test-private-key'
            );
            expect(result).toBe(true);
        });

        it('should retrieve agent public key', async () => {
            const testPublicKey = 'test-public-key';
            const testPrivateKey = 'test-private-key';
            await stateDAO.addAgent('test-agent', 'Test Agent', testPublicKey, testPrivateKey);

            const publicKey = await stateDAO.getAgentPublicKey('test-agent');
            expect(publicKey).toBe(testPublicKey);
        });

        it('should retrieve agent private key', async () => {
            const testPublicKey = 'test-public-key';
            const testPrivateKey = 'test-private-key';
            await stateDAO.addAgent('test-agent', 'Test Agent', testPublicKey, testPrivateKey);

            const privateKey = await stateDAO.getAgentPrivateKey('test-agent');
            expect(privateKey).toBe(testPrivateKey);
        });

        it('should return undefined for non-existent agent', async () => {
            const publicKey = await stateDAO.getAgentPublicKey('non-existent');
            expect(publicKey).toBeUndefined();
        });
    });

    describe('State Management', () => {
        const testState = {
            id: 'test-state-id',
            agentId: 'test-agent',
            namespace: 'test-ns',
            key: 'test-key',
            value: 'test-value',
            timestamp: Date.now(),
            signature: 'test-signature'
        };

        beforeEach(async () => {
            // Add test agent
            await stateDAO.addAgent(
                testState.agentId,
                'Test Agent',
                'test-public-key',
                'test-private-key'
            );
        });

        it('should add state successfully', async () => {
            const result = await stateDAO.addState(testState);
            expect(result).toBe(true);
        });

        it('should retrieve state by agent, namespace and key', async () => {
            // Add state
            await stateDAO.addState(testState);

            // Retrieve state
            const state = await stateDAO.getState(
                testState.agentId,
                testState.namespace,
                testState.key
            );

            expect(state).toBeDefined();
            expect(state?.id).toBe(testState.id);
            expect(state?.value).toBe(testState.value);
            expect(state?.signature).toBe(testState.signature);
        });

        it('should return undefined for non-existent state', async () => {
            const state = await stateDAO.getState(
                'non-existent',
                'test-ns',
                'test-key'
            );
            expect(state).toBeUndefined();
        });

        it('should handle multiple states for same key', async () => {
            // Add first state
            await stateDAO.addState(testState);

            // Add second state with same key but different timestamp
            const newState = {
                ...testState,
                id: 'test-state-id-2',
                value: 'updated-value',
                timestamp: testState.timestamp + 1000,
                signature: 'new-signature'
            };
            await stateDAO.addState(newState);

            // Retrieve latest state
            const state = await stateDAO.getState(
                testState.agentId,
                testState.namespace,
                testState.key
            );

            expect(state).toBeDefined();
            expect(state?.id).toBe(newState.id);
            expect(state?.value).toBe(newState.value);
            expect(state?.signature).toBe(newState.signature);
        });
    });

    describe('Database Integrity', () => {
        it('should maintain foreign key constraints', async () => {
            const testState = {
                id: 'test-state-id',
                agentId: 'non-existent-agent',
                namespace: 'test-ns',
                key: 'test-key',
                value: 'test-value',
                timestamp: Date.now(),
                signature: 'test-signature'
            };

            // Attempt to add state for non-existent agent should fail
            await expect(stateDAO.addState(testState)).rejects.toThrow();
        });

        it('should prevent duplicate agent IDs', async () => {
            await stateDAO.addAgent('test-agent', 'Test Agent', 'test-key', 'test-private-key');
            
            // Attempt to add agent with same ID should fail
            await expect(
                stateDAO.addAgent('test-agent', 'Another Agent', 'another-key', 'another-private-key')
            ).rejects.toThrow();
        });
    });
});
