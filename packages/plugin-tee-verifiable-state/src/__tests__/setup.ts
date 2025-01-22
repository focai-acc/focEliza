import { jest } from '@jest/globals';

// Mock fs module
jest.mock('fs', () => {
    const actualFs = jest.requireActual('fs') as typeof import('fs');
    return {
        ...actualFs,
        existsSync: jest.fn(actualFs.existsSync),
        unlinkSync: jest.fn(actualFs.unlinkSync),
        mkdirSync: jest.fn(actualFs.mkdirSync),
    };
});

// Global test setup
beforeAll(() => {
    // Setup any global test configuration
});

// Global test teardown
afterAll(() => {
    // Cleanup any global test resources
});
