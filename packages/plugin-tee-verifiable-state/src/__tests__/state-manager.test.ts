import { StateManager } from '../services/stateManager';
import { StateDAO } from '../adapters/sqliteTables';
import { VerifiableState } from '../types';
import path from 'path';
import fs from 'fs';

describe('StateManager', () => {
    let stateManager: StateManager;
    let stateDAO: StateDAO;
    let dbPath: string;

    const testAgent = {
        id: 'test-agent',
        name: 'Test Agent',
        publicKey: '',
        privateKey: ''
    };

    beforeEach(async () => {
        // Setup test database path
        dbPath = path.join(__dirname, 'test.db');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        // Create new instances
        stateDAO = new StateDAO(dbPath);
        stateManager = new StateManager(stateDAO);

        // Register test agent
        await stateManager.registerAgent(testAgent.id, testAgent.name);
    });

    afterEach(() => {
        // Cleanup test database
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    describe('State Management', () => {
        it('should set and get state successfully', async () => {
            const testValue = 'test-value';
            const namespace = 'test-ns';
            const key = 'test-key';

            // Set state
            const setResult = await stateManager.setState(testAgent.id, namespace, key, testValue);
            expect(setResult).toBe(true);

            // Get state
            const state = await stateManager.getState(testAgent.id, namespace, key);
            expect(state).toBeDefined();
            expect(state?.value).toBe(testValue);
        });

        it('should handle different value types', async () => {
            const testCases = [
                { type: 'string', value: 'test string' },
                { type: 'number', value: 123 },
                { type: 'boolean', value: true },
                { type: 'object', value: { test: 'object' } },
                { type: 'array', value: [1, 2, 3] }
            ];

            for (const testCase of testCases) {
                await stateManager.setState(testAgent.id, 'test-ns', 'key', testCase.value);
                const state = await stateManager.getState(testAgent.id, 'test-ns', 'key');
                expect(state?.value).toEqual(testCase.value);
            }
        });

        it('should return undefined for non-existent state', async () => {
            const state = await stateManager.getState('non-existent', 'test-ns', 'test-key');
            expect(state).toBeUndefined();
        });
    });

    describe('State Verification', () => {
        let testState: VerifiableState;

        beforeEach(async () => {
            // Set test state
            await stateManager.setState(testAgent.id, 'test-ns', 'test-key', 'test-value');
            const state = await stateManager.getState(testAgent.id, 'test-ns', 'test-key');
            expect(state).toBeDefined();
            testState = state!;
        });

        it('should verify valid state', async () => {
            const isValid = await stateManager.verifyState(testState);
            expect(isValid).toBe(true);
        });

        it('should reject tampered state', async () => {
            const tamperedState = {
                ...testState,
                value: 'tampered-value'
            };

            const isValid = await stateManager.verifyState(tamperedState);
            expect(isValid).toBe(false);
        });
    });
});
