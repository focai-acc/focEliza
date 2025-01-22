import { VerifiableStatePlugin } from '../plugins/verifiable-state';
import { VerifiableState } from '../types';
import fs from 'fs';
import path from 'path';

describe('VerifiableStatePlugin', () => {
    let plugin: VerifiableStatePlugin;
    const testAgent = {
        id: 'test-agent',
        name: 'Test Agent'
    };

    beforeEach(async () => {
        // Create data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Clean up test database if exists
        const dbPath = path.join(process.cwd(), 'data', 'verifiable-state.db');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        plugin = new VerifiableStatePlugin();
        await plugin.initialize(testAgent.id);
    });

    describe('State Management', () => {
        it('should set and get state successfully', async () => {
            const namespace = 'test-namespace';
            const key = 'test-key';
            const value = 'test-value';

            // Set state
            const setResult = await plugin.setState(namespace, key, value);
            expect(setResult).toBe(true);

            // Get state
            const state = await plugin.getState(namespace, key);
            expect(state).toBeDefined();
            expect(state?.value).toBe(value);
        });

        it('should handle different value types', async () => {
            const namespace = 'test-namespace';
            const key = 'test-key';
            const testCases = [
                'string value',
                123,
                { nested: { object: true } },
                [1, 2, 3],
                true,
            ];

            for (const value of testCases) {
                await plugin.setState(namespace, key, value);
                const state = await plugin.getState(namespace, key);
                expect(state?.value).toEqual(value);
            }
        });
    });

    describe('State Verification', () => {
        let testState: VerifiableState;

        beforeEach(async () => {
            await plugin.setState('test-namespace', 'test-key', 'test-value');
            const state = await plugin.getState('test-namespace', 'test-key');
            expect(state).toBeDefined();
            testState = state!;
        });

        it('should verify valid state', async () => {
            const isValid = await plugin.verifyState(testState);
            expect(isValid).toBe(true);
        });

        it('should reject tampered state', async () => {
            const tamperedState = {
                ...testState,
                value: 'tampered-value'
            };

            const isValid = await plugin.verifyState(tamperedState);
            expect(isValid).toBe(false);
        });
    });
});
