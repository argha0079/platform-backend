export default {
    testEnvironment: 'node',
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
    coverageThreshold: {
        global: { lines: 70 },
    },
};