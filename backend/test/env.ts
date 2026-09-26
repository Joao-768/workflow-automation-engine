/**
 * Test configuration, applied before any application module is imported
 * (dotenv never overrides variables that are already set).
 */
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? 'postgresql://localhost:5432/workflow_automation_engine_test'
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379'
process.env.QUEUE_PREFIX = 'wae-test'
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests'
process.env.RETRY_BACKOFF_MS = '50'
process.env.NODE_TIMEOUT_MS = '5000'
// The mock HTTP server in the tests listens on localhost.
process.env.HTTP_ALLOW_PRIVATE_NETWORKS = 'true'
process.env.SMTP_HOST = ''
process.env.DATABASE_SSL = 'false'
