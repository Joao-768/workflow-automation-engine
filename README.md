# Workflow Automation Engine

Workflow automation platform. Users define rules in a **WHEN / IF / DO**
format; the system receives events and automatically runs the configured
actions.

```
WHEN   User created
IF     (always)
DO     Send email to {{email}}
```

When an event arrives, the system looks up the active workflows for that
trigger, evaluates each one's condition and runs its action. Every run is
recorded in the history.

```
EVENT -> TRIGGER -> WORKFLOW -> ACTION -> EXECUTION
```

## Stack

- **Frontend:** React, TypeScript, Vite, React Router
- **Backend:** Node.js, TypeScript, Express
- **Database:** PostgreSQL
- **Auth:** JWT, passwords hashed with bcrypt

## How it works

An event comes in through `POST /events`:

```json
{
  "type": "user.created",
  "data": { "userId": 45, "email": "ana@mail.com", "name": "Ana" }
}
```

For each workflow matching the trigger, the engine does three things:

1. **Evaluates the condition** (`engine/conditions.ts`) — if it doesn't pass,
   the execution is recorded as `skipped` and the action never runs.
2. **Runs the action** (`engine/actions.ts`) — if it throws, the status is
   `failed` and the error is stored.
3. **Records the execution** (`engine/runner.ts`) along with the triggering
   event and the result.

Each workflow is handled in isolation: if one fails, the rest still run.

There are no external integrations in this version, so actions are simulated —
each one returns an object describing what it would have done.

### Event data in actions

Action fields accept `{{field}}`, replaced by the value carried in the event.
This is what lets a single workflow serve each user with their own data instead
of a hardcoded recipient:

```
to:       {{email}}                  ->  ana@mail.com
subject:  Welcome, {{name}}!         ->  Welcome, Ana!
```

A field the event doesn't carry is left as-is (`{{phone}}`) rather than turning
into `undefined`, so the history shows what was missing.

### Execution statuses

| Status | Meaning |
|--------|---------|
| `success` | The condition passed and the action ran |
| `skipped` | The condition didn't pass, the action never ran |
| `failed` | The action ran but threw |

## Triggers and actions

| Trigger | Event fields |
|---------|--------------|
| `order.created` | `total`, `orderId`, `customer`, `email` |
| `user.created` | `userId`, `email`, `name` |
| `payment.completed` | `amount`, `paymentId` |
| `form.submitted` | `formId`, `field` |

**Actions** and the config each one stores as JSONB:

```json
send_notification  { "message": "..." }
send_email         { "to": "...", "subject": "..." }
create_record      { "table": "...", "fields": "..." }
```

**Conditions** compare an event field against a value using one of the three
operators the engine knows: `>`, `<`, `==`. A workflow with no condition always
runs.

```json
{ "field": "total", "operator": ">", "value": 100 }
```

The form builds this from dropdowns — the field comes from the selected trigger
and the operator from the list above, so it's not possible to save a condition
that would only blow up at runtime.

## API

Apart from register and login, every route requires
`Authorization: Bearer <token>`. Each user only ever sees their own workflows
and executions.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Create an account, returns a token |
| POST | `/auth/login` | Authenticate, returns a token |
| GET | `/workflows` | List the user's workflows |
| POST | `/workflows` | Create |
| GET | `/workflows/:id` | Read one |
| PUT | `/workflows/:id` | Update |
| DELETE | `/workflows/:id` | Delete (along with its history) |
| PATCH | `/workflows/:id/toggle` | Enable/disable |
| POST | `/events` | Receive an event and run the workflows |
| GET | `/executions` | Execution history |
| GET | `/executions/:id` | Single execution detail |
| GET | `/health` | Database connection status |

`POST` and `PUT` go through validation middleware that rejects missing fields
or triggers and actions outside the allowed list, returning `400`.

## Database

```sql
users
  id, name, email, password_hash, created_at

workflows
  id, name, description, user_id, created_at
  trigger_type      -- column: this is what workflows are looked up by
  conditions        -- JSONB, optional
  action_type       -- column: decides which handler runs
  action_config     -- JSONB, shape varies per action
  is_active

executions
  id, workflow_id, status, executed_at
  event_data        -- the event that triggered it
  result            -- what the action returned, or the error
```

Anything queried or driving a decision is a column; anything whose shape varies
by type is JSONB. Deleting a user deletes their workflows, and deleting a
workflow deletes its executions (`ON DELETE CASCADE`).

## Layout

```
backend/src
  db/          Postgres connection and schema
  engine/      domain logic (knows nothing about Express)
  middleware/  JWT verification
  routes/      HTTP layer

frontend/src
  pages/       landing, auth, dashboard, workflows, simulator, history
  schema.ts    triggers, fields and actions the form offers
  types.ts
```

The engine imports nothing from Express. It takes data and returns results, so
it can be driven from somewhere else unchanged.

## Running it

Requires PostgreSQL running locally.

```bash
createdb workflow_automation_engine
psql workflow_automation_engine -f backend/src/db/schema.sql
```

**Backend** (port 3000)

```bash
cd backend
npm install
cp .env.example .env    # set DATABASE_URL and JWT_SECRET
npm run dev
```

**Frontend** (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Create an account at `/register`, define a workflow, then fire an event from
the simulator to watch it run.

## Status

V1 complete: authentication with per-user data isolation, workflow CRUD,
execution engine, event simulator and history.

Planned for V2: visual node builder with drag & drop, IF/ELSE branching and
multiple actions per workflow.
