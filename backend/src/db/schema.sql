CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    conditions JSONB
);

CREATE TABLE executions (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_data JSONB,
    result JSONB
);
