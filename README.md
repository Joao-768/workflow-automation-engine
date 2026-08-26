# Workflow Automation Engine

Plataforma de automação de workflows. O utilizador define regras no formato
**WHEN / IF / DO**, o sistema recebe eventos e executa automaticamente as ações
configuradas.

```
WHEN   Order Created
IF     Order Total > 100
DO     Send Notification
```

Quando chega um evento, o sistema procura os workflows ativos com aquele
trigger, avalia a condição de cada um e executa a ação. Cada execução fica
registada no histórico.

```
EVENT -> TRIGGER -> WORKFLOW -> ACTION -> EXECUTION
```

## Stack

- **Frontend:** React, TypeScript, Vite, React Router
- **Backend:** Node.js, TypeScript, Express
- **Base de dados:** PostgreSQL

## Como funciona

Um evento entra pelo `POST /events`:

```json
{
  "type": "order.created",
  "data": { "orderId": 123, "customer": "João", "total": 149.99 }
}
```

O engine faz três coisas por cada workflow que corresponda ao trigger:

1. **Avalia a condição** (`engine/conditions.ts`) — se não passar, a execução
   fica com estado `skipped` e a ação não corre.
2. **Executa a ação** (`engine/actions.ts`) — se rebentar, o estado é `failed`
   e o erro é guardado.
3. **Grava a execução** (`engine/runner.ts`) com o evento que a despoletou e o
   resultado.

Cada workflow é tratado de forma isolada: se um falhar, os restantes correm na
mesma.

Como não há integrações externas nesta versão, as ações são simuladas — cada
uma devolve um objeto a descrever o que teria feito.

### Estados de execução

| Estado | Significado |
|--------|-------------|
| `success` | A condição passou e a ação correu |
| `skipped` | A condição não passou, a ação não correu |
| `failed` | A ação foi executada mas rebentou |

## Triggers e ações

**Triggers:** `order.created`, `user.created`, `payment.completed`, `form.submitted`

**Ações:** `send_notification`, `send_email`, `create_record`

Cada ação tem a sua configuração própria, guardada em JSONB:

```json
send_notification  { "message": "..." }
send_email         { "to": "...", "subject": "..." }
create_record      { "table": "...", "fields": { ... } }
```

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/workflows` | Lista todos |
| POST | `/workflows` | Cria |
| GET | `/workflows/:id` | Vê um |
| PUT | `/workflows/:id` | Edita |
| DELETE | `/workflows/:id` | Apaga (e o histórico dele) |
| PATCH | `/workflows/:id/toggle` | Ativa/desativa |
| POST | `/events` | Recebe um evento e corre os workflows |
| GET | `/executions` | Histórico de execuções |

O `POST` e o `PUT` passam por um middleware de validação que rejeita campos em
falta ou triggers e ações fora da lista, devolvendo `400`.

## Base de dados

```sql
workflows
  id, name, description, created_at
  trigger_type      -- coluna: é por aqui que se procuram os workflows
  conditions        -- JSONB, opcional
  action_type       -- coluna: decide qual o handler
  action_config     -- JSONB, varia conforme a ação
  is_active

executions
  id, workflow_id, status, executed_at
  event_data        -- o evento que despoletou
  result            -- o que a ação devolveu, ou o erro
```

O que é pesquisado ou determina uma decisão é coluna; o que varia conforme o
tipo é JSONB. Apagar um workflow apaga as execuções dele (`ON DELETE CASCADE`).

## Estrutura

```
backend/src
  db/          ligação ao Postgres e schema
  engine/      lógica de domínio (não conhece Express)
  routes/      camada HTTP

frontend/src
  pages/       lista, formulário, simulador, histórico
  types.ts
```

O engine não importa nada do Express. Recebe dados, devolve resultados — pode
ser chamado a partir de outra origem sem alterações.

## Arrancar

Precisa de PostgreSQL a correr localmente.

```bash
createdb workflow_automation_engine
psql workflow_automation_engine -f backend/src/db/schema.sql
```

**Backend** (porta 3000)

```bash
cd backend
npm install
cp .env.example .env    # ajustar DATABASE_URL
npm run dev
```

**Frontend** (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

## Estado

V1 completo: CRUD de workflows, engine de execução, simulador de eventos e
histórico.

Previsto para V2: builder visual com nodes, drag & drop, IF/ELSE e múltiplas
ações por workflow.
