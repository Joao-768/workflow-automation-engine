# Workflow Automation Engine

A small, event-driven workflow automation platform in the spirit of Zapier,
n8n or GitHub Actions. You draw a workflow as a graph in a visual builder;
events, webhooks, cron schedules and manual runs start it; a queue-backed
worker executes it one node at a time and stores a trace of every step.

```
WHEN   webhook received
IF     event.country equals "PT"
DO     HTTP request  ->  create record
ELSE   notification
```

It is a portfolio project. It does not try to compete with those products; it
exists to show the backend concepts underneath them, implemented end to end
and small enough to read in an afternoon.

## What it does

- **Visual builder** (React Flow): palette, canvas, inspector, live validation,
  save, run with a JSON payload, activate / deactivate.
- **Graph execution** on the backend: the graph you save is the graph the
  worker walks. Conditions take a real true / false branch.
- **Four triggers**: manual, named events, public webhooks (optional secret),
  cron schedules.
- **Seven node types**: trigger, condition, delay, HTTP request, notification,
  email, create record.
- **Queue + worker** (BullMQ on Redis): the API never runs workflow steps;
  a separate process does.
- **Retries with exponential backoff**, per-node timeouts and delays that
  resume through the queue instead of sleeping.
- **Execution history**: every attempt of every node with input, output,
  error, attempt number and duration. The execution page draws the exact
  version of the graph that ran, with each node marked.
- **Versioned workflows**: every saved graph is a snapshot; old executions
  keep pointing at the version they ran.
- **Accounts** with JWT auth and strict per-user isolation.
- **Dashboard**, **playground** (event simulator), **records** viewer and
  **settings**.

## Architecture

```
Trigger (manual run / event / webhook / cron tick)
   │
   ▼
API or scheduler ── startExecution() ──▶ PostgreSQL: executions row, status "queued"
   │
   ▼
BullMQ (Redis): job "run-node" { executionId, nodeId: trigger }
   │
   ▼
Worker process ──▶ Workflow engine: executeNodeJob()
   │                   1. claim the node (guards against duplicates)
   │                   2. load the workflow version + rebuild context
   │                   3. prepare input (templates) and run the node
   │                   4. store the step, pick the next node
   │                   5. enqueue it (delayed, for Delay nodes)
   ▼
PostgreSQL: execution_steps rows, execution status success / failed
```

Three processes, two data stores:

| Process | Runs | Talks to |
| --- | --- | --- |
| API (`backend/src/server.ts`) | Express: auth, CRUD, triggers | Postgres, Redis (enqueue only) |
| Worker (`backend/src/worker.ts`) | BullMQ worker + workflow engine | Postgres, Redis, the outside world |
| Frontend (`frontend/`) | React SPA | the API |

### One job per node

The central design decision: **a BullMQ job executes exactly one node of one
execution**, then enqueues the next node. An execution is a chain of jobs.

That single rule gives the rest almost for free:

- **Retries** are BullMQ `attempts` + exponential backoff on the node's job.
  Only the failing node is retried, never the steps before it.
- **Delays** are just the next node's job enqueued with `delay: ms`. Nothing
  sleeps, the worker keeps serving other executions, and the wait survives
  a worker restart because it lives in Redis.
- **Workers are stateless.** Each job rebuilds its context (event payload and
  outputs of earlier steps) from Postgres, so any worker can run any step.
- **Isolation.** One execution failing, even the engine throwing, only fails
  that execution's job.

### Execution lifecycle

```
queued ──▶ running ──▶ success
              │  ▲
              ▼  │
            waiting        (a Delay node is holding the execution)
              │
              ▼
            failed         (with the node id and the reason)
```

Step statuses: `running`, `success`, `retrying` (this attempt failed, another
is scheduled), `failed`, `waiting` (a delay in progress) and `skipped` (the
node sat on a branch that was not taken).

### Avoiding double execution

- Node jobs have a stable id, `exec-<executionId>-<nodeId>`, so the same node
  cannot be queued twice while a copy is pending or running.
- Before running, a job *claims* its node with a guarded `UPDATE`: the
  execution must still be in progress and its cursor must point at this
  node. A stale or duplicate job does nothing.
- The Create record node writes with a unique `(execution_id, node_id)`
  constraint, so a retried step cannot create the record twice.

## The workflow graph

A workflow's `definition` is JSONB with nodes and edges:

```json
{
    "nodes": [
        { "id": "trigger", "type": "trigger", "position": { "x": 0, "y": 0 },
          "config": { "type": "event", "eventName": "order.created" } },
        { "id": "is_large", "type": "condition", "position": { "x": 0, "y": 140 },
          "config": { "path": "event.total", "operator": "gt", "value": "100" } },
        { "id": "notify", "type": "notification", "position": { "x": 0, "y": 280 },
          "config": { "message": "Order {{event.orderId}}: {{event.total}}" } }
    ],
    "edges": [
        { "id": "e1", "source": "trigger", "target": "is_large" },
        { "id": "e2", "source": "is_large", "target": "notify", "sourceHandle": "true" }
    ]
}
```

The types and Zod schemas live once, in `shared/`, and are used by the API,
the worker and the builder. Validation (`shared/src/validation.ts`) enforces:

- exactly one trigger, and nothing connects into it
- every edge joins two existing nodes
- conditions leave through `true` / `false`; other nodes have one way out
- no cycles (this version has no loops)
- every node is reachable from the trigger
- every node's config is complete (a valid cron, a URL, a message...)
- `{{steps.<id>}}` references point at a node that runs *before* this one

A draft can be saved in any state as long as it is a well-formed graph. It
must pass validation to be activated or run, and an active workflow cannot be
saved into an invalid state.

Queryable facts stay in real columns: `trigger_type`, `trigger_event`,
`is_active`, `version`, `webhook_id`, timestamps.

## Triggers

| Trigger | Starts when | Payload (`event`) |
| --- | --- | --- |
| Manual | You press Run in the builder (works while inactive) | the JSON you enter |
| Event | `POST /events { type, data }` for your account, e.g. from the playground | `data` |
| Webhook | Anyone `POST`s JSON to `/webhooks/<id>` | the request body |
| Schedule | The cron expression fires (five fields, with timezone) | `{ scheduledAt }` |

Event names are free-form (`order.created`, `invoice.paid`...). The four V1
events are kept as presets with example payloads.

**Webhooks** get a random 32-character id, never derived from the numeric
workflow id. An optional secret is generated server-side, shown once, and
stored only as a SHA-256 hash; callers send it in `X-Webhook-Secret`. Unknown,
inactive and non-webhook ids all answer the same 404. The response is `202`
with the execution id.

**Schedules** are BullMQ job schedulers. They are synced whenever a workflow
is created, edited, activated, deactivated or deleted, and the worker
reconciles all of them against Postgres at startup and every five minutes.

## Nodes

| Node | Does | Output |
| --- | --- | --- |
| Condition | Compares a context value; picks the true or false branch | `{ result, left, operator, right }` |
| Delay | Resumes the next node after N seconds / minutes / hours (max 7 days) | `{ waitedMs, resumeAt }` |
| HTTP request | A real request: method, URL, query, headers, JSON or text body, timeout | `{ status, body, contentType, durationMs, truncated }` |
| Notification | An internal, simulated notification | `{ level, message, deliveredAt }` |
| Email | Sends over SMTP when configured; otherwise simulated and marked so | `{ delivery, simulated, messageId, to }` |
| Create record | Writes JSON into the `records` table (see the Records page) | `{ id, collection, data }` |

### Conditions

Operators: `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `contains`,
`not_contains`, `exists`, `not_exists`. No `eval`, no expression language:
chain several condition nodes for more complex logic.

The left side is a **path** (`event.total`, `event.customer.country`,
`steps.http_1.body.id`). The right side comes from a text field and is
coerced towards the left value's type: `"100"` becomes `100` when comparing
with a number, `"true"` becomes `true` for a boolean, `"null"` becomes `null`.
Ordering operators only compare numbers. A missing left value makes every
comparison false, which is what `exists` is for.

### HTTP request safety

- **SSRF guard**: the host is resolved and every address is checked against
  loopback, private, link-local, CGNAT and multicast ranges. The check runs in
  the socket's own DNS lookup, so the checked address is the one connected to.
  Set `HTTP_ALLOW_PRIVATE_NETWORKS=true` locally to call services on your
  machine.
- Timeout per node (max 30 s), response read limit (1 MB), stored body limit
  (16 kB). Redirects are not followed.
- Headers and query parameters that look like credentials (`Authorization`,
  `api_key`, `token`...) are sent but redacted in the stored trace.

## Templates

Any string in a node's config can contain `{{ path }}`:

```
{{event.email}}               the trigger payload
{{event.customer.name}}       nested fields
{{event.items.0.sku}}         array items by index
{{steps.http_1.body.id}}      output of an earlier node
{{trigger.receivedAt}}        {{execution.id}}
{{email}}                     V1 shorthand for {{event.email}}
```

Behaviour (`shared/src/template.ts`):

1. Objects and arrays are resolved recursively (JSON bodies, record data).
2. A string that is *only* a placeholder keeps the value's type:
   `"{{event.total}}"` becomes the number `149.99`.
3. Inside longer text, values are stringified; objects become JSON, `null`
   becomes an empty string.
4. **A missing variable fails the step** with `template_error` listing every
   missing path. It never becomes the text `undefined`. The step is not
   retried, since the same input would fail again.

## Retries and failures

| Situation | Code | Retried? |
| --- | --- | --- |
| Timeout, connection reset | `http_timeout`, `http_network` | yes |
| HTTP 5xx, 429 | `http_status` | yes |
| HTTP 4xx | `http_status` | no |
| Missing template variable | `template_error` | no |
| Private / invalid URL | `http_blocked`, `invalid_url` | no |
| Unknown exception in a node | `node_exception` | yes |
| Graph no longer valid | `invalid_workflow` | no |
| Redis down when starting | `queue_failure` (API answers 503) | no |

Attempts: HTTP and email 3 by default (configurable 1 to 5), records 2,
everything deterministic 1. Backoff doubles from `RETRY_BACKOFF_MS`
(2 s, 4 s, 8 s). Each attempt is its own step row, so the execution page shows
`retrying`, `retrying`, `failed` with the reason on each.

API errors always look like
`{ "error": { "code": "...", "message": "...", "details": ... } }`. Unexpected
errors are logged in full and answered with a generic 500.

## Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, React Flow (`@xyflow/react`), lucide icons |
| Backend | Node.js, TypeScript, Express 5, Zod, Pino, Helmet, express-rate-limit |
| Queue | BullMQ on Redis (ioredis) |
| Database | PostgreSQL with `pg` and plain SQL migrations |
| Auth | bcrypt, JWT (HS256, expiring) |
| Email | nodemailer (optional SMTP) |
| Tests | Vitest, Supertest, Playwright |
| Tooling | npm workspaces, oxlint, Prettier |

## Database

```
users              id, name, email, password_hash, created_at
workflows          id, user_id, name, description, definition (JSONB), version,
                   trigger_type, trigger_event, is_active, webhook_id,
                   webhook_secret_hash, created_at, updated_at, deleted_at
workflow_versions  (workflow_id, version) -> definition        immutable snapshots
executions         id, user_id, workflow_id, workflow_version, status,
                   trigger_type, trigger_data, current_node_id, error,
                   created_at, started_at, finished_at, duration_ms
execution_steps    id, execution_id, node_id, node_type, status, attempt,
                   max_attempts, input, output, error, started_at,
                   finished_at, duration_ms
records            id, user_id, workflow_id, execution_id, node_id,
                   collection, data (JSONB), created_at
```

- Deleting a workflow is a **soft delete** (`deleted_at`). Its executions and
  version snapshots stay, so history is never lost. Executions reference
  `(workflow_id, workflow_version)` with a foreign key and no cascade.
- Indexes cover the hot paths: a user's workflows, active event workflows by
  name, a user's executions by date and status, steps by execution.
- Every query serving a request filters on `user_id`. Guessing another
  account's ids returns 404.

### Migrations

Plain SQL files in `backend/migrations`, applied in order by
`backend/src/db/migrate.ts`, each in its own transaction, recorded in
`schema_migrations`, under an advisory lock.

- `001_v1_schema.sql` is the original V1 schema, idempotent. A database that
  was created by hand from V1's `schema.sql` is adopted as-is.
- `002_graph_workflows.sql` converts it to V2. Each V1 workflow (one trigger,
  optional condition, one action) becomes the graph
  `trigger -> [condition -true->] action`, with operators `>`, `<`, `==`
  mapped to `gt`, `lt`, `equals` and `{{field}}` templates left as they were
  (they still resolve). V1 executions are kept: `skipped` becomes `success`
  (the condition was false, the run did not fail) and each one gets trigger
  and action steps from its old result.

A V1 workflow whose action was never fully configured (for example an email
with no recipient) is converted faithfully and simply shows validation issues
in the builder until it is completed.

## Getting started

Requirements: Node.js 22+, npm, Docker (or local PostgreSQL 14+ and Redis 7+).

```bash
# 1. Install (npm workspaces: one install for everything; also builds shared/)
npm install

# 2. Configure
cp backend/.env.example backend/.env        # adjust DATABASE_URL, JWT_SECRET
cp frontend/.env.example frontend/.env      # optional, defaults to localhost:3000

# 3. Start Postgres and Redis
docker compose up -d
#    already running Postgres locally? then only:  docker compose up -d redis

# 4. Create the schema
npm run migrate

# 5. Optional: demo account with example workflows
npm run seed                                 # demo@example.com / demo12345

# 6. Run API + worker + frontend together
npm run dev
```

Or in separate terminals: `npm run dev:api`, `npm run worker`,
`npm run dev:web`.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 (`/health` checks Postgres and Redis) |

Port 5174 is pinned (`strictPort`) in `frontend/vite.config.ts`.

### Demo workflows (`npm run seed`)

| Workflow | Shows |
| --- | --- |
| Large order alert | Event `order.created`, condition `total > 100`, notification then record |
| Portuguese customer webhook | Webhook, condition `country equals PT`, real HTTP call (httpbin.org) then record; else notification |
| Delayed welcome | Event `user.created`, 30 second delay, email |
| Minute heartbeat | Schedule `* * * * *` writing a record each minute (inactive until you enable it) |
| Flaky endpoint | Manual; an HTTP call that always returns 500, to watch three attempts and the failure |

Try it: fire `order.created` from the Playground with the default payload,
then with `"total": 40`, and compare the two executions.

## Environment variables

Backend (`backend/.env`, validated at startup by `src/config/env.ts`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `DATABASE_SSL` | `false` | `true` for managed Postgres |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection |
| `QUEUE_PREFIX` | `wae` | Redis key prefix (tests use their own) |
| `JWT_SECRET` | required | 16+ chars, 32+ in production |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `FRONTEND_URL` | `http://localhost:5174` | CORS origins, comma-separated |
| `PORT` | `3000` | API port |
| `WORKER_CONCURRENCY` | `5` | jobs per worker process |
| `RUN_WORKER_IN_API` | `false` | also run the worker inside the API process |
| `RETRY_BACKOFF_MS` | `2000` | first retry delay, doubles each time |
| `NODE_TIMEOUT_MS` | `30000` | hard limit for any node |
| `HTTP_ALLOW_PRIVATE_NETWORKS` | `false` | allow HTTP nodes to reach localhost / private IPs |
| `HTTP_MAX_RESPONSE_BYTES` | `1000000` | response read limit |
| `SMTP_HOST` ... `SMTP_FROM` | empty | real email; empty means simulated |
| `LOG_LEVEL` | `info` | Pino level (pretty in development, JSON otherwise) |

Frontend (`frontend/.env`): `VITE_API_URL`, default `http://localhost:3000`.

## Tests

```bash
npm test              # shared + backend: unit and integration (needs Postgres + Redis)
npm run test:unit     # unit tests only, no services needed
npm run test:e2e      # Playwright happy path (needs the stack running, incl. a worker)
npm run typecheck
npm run lint          # oxlint + Prettier check
```

- **Unit** (`shared/src/*.test.ts`, `backend/src/**/*.test.ts`): template
  resolution, graph validation, traversal and branch selection, condition
  semantics, retry decisions, HTTP input resolution and redaction, the SSRF
  guard.
- **Integration** (`backend/test`): the real API, queue and an in-process
  worker against a throwaway database (`workflow_automation_engine_test`,
  recreated on every run) and a separate Redis prefix. External HTTP is a
  local mock server; email is captured in memory. Covers auth, isolation
  between two users, workflow management and versioning, schedules in Redis,
  and every execution scenario: true / false branches, webhooks and secrets,
  manual runs, schedule ticks, retries (500 then success, 500 until failure,
  4xx not retried, timeouts), missing variables, delays, disabled workflows,
  history filters and the dashboard.
- **E2E** (`frontend/e2e`): register, create a workflow in the builder, add a
  node, save, run, open the resulting execution.

## Deployment

The frontend is static; the backend needs **three** things: the API, a
**separate worker process**, and Redis. The worker cannot run inside Vercel
or inside the API's request handling.

| Piece | Where | Notes |
| --- | --- | --- |
| Frontend | Vercel, root directory `frontend` | `frontend/vercel.json` installs from the monorepo root. Set `VITE_API_URL` to the API URL. |
| API | Render web service | `render.yaml`. Runs migrations on start (advisory-locked), then `node dist/server.js`. |
| Worker | Render background worker | Same build, `node dist/worker.js`. Needs a paid instance on Render. |
| Redis | Render Key Value | `maxmemoryPolicy: noeviction`, required by BullMQ. |
| PostgreSQL | Render Postgres, Supabase, Neon... | Set `DATABASE_URL`, `DATABASE_SSL=true`. |

**Single-process mode.** Render has no free background worker, so the live
demo sets `RUN_WORKER_IN_API=true`: the API process also starts the BullMQ
worker. It is the same code (`src/queue/runtime.ts`) in one process instead of
two. For real load, run `npm run start:worker` as its own service and turn the
flag off. On the free plan the API sleeps when idle, so schedules only fire
while it is awake.

After the first Render sync: set `DATABASE_URL` on the
`workflow-engine-shared` env group and `FRONTEND_URL` (the Vercel URL) on the
API. `JWT_SECRET` is generated.

Differences between environments:

| | Development | Production |
| --- | --- | --- |
| Logs | pretty | JSON |
| Processes | `tsx watch` | compiled `dist/` |
| HTTP to private networks | can be enabled | blocked |
| Email | simulated unless SMTP is set | SMTP if configured |
| Rate limits | on | on (in-memory, per API instance) |

## API overview

All routes except register, login and webhooks need `Authorization: Bearer <token>`.

| Method | Route | |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | returns `{ token, user }` |
| GET / PATCH | `/auth/me` | current account / rename |
| POST | `/auth/me/password` | change password |
| GET / POST | `/workflows` | list / create |
| GET / PUT / DELETE | `/workflows/:id` | read / update / soft delete |
| POST | `/workflows/:id/activate`, `/deactivate` | 422 with issues if invalid |
| POST | `/workflows/:id/duplicate` | inactive copy |
| POST | `/workflows/:id/run` | manual run, `{ payload }`, answers 202 |
| POST / DELETE | `/workflows/:id/webhook-secret` | create (shown once) / remove |
| POST | `/events` | `{ type, data }`, answers 202 with matched executions |
| POST | `/webhooks/:webhookId` | public, answers 202 `{ status, executionId }` |
| GET | `/executions` | `page, pageSize, workflowId, status, triggerType, from, to` |
| GET | `/executions/:id` | detail with steps and the graph version |
| GET | `/records`, `/records/collections` | data written by Create record |
| GET | `/dashboard` | health numbers, 14-day series, recent executions |
| GET | `/health` | Postgres and Redis status |

## Project layout

```
shared/src              used by API, worker and builder
  constants.ts          node types, operators, statuses (no magic strings)
  definition.ts         Zod schemas for the graph and every node config
  validation.ts         graph rules
  graph.ts              traversal helpers: next node, reachability, cycles
  template.ts           {{ }} resolver
  paths.ts              safe path lookup, execution context type
  api.ts                response types shared with the frontend

backend/
  migrations/           001 (V1 schema), 002 (V2 conversion)
  src/server.ts         API entry point
  src/worker.ts         worker entry point
  src/engine/           executor, node handlers, conditions, retry policy
  src/queue/            BullMQ queue, job types, worker processor
  src/services/         use cases: start executions, workflows, triggers, schedules
  src/repositories/     SQL, one module per table group
  src/http/             Express app, routes, request schemas, errors, rate limits
  src/adapters/         HTTP client (SSRF guard), email (SMTP or simulated)
  src/auth/             bcrypt, JWT, authenticated request type
  test/                 integration tests

frontend/src/
  features/builder/     canvas, palette, inspector, node forms, state hook
  features/executions/  history, detail page, execution graph
  pages/                dashboard, workflows, playground, records, settings, auth
  api/                  typed API client
```

## Reading the engine

If you want to understand how a workflow runs, read in this order:

1. `shared/src/definition.ts` and `shared/src/validation.ts`: what a workflow is.
2. `backend/src/services/executions.ts`: how every trigger starts an execution.
3. `backend/src/engine/executor.ts`: one node per job, the whole lifecycle.
4. `backend/src/engine/nodes/`: the handler contract and each node type.
5. `backend/src/queue/queue.ts` and `queue/worker.ts`: how jobs, retries,
   delays and schedules map onto BullMQ.
6. `shared/src/template.ts` and `backend/src/engine/conditions.ts`: data flow
   between nodes.
7. `backend/test/engine.test.ts`: every scenario, end to end.

## Known limits

- No loops, parallel branches or joins that wait for several branches: one
  path runs at a time, by design.
- No cancellation of running executions.
- Rate limits are in memory, so they apply per API instance.
- Enqueuing the next node happens right after the database commit; if Redis
  fails in that instant the execution is marked `queue_failure` rather than
  retried later (a transactional outbox would close that gap).
- If you wipe the database, clear Redis too (`docker compose down -v`).
  Failed jobs are kept in Redis for a day under ids like `exec-12-http_1`; a
  fresh database reusing execution ids would collide with them.
