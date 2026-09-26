import { defineConfig } from 'vitest/config'

/**
 * Unit tests live next to the code (src/**\/*.test.ts) and need nothing.
 * Integration tests (test/**) need Postgres and Redis: the global setup
 * recreates a dedicated test database and an isolated queue prefix.
 */
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
        setupFiles: ['test/env.ts'],
        globalSetup: ['test/globalSetup.ts'],
        // Integration suites share one database and one queue.
        fileParallelism: false,
        testTimeout: 20_000,
        hookTimeout: 30_000,
    },
})
