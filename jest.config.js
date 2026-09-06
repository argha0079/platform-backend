export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
    coverageThreshold: {
        global: { lines: 70 },
    },
};