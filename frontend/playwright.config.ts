import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end test against the real stack. It needs Postgres and Redis
 * running (docker compose up -d), a migrated database and a worker
 * (npm run worker). The API and the frontend are started here unless they
 * are already running.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:5174',
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: 'npm run dev -w backend',
            cwd: '..',
            url: 'http://localhost:3000/health',
            reuseExistingServer: true,
        },
        { command: 'npm run dev', url: 'http://localhost:5174', reuseExistingServer: true },
    ],
})
